import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { createLogger } from "@mastra/core/logger";
import { writeKnowledgeFileTool, FileWriteMode, FileEncoding } from "./readwrite";
import { createAISpan, recordMetrics } from "../services/signoz";
import { Span } from "@opentelemetry/api";
import type { ToolExecutionContext } from "@mastra/core/tools";
import {
    scrapeElements,
    scrapeTable,
    scrapeAttributes,
    scrapeInnerHtml,
    scrapeJsonLd,
    scrapeMetaTags,
  } from "./puppeteerScrape";
import { error } from "console";

const logger = createLogger({ name: "puppeteer", level: "debug" });

logger.info("Initializing Puppeteer tool for web navigation and screenshotting.");

const SCREENSHOT_DIR = path.resolve(process.cwd(), "puppeteer_screenshots");

function generateScreenshotFilename(url: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const urlHash = crypto.createHash("md5").update(url).digest("hex").substring(0, 8);
  return `screenshot_${urlHash}_${timestamp}.png`;
}

// --- Action Schemas ---
const ClickActionSchema = z.object({
  type: z.literal("click"),
  selector: z.string().describe("CSS selector for the element to click."),
  waitForNavigation: z.boolean().optional().default(false).describe("Wait for navigation to complete after the click."),
});

const TypeActionSchema = z.object({
  type: z.literal("type"),
  selector: z.string().describe("CSS selector for the input field."),
  text: z.string().describe("Text to type into the field."),
  delay: z.number().optional().default(50).describe("Delay between keystrokes in milliseconds."),
});

const ScrapeActionSchema = z.object({
  type: z.literal("scrape"),
  selector: z.string().describe("CSS selector for the element(s) to scrape."),
  attribute: z.string().optional().describe("Optional attribute to extract (e.g., 'href', 'src'). If omitted, extracts text content."),
  multiple: z.boolean().optional().default(false).describe("Whether to scrape multiple matching elements."),
});

const ScrapeTableActionSchema = z.object({
  type: z.literal("scrapeTable"),
  selector: z.string().describe("CSS selector for the table to scrape."),
});
const ScrapeAttributesActionSchema = z.object({
  type: z.literal("scrapeAttributes"),
  selector: z.string(),
  attribute: z.string(),
});
const ScrapeInnerHtmlActionSchema = z.object({
  type: z.literal("scrapeInnerHtml"),
  selector: z.string(),
});
const ScrapeJsonLdActionSchema = z.object({
  type: z.literal("scrapeJsonLd"),
});
const ScrapeMetaTagsActionSchema = z.object({
  type: z.literal("scrapeMetaTags"),
});

const WaitForSelectorActionSchema = z.object({
  type: z.literal("waitForSelector"),
  selector: z.string().describe("CSS selector to wait for."),
  timeout: z.number().optional().default(30000).describe("Maximum time to wait in milliseconds."),
});

const ScrollActionSchema = z.object({
  type: z.literal("scroll"),
  direction: z.enum(["down", "up", "bottom", "top"]).describe("Direction to scroll."),
  amount: z.number().optional().describe("Pixel amount to scroll (for 'down'/'up'). Defaults to window height/width."),
  selector: z.string().optional().describe("Optional selector to scroll within or to."),
});

const HoverActionSchema = z.object({
  type: z.literal("hover"),
  selector: z.string().describe("CSS selector for the element to hover over."),
});

const SelectActionSchema = z.object({
  type: z.literal("select"),
  selector: z.string().describe("CSS selector for the <select> element."),
  value: z.string().describe("The value of the <option> to select."),
});

const WaitActionSchema = z.object({
  type: z.literal("wait"),
  duration: z.number().int().min(1).describe("Duration to wait in milliseconds."),
});

const EvaluateActionSchema = z.object({
  type: z.literal("evaluate"),
  script: z.string().describe("JavaScript code to execute in the page context. Use 'return' to output data."),
});

const ActionSchema = z.discriminatedUnion("type", [
  ClickActionSchema,
  TypeActionSchema,
  ScrapeActionSchema,
  WaitForSelectorActionSchema,
  ScrollActionSchema,
  HoverActionSchema,
  SelectActionSchema,
  WaitActionSchema,
  EvaluateActionSchema,
  ScrapeTableActionSchema,
  ScrapeAttributesActionSchema,
  ScrapeInnerHtmlActionSchema,
  ScrapeJsonLdActionSchema,
  ScrapeMetaTagsActionSchema,
]);

const PuppeteerOutputSchema = z.object({
  url: z.string().url().describe("The final URL after navigation and actions."),
  pageTitle: z.string().optional().describe("The title of the web page after actions."),
  scrapedData: z.array(z.any()).optional().describe("Data scraped or returned by evaluate actions."),
  screenshotPath: z.string().optional().describe("Absolute path to the saved screenshot file, if taken."),
  knowledgeSavePath: z.string().optional().describe("Full path where scraped data was saved in the knowledge base, if requested."),
  saveSuccess: z.boolean().optional().describe("Indicates if saving scraped data to knowledge base was successful."),
  saveError: z.string().optional().describe("Error message if saving scraped data to knowledge base failed."),
  success: z.boolean().describe("Whether the overall operation was successful."),
  error: z.string().optional().describe("Error message if the operation failed."),
});

const PuppeteerInputSchema = z.object({
  url: z.string().url().describe("The initial URL of the web page to navigate to."),
  screenshot: z.boolean().optional().default(false).describe("Whether to take a full-page screenshot at the end."),
  initialWaitForSelector: z.string().optional().describe("A CSS selector to wait for after initial navigation."),
  actions: z.array(ActionSchema).optional().describe("A sequence of actions to perform on the page."),
  saveKnowledgeFilename: z.string().optional().describe("Optional filename (e.g., 'scraped_results.json') to save scraped data within the knowledge base."),
  saveFormat: z.enum(["json", "csv"]).optional().default("json").describe("Format to save the scraped data (default: json)."),
  saveMode: z.nativeEnum(FileWriteMode).optional().default(FileWriteMode.OVERWRITE).describe("Write mode for saving data (overwrite, append, create-new)."),
  saveEncoding: z.nativeEnum(FileEncoding).optional().default(FileEncoding.UTF8).describe("Encoding for saving data."),
});

export const puppeteerTool = createTool<typeof PuppeteerInputSchema, typeof PuppeteerOutputSchema>({
  id: "puppeteer_web_automator",
  description:
    "Navigates to a web page using Puppeteer, performs a sequence of actions (click, type, scrape, wait), optionally takes a screenshot, and returns page information and scraped data.",
  inputSchema: PuppeteerInputSchema,
  outputSchema: PuppeteerOutputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof PuppeteerInputSchema>
  ): Promise<z.infer<typeof PuppeteerOutputSchema>> => {
    const { context: input, container } = executionContext;
    // Environment check: block in browser/edge
    if (typeof window !== "undefined" || typeof process === "undefined" || !process.versions?.node) {
      return {
        url: input.url,
        success: false,
        error: "Puppeteer tool cannot run in a browser or edge environment. Please use this tool only in a Node.js server environment.",
      };
    }
    const TOOL_TIMEOUT_MS = 60000; // 60 seconds
    let timeoutHandle: NodeJS.Timeout | undefined;
    let browser: Browser | null = null;
    const output: z.infer<typeof PuppeteerOutputSchema> = {
      url: input.url,
      success: false,
      scrapedData: [],
    };
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Puppeteer tool timed out')), TOOL_TIMEOUT_MS);
    });
    const mainLogic = async () => {
      const span: Span = createAISpan("puppeteer_tool_execution", {
        "tool.id": "puppeteer_web_automator",
        "input.url": input.url,
        "input.actions_count": input.actions?.length ?? 0,
        "input.screenshot_requested": input.screenshot ?? false,
        "input.save_requested": !!input.saveKnowledgeFilename,
      });
      const startTime = Date.now();
      try {
        logger.info(`Starting Puppeteer automation for URL: ${input.url}`);
        span.addEvent("Automation started", { url: input.url });
        if (input.screenshot) {
          await fs.ensureDir(SCREENSHOT_DIR);
          logger.debug(`Ensured screenshot directory exists: ${SCREENSHOT_DIR}`);
        }
        browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        logger.debug("Puppeteer browser launched.");
        const page: Page = await browser.newPage();
        logger.debug("New page created.");
        await page.setViewport({ width: 1280, height: 800 });
        logger.debug("Viewport set.");
        logger.info(`Navigating to ${input.url}...`);
        await page.goto(input.url, { waitUntil: "networkidle2", timeout: 60000 });
        output.url = page.url();
        span.setAttribute("navigation.final_url", output.url);
        logger.info(`Navigation complete. Current URL: ${output.url}`);
        if (input.initialWaitForSelector) {
          logger.info(`Waiting for initial selector: ${input.initialWaitForSelector}`);
          await page.waitForSelector(input.initialWaitForSelector, { timeout: 30000 });
          logger.debug(`Initial selector found: ${input.initialWaitForSelector}`);
        }
        // --- Execute Actions ---
        if (input.actions && input.actions.length > 0) {
          logger.info(`Executing ${input.actions.length} actions...`);
          span.addEvent("Executing actions", { count: input.actions.length });
          for (const [index, action] of input.actions.entries()) {
            logger.debug(`Executing action ${index + 1}: ${action.type}`);
            try {
              switch (action.type) {
                case "click":
                  logger.info(`Clicking element: ${action.selector}`);
                  const clickPromise = page.click(action.selector);
                  if (action.waitForNavigation) {
                    logger.debug("Waiting for navigation after click...");
                    await Promise.all([
                      clickPromise,
                      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
                    ]);
                    output.url = page.url();
                    logger.info(`Navigation after click complete. New URL: ${output.url}`);
                  } else {
                    await clickPromise;
                  }
                  logger.debug(`Clicked element: ${action.selector}`);
                  break;

                case "type":
                  logger.info(`Typing into element: ${action.selector}`);
                  await page.type(action.selector, action.text, { delay: action.delay });
                  logger.debug(`Typed text into: ${action.selector}`);
                  break;

                case "scrape":
                  logger.info(
                    `Scraping element(s): ${action.selector}` +
                      (action.attribute ? ` [Attribute: ${action.attribute}]` : " [Text Content]")
                  );
                  try {
                    const scraped = await scrapeElements(
                      page,
                      action.selector,
                      action.attribute,
                      action.multiple
                    );
                    if (scraped === null) {
                      logger.warn(`No elements found for selector: ${action.selector}`);
                    }
                    const scrapedArray =
                      scraped == null
                        ? []
                        : Array.isArray(scraped)
                        ? scraped
                        : [scraped];
                    output.scrapedData = [...(output.scrapedData ?? []), ...scrapedArray];
                    logger.debug(
                      `Scraped ${scrapedArray.length} items. Total scraped: ${output.scrapedData?.length}`
                    );
                  } catch (err) {
                    logger.error(
                      `Scrape failed for selector ${action.selector}: ${
                        err instanceof Error ? err.message : String(err)
                      }`
                    );
                  }
                  break;
              
                  case "scrapeTable":
                      logger.info(`Scraping table for selector: ${action.selector}`);
                      try {
                        const tableRows = await scrapeTable(page, action.selector);
                        if (!tableRows) {
                          logger.warn(`No table found for selector: ${action.selector}`);
                        }
                        const tableArray = tableRows ?? [];
                        output.scrapedData = [...(output.scrapedData ?? []), ...tableArray];
                        logger.debug(`Scraped ${tableArray.length} table rows. Total scraped: ${output.scrapedData?.length}`);
                      } catch (err) {
                        logger.error(
                          `Table scrape failed for selector ${action.selector}: ${
                            err instanceof Error ? err.message : String(err)
                          }`
                        );
                      }
                      break;
                    
                  case "scrapeAttributes":
                    logger.info(`Scraping attributes "${action.attribute}" for selector: ${action.selector}`);
                    try {
                      const attrs = await scrapeAttributes(page, action.selector, action.attribute);
                      output.scrapedData = [...(output.scrapedData ?? []), ...attrs];
                      logger.debug(`Scraped ${attrs.length} attributes. Total scraped: ${output.scrapedData?.length}`);
                    } catch (err) {
                      logger.error(
                        `Attribute scrape failed for selector ${action.selector}: ${
                          err instanceof Error ? err.message : String(err)
                        }`
                      );
                    }
                    break;
                  
                  case "scrapeInnerHtml":
                    logger.info(`Scraping inner HTML for selector: ${action.selector}`);
                    try {
                      const html = await scrapeInnerHtml(page, action.selector);
                      if (html !== null) {
                        output.scrapedData = [...(output.scrapedData ?? []), html];
                        logger.debug(`Scraped inner HTML for selector: ${action.selector}`);
                      } else {
                        logger.warn(`No element found for selector: ${action.selector}`);
                      }
                    } catch (err) {
                      logger.error(
                        `Inner HTML scrape failed for selector ${action.selector}: ${
                          err instanceof Error ? err.message : String(err)
                        }`
                      );
                    }
                    break;
                  
                  case "scrapeJsonLd":
                    logger.info(`Scraping JSON-LD structured data from page`);
                    try {
                      const jsonLd = await scrapeJsonLd(page);
                      output.scrapedData = [...(output.scrapedData ?? []), ...jsonLd];
                      logger.debug(`Scraped ${jsonLd.length} JSON-LD blocks. Total scraped: ${output.scrapedData?.length}`);
                    } catch (err) {
                      logger.error(
                        `JSON-LD scrape failed: ${err instanceof Error ? err.message : String(err)}`
                      );
                    }
                    break;
                  
                  case "scrapeMetaTags":
                    logger.info(`Scraping meta tags from page`);
                    try {
                      const metaTags = await scrapeMetaTags(page);
                      output.scrapedData = [...(output.scrapedData ?? []), metaTags];
                      logger.debug(`Scraped meta tags. Total scraped: ${output.scrapedData?.length}`);
                    } catch (err) {
                      logger.error(
                        `Meta tag scrape failed: ${err instanceof Error ? err.message : String(err)}`
                      );
                    }
                    break;

                case "waitForSelector":
                  logger.info(`Waiting for selector: ${action.selector} (Timeout: ${action.timeout}ms)`);
                  await page.waitForSelector(action.selector, { timeout: action.timeout });
                  logger.debug(`Selector found: ${action.selector}`);
                  break;

                case "scroll":
                  logger.info(
                    `Scrolling ${action.direction}` +
                      (action.selector ? ` within/to ${action.selector}` : " window")
                  );
                  await page.evaluate(async (options) => {
                    const element = options.selector ? document.querySelector(options.selector) : window;
                    if (!element) throw new Error(`Scroll target not found: ${options.selector}`);

                    const scrollAmount =
                      options.amount ??
                      (options.direction === "down" || options.direction === "up"
                        ? window.innerHeight
                        : window.innerWidth);
                    const target =
                      options.selector && element !== window
                        ? element
                        : document.scrollingElement || document.documentElement;

                    switch (options.direction) {
                      case "down":
                        (target as Element).scrollTop += scrollAmount;
                        break;
                      case "up":
                        (target as Element).scrollTop -= scrollAmount;
                        break;
                      case "bottom":
                        if (options.selector && element instanceof Element) {
                          element.scrollTop = element.scrollHeight;
                        } else {
                          (target as Element).scrollTop = (target as Element).scrollHeight;
                        }
                        break;
                      case "top":
                        if (options.selector && element instanceof Element) {
                          element.scrollTop = 0;
                        } else {
                          (target as Element).scrollTop = 0;
                        }
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  }, action);
                  logger.debug(`Scrolled ${action.direction}.`);
                  break;

                case "hover":
                  logger.info(`Hovering over element: ${action.selector}`);
                  await page.hover(action.selector);
                  logger.debug(`Hovered over: ${action.selector}`);
                  break;

                case "select":
                  logger.info(`Selecting option [value=${action.value}] in dropdown: ${action.selector}`);
                  await page.select(action.selector, action.value);
                  logger.debug(`Selected option in: ${action.selector}`);
                  break;

                case "wait":
                  logger.info(`Waiting for ${action.duration}ms`);
                  await new Promise((resolve) => setTimeout(resolve, action.duration));
                  logger.debug("Wait complete.");
                  break;

                case "evaluate":
                  logger.info(`Evaluating script...`);
                  const result = await page.evaluate(action.script);
                  if (result !== undefined) {
                    output.scrapedData = [...(output.scrapedData ?? []), result];
                    logger.debug(
                      `Script evaluated. Result added to scrapedData. Total scraped: ${output.scrapedData?.length}`
                    );
                  } else {
                    logger.debug(`Script evaluated. No return value.`);
                  }
                  break;
              }
            } catch (actionError) {
              logger.error(
                `Error executing action ${action.type}: ${
                  actionError instanceof Error ? actionError.message : String(actionError)
                }`
              );
            }
          }
        }
        // Save screenshot if requested
        if (input.screenshot) {
          const screenshotFilename = generateScreenshotFilename(output.url);
          const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          output.screenshotPath = screenshotPath;
          logger.info(`Screenshot saved: ${screenshotPath}`);
        }
        // Save scraped data to knowledge base if requested
        if (input.saveKnowledgeFilename && output.scrapedData && output.scrapedData.length > 0) {
          try {
            let contentToSave: string;
            if (input.saveFormat === "json") {
              contentToSave = JSON.stringify(output.scrapedData, null, 2);
            } else if (input.saveFormat === "csv") {
              if (
                Array.isArray(output.scrapedData) &&
                output.scrapedData.length > 0 &&
                typeof output.scrapedData[0] === "object"
              ) {
                const headers = Object.keys(output.scrapedData[0] as object).join(",");
                const rows = output.scrapedData.map((item) =>
                  Object.values(item as object)
                    .map((val) => JSON.stringify(val))
                    .join(",")
                );
                contentToSave = `${headers}\n${rows.join("\n")}`;
              } else {
                throw new Error("CSV format requires scraped data to be an array of objects.");
              }
            } else {
              throw new Error(`Unsupported save format: ${input.saveFormat}`);
            }
            if (!writeKnowledgeFileTool?.execute) {
              throw new Error("writeKnowledgeFileTool.execute is not defined or tool not imported correctly.");
            }
            const writeResult = await writeKnowledgeFileTool.execute({
              context: {
                path: input.saveKnowledgeFilename,
                content: contentToSave,
                mode: input.saveMode,
                encoding: input.saveEncoding,
                createDirectory: true,
                maxSizeBytes: 10485760, // 10 MB default, adjust as needed
              },
              container: container,
            });
            if (writeResult.success) {
              span.setAttribute("output.save_path", writeResult.metadata.path);
              span.addEvent("Save successful");
              output.knowledgeSavePath = writeResult.metadata.path;
              output.saveSuccess = true;
              logger.info(`Successfully saved scraped data to knowledge base: ${output.knowledgeSavePath}`);
            } else {
              span.addEvent("Save failed", { error: output.saveError });
              output.saveSuccess = false;
              output.saveError = writeResult.error || "Unknown error saving to knowledge base.";
              logger.error(`Failed to save scraped data to knowledge base: ${output.saveError}`);
            }
          } catch (saveError: any) {
            output.saveSuccess = false;
            output.saveError = saveError instanceof Error ? saveError.message : String(saveError);
            logger.error(`Error preparing or saving scraped data to knowledge base: ${output.saveError}`);
          }
        } else if (input.saveKnowledgeFilename) {
          logger.warn(
            `Knowledge base filename provided (${input.saveKnowledgeFilename}), but no scraped data to save.`
          );
        }
        output.success = true;
        logger.info("Puppeteer automation completed successfully.");
        span.setAttribute("output.scraped_count", output.scrapedData?.length ?? 0);
        recordMetrics(span, {
          status: "success",
          latencyMs: Date.now() - startTime,
        });
      } catch (error: any) {
        logger.error(`Puppeteer tool error: ${error.message}`, error);
        output.error = error instanceof Error ? error.message : String(error);
        output.success = false;
        recordMetrics(span, {
          status: "error",
          errorMessage: output.error,
          latencyMs: Date.now() - startTime,
        });
        span.recordException(error);
      } finally {
        if (browser) {
          await browser.close();
          logger.info("Browser closed.");
          span.addEvent("Browser closed");
        }
        span.end();
      }
      return output;
    };
    try {
      const result = await Promise.race([
        mainLogic(),
        timeoutPromise
      ]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      return result as z.infer<typeof PuppeteerOutputSchema>;
    } catch (error) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      // Browser cleanup is handled in the finally block, so no need to close it here.
      return {
        url: input.url,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});