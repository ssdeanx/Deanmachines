import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';
import { generateId } from 'ai';
import * as cheerio from 'cheerio';
import { CheerioCrawler, PlaywrightCrawler, Dataset } from 'crawlee';
import * as fs from 'fs';
import * as path from 'path';

const logger = new PinoLogger({ name: 'WebBrowserTools', level: 'info' });

/**
 * Runtime context type for web browser tools
 */
export type WebBrowserRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'user-agent'?: string;
  'request-timeout'?: number;
  'debug'?: boolean;
  'output-dir'?: string;
};

// ===== TOOL 1: WEB SCRAPER =====

const scraperInputSchema = z.object({
  url: z.string().url().describe('URL to scrape'),
  extractLinks: z.boolean().optional().default(false).describe('Extract all links'),
  extractImages: z.boolean().optional().default(false).describe('Extract all images'),
  saveToFile: z.boolean().optional().default(true).describe('Save results to file'),
}).strict();

export const webScraperTool = createTool({
  id: 'web-scraper',
  description: 'Simple web scraper using cheerio',
  inputSchema: scraperInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string(),
    title: z.string().optional(),
    text: z.string().optional(),
    links: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    savedFile: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof scraperInputSchema> & {
    input: z.infer<typeof scraperInputSchema>;
    runtimeContext?: RuntimeContext<WebBrowserRuntimeContext>;
  }) => {
    const requestId = generateId();
    const outputDir = (runtimeContext?.get('output-dir') as string) || './mastra/scraped-data';
    const userAgent = (runtimeContext?.get('user-agent') as string) || 'Mozilla/5.0 (compatible; Mastra/1.0)';
    const debug = Boolean(runtimeContext?.get('debug') || false);

    if (debug) {
      logger.info(`[${requestId}] Starting web scraping`, { url: input.url });
    }

    try {
      const response = await fetch(input.url, {
        headers: { 'User-Agent': userAgent }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('title').text().trim();
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      
      const links: string[] = [];
      const images: string[] = [];
      
      if (input.extractLinks) {
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              links.push(new URL(href, input.url).href);
            } catch {}
          }
        });
      }
      
      if (input.extractImages) {
        $('img[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            try {
              images.push(new URL(src, input.url).href);
            } catch {}
          }
        });
      }
      
      let savedFile: string | undefined;
      if (input.saveToFile) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const urlObj = new URL(input.url);
        const filename = `${urlObj.hostname}_${requestId}.json`;
        const filepath = path.join(outputDir, filename);
        
        const data = {
          url: input.url,
          title,
          text,
          links,
          images,
          scrapedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        savedFile = filepath;
      }

      if (debug) {
        logger.info(`[${requestId}] Web scraping completed`, {
          url: input.url,
          title,
          textLength: text.length,
          linksFound: links.length,
          imagesFound: images.length,
          savedFile
        });
      }

      return {
        success: true,
        url: input.url,
        title,
        text,
        links: links.length > 0 ? links : undefined,
        images: images.length > 0 ? images : undefined,
        savedFile
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (debug) {
        logger.error(`[${requestId}] Web scraping failed`, { url: input.url, error: errorMessage });
      }

      return {
        success: false,
        url: input.url,
        error: errorMessage
      };
    }
  }
});

// ===== TOOL 2: WEB EXTRACTOR =====

const extractorInputSchema = z.object({
  url: z.string().url().describe('URL to extract from'),
  selector: z.string().describe('CSS selector to extract'),
  attribute: z.string().optional().describe('Attribute to extract (default: text)'),
  saveToFile: z.boolean().optional().default(true).describe('Save results to file'),
}).strict();

export const webExtractorTool = createTool({
  id: 'web-extractor',
  description: 'Extract specific elements using CSS selectors',
  inputSchema: extractorInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string(),
    selector: z.string(),
    elements: z.array(z.object({
      text: z.string(),
      html: z.string().optional(),
      attributes: z.record(z.string()).optional(),
    })).optional(),
    savedFile: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof extractorInputSchema> & {
    input: z.infer<typeof extractorInputSchema>;
    runtimeContext?: RuntimeContext<WebBrowserRuntimeContext>;
  }) => {
    const requestId = generateId();
    const outputDir = (runtimeContext?.get('output-dir') as string) || './mastra/scraped-data';
    const userAgent = (runtimeContext?.get('user-agent') as string) || 'Mozilla/5.0 (compatible; Mastra/1.0)';
    const debug = Boolean(runtimeContext?.get('debug') || false);

    if (debug) {
      logger.info(`[${requestId}] Starting web extraction`, {
        url: input.url,
        selector: input.selector
      });
    }

    try {
      const response = await fetch(input.url, {
        headers: { 'User-Agent': userAgent }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const elements: Array<{
        text: string;
        html?: string;
        attributes?: Record<string, string>;
      }> = [];
      
      $(input.selector).each((_, el) => {
        const $el = $(el);
        const element = {
          text: $el.text().trim(),
          html: $el.html() || undefined,
          attributes: el.type === 'tag' ? el.attribs : undefined
        };
        elements.push(element);
      });
      
      let savedFile: string | undefined;
      if (input.saveToFile) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const urlObj = new URL(input.url);
        const filename = `extract_${urlObj.hostname}_${requestId}.json`;
        const filepath = path.join(outputDir, filename);
        
        const data = {
          url: input.url,
          selector: input.selector,
          elements,
          extractedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        savedFile = filepath;
      }

      if (debug) {
        logger.info(`[${requestId}] Web extraction completed`, {
          url: input.url,
          selector: input.selector,
          elementsFound: elements.length,
          savedFile
        });
      }

      return {
        success: true,
        url: input.url,
        selector: input.selector,
        elements,
        savedFile
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (debug) {
        logger.error(`[${requestId}] Web extraction failed`, {
          url: input.url,
          selector: input.selector,
          error: errorMessage
        });
      }

      return {
        success: false,
        url: input.url,
        selector: input.selector,
        error: errorMessage
      };
    }
  }
});

// ===== TOOL 3: WEB CRAWLER =====

const crawlerInputSchema = z.object({
  startUrl: z.string().url().describe('Starting URL to crawl'),
  maxPages: z.number().optional().default(5).describe('Maximum pages to crawl'),
  sameDomain: z.boolean().optional().default(true).describe('Stay on same domain'),
  saveToFile: z.boolean().optional().default(true).describe('Save results to file'),
}).strict();

export const webCrawlerTool = createTool({
  id: 'web-crawler',
  description: 'Crawl multiple pages using CheerioCrawler',
  inputSchema: crawlerInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    startUrl: z.string(),
    pagesFound: z.number(),
    pages: z.array(z.object({
      url: z.string(),
      title: z.string(),
      text: z.string(),
    })).optional(),
    savedFile: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof crawlerInputSchema> & {
    input: z.infer<typeof crawlerInputSchema>;
    runtimeContext?: RuntimeContext<WebBrowserRuntimeContext>;
  }) => {
    const requestId = generateId();
    const outputDir = (runtimeContext?.get('output-dir') as string) || './mastra/scraped-data';
    const debug = Boolean(runtimeContext?.get('debug') || false);

    if (debug) {
      logger.info(`[${requestId}] Starting web crawling`, {
        startUrl: input.startUrl,
        maxPages: input.maxPages
      });
    }

    try {
      const pages: Array<{ url: string; title: string; text: string; }> = [];
      
      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: input.maxPages,
        async requestHandler({ request, $ }) {
          const title = $('title').text().trim();
          const text = $('body').text().replace(/\s+/g, ' ').trim();
          
          pages.push({
            url: request.url,
            title,
            text
          });
          
          // Add more URLs if staying on same domain
          if (input.sameDomain) {
            const baseUrl = new URL(input.startUrl);
            $('a[href]').each((_, el) => {
              const href = $(el).attr('href');
              if (href) {
                try {
                  const linkUrl = new URL(href, request.url);
                  if (linkUrl.hostname === baseUrl.hostname) {
                    crawler.addRequests([linkUrl.href]);
                  }
                } catch {}
              }
            });
          }
        },
      });
      
      await crawler.run([input.startUrl]);
      
      let savedFile: string | undefined;
      if (input.saveToFile) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const urlObj = new URL(input.startUrl);
        const filename = `crawl_${urlObj.hostname}_${requestId}.json`;
        const filepath = path.join(outputDir, filename);
        
        const data = {
          startUrl: input.startUrl,
          maxPages: input.maxPages,
          pagesFound: pages.length,
          pages,
          crawledAt: new Date().toISOString()
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        savedFile = filepath;
      }

      if (debug) {
        logger.info(`[${requestId}] Web crawling completed`, {
          startUrl: input.startUrl,
          pagesFound: pages.length,
          savedFile
        });
      }

      return {
        success: true,
        startUrl: input.startUrl,
        pagesFound: pages.length,
        pages,
        savedFile
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (debug) {
        logger.error(`[${requestId}] Web crawling failed`, {
          startUrl: input.startUrl,
          error: errorMessage
        });
      }

      return {
        success: false,
        startUrl: input.startUrl,
        pagesFound: 0,
        error: errorMessage
      };
    }
  }
});

// ===== TOOL 4: PLAYWRIGHT SCRAPER =====

const playwrightInputSchema = z.object({
  url: z.string().url().describe('URL to scrape with Playwright'),
  waitForSelector: z.string().optional().describe('Wait for specific selector'),
  saveScreenshot: z.boolean().optional().default(false).describe('Save screenshot'),
  saveToFile: z.boolean().optional().default(true).describe('Save results to file'),
}).strict();

export const playwrightScraperTool = createTool({
  id: 'playwright-scraper',
  description: 'Advanced scraping with Playwright for JavaScript-heavy sites',
  inputSchema: playwrightInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string(),
    title: z.string().optional(),
    text: z.string().optional(),
    screenshot: z.string().optional(),
    savedFiles: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof playwrightInputSchema> & {
    input: z.infer<typeof playwrightInputSchema>;
    runtimeContext?: RuntimeContext<WebBrowserRuntimeContext>;
  }) => {
    const requestId = generateId();
    const outputDir = (runtimeContext?.get('output-dir') as string) || './mastra/scraped-data';
    const debug = Boolean(runtimeContext?.get('debug') || false);

    if (debug) {
      logger.info(`[${requestId}] Starting Playwright scraping`, {
        url: input.url,
        saveScreenshot: input.saveScreenshot
      });
    }

    try {
      const savedFiles: string[] = [];
      let title = '';
      let text = '';
      let screenshot: string | undefined;

      // Create dataset for storing results
      const dataset = await Dataset.open(`playwright-${requestId}`);

      const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: 1,
        async requestHandler({ request, page }) {
          // Wait for selector if specified
          if (input.waitForSelector) {
            await page.waitForSelector(input.waitForSelector, { timeout: 10000 });
          }

          title = await page.title();
          text = await page.evaluate(() => document.body.innerText);

          // Take screenshot if requested
          if (input.saveScreenshot) {
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            const urlObj = new URL(input.url);
            const screenshotPath = path.join(outputDir, `screenshot_${urlObj.hostname}_${requestId}.png`);
            await page.screenshot({ path: screenshotPath });
            screenshot = screenshotPath;
            savedFiles.push(screenshotPath);
          }

          // Save to dataset
          await dataset.pushData({
            url: request.url,
            title,
            text,
            scrapedAt: new Date().toISOString()
          });
        },
      });

      await crawler.run([input.url]);

      // Save to file if requested
      if (input.saveToFile) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const urlObj = new URL(input.url);
        const filename = `playwright_${urlObj.hostname}_${requestId}.json`;
        const filepath = path.join(outputDir, filename);

        const data = {
          url: input.url,
          title,
          text,
          screenshot,
          scrapedAt: new Date().toISOString()
        };

        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        savedFiles.push(filepath);
      }

      if (debug) {
        logger.info(`[${requestId}] Playwright scraping completed`, {
          url: input.url,
          title,
          textLength: text.length,
          screenshot,
          savedFiles: savedFiles.length
        });
      }

      return {
        success: true,
        url: input.url,
        title,
        text,
        screenshot,
        savedFiles
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (debug) {
        logger.error(`[${requestId}] Playwright scraping failed`, {
          url: input.url,
          error: errorMessage
        });
      }

      return {
        success: false,
        url: input.url,
        error: errorMessage
      };
    }
  }
});

// ===== TOOL 5: CHEERIO CRAWLER WITH DATASET =====

const cheerioDatasetInputSchema = z.object({
  startUrl: z.string().url().describe('Starting URL to crawl'),
  maxPages: z.number().optional().default(10).describe('Maximum pages to crawl'),
  sameDomain: z.boolean().optional().default(true).describe('Stay on same domain'),
  datasetName: z.string().optional().describe('Custom dataset name'),
  saveToFile: z.boolean().optional().default(true).describe('Save results to file'),
}).strict();

export const cheerioCrawlerDatasetTool = createTool({
  id: 'cheerio-crawler-dataset',
  description: 'Crawl pages with CheerioCrawler and store in Dataset',
  inputSchema: cheerioDatasetInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    startUrl: z.string(),
    datasetId: z.string().optional(),
    pagesProcessed: z.number(),
    savedFile: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof cheerioDatasetInputSchema> & {
    input: z.infer<typeof cheerioDatasetInputSchema>;
    runtimeContext?: RuntimeContext<WebBrowserRuntimeContext>;
  }) => {
    const requestId = generateId();
    const outputDir = (runtimeContext?.get('output-dir') as string) || './mastra/scraped-data';
    const debug = Boolean(runtimeContext?.get('debug') || false);

    if (debug) {
      logger.info(`[${requestId}] Starting Cheerio crawler with Dataset`, {
        startUrl: input.startUrl,
        maxPages: input.maxPages
      });
    }

    try {
      const datasetName = input.datasetName || `cheerio-crawl-${requestId}`;
      const dataset = await Dataset.open(datasetName);
      let pagesProcessed = 0;

      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: input.maxPages,
        async requestHandler({ request, $ }) {
          const title = $('title').text().trim();
          const text = $('body').text().replace(/\s+/g, ' ').trim();
          const links: string[] = [];

          // Extract links
          $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
              try {
                links.push(new URL(href, request.url).href);
              } catch {}
            }
          });

          // Save to dataset
          await dataset.pushData({
            url: request.url,
            title,
            text,
            links,
            crawledAt: new Date().toISOString(),
            requestId
          });

          pagesProcessed++;

          if (debug) {
            logger.info(`[${requestId}] Processed page ${pagesProcessed}`, { url: request.url, title });
          }

          // Add more URLs if staying on same domain
          if (input.sameDomain) {
            const baseUrl = new URL(input.startUrl);
            $('a[href]').each((_, el) => {
              const href = $(el).attr('href');
              if (href) {
                try {
                  const linkUrl = new URL(href, request.url);
                  if (linkUrl.hostname === baseUrl.hostname) {
                    crawler.addRequests([linkUrl.href]);
                  }
                } catch {}
              }
            });
          }
        },
      });

      await crawler.run([input.startUrl]);

      // Export dataset to file if requested
      let savedFile: string | undefined;
      if (input.saveToFile) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const urlObj = new URL(input.startUrl);
        const filename = `cheerio_dataset_${urlObj.hostname}_${requestId}.json`;
        const filepath = path.join(outputDir, filename);

        // Get all data from dataset
        const data = await dataset.getData();
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        savedFile = filepath;
      }

      if (debug) {
        logger.info(`[${requestId}] Cheerio crawler completed`, {
          startUrl: input.startUrl,
          pagesProcessed,
          datasetId: datasetName,
          savedFile
        });
      }

      return {
        success: true,
        startUrl: input.startUrl,
        datasetId: datasetName,
        pagesProcessed,
        savedFile
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (debug) {
        logger.error(`[${requestId}] Cheerio crawler failed`, {
          startUrl: input.startUrl,
          error: errorMessage
        });
      }

      return {
        success: false,
        startUrl: input.startUrl,
        datasetId: undefined,
        pagesProcessed: 0,
        error: errorMessage
      };
    }
  }
});

// ===== TOOL 6: PLAYWRIGHT CRAWLER WITH DATASET =====

const playwrightDatasetInputSchema = z.object({
  startUrl: z.string().url().describe('Starting URL to crawl'),
  maxPages: z.number().optional().default(5).describe('Maximum pages to crawl'),
  waitForSelector: z.string().optional().describe('Wait for specific selector'),
  takeScreenshots: z.boolean().optional().default(false).describe('Take screenshots of pages'),
  datasetName: z.string().optional().describe('Custom dataset name'),
  saveToFile: z.boolean().optional().default(true).describe('Save results to file'),
}).strict();

export const playwrightCrawlerDatasetTool = createTool({
  id: 'playwright-crawler-dataset',
  description: 'Advanced crawling with PlaywrightCrawler and Dataset storage',
  inputSchema: playwrightDatasetInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    startUrl: z.string(),
    datasetId: z.string().optional(),
    pagesProcessed: z.number(),
    screenshots: z.array(z.string()).optional(),
    savedFile: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof playwrightDatasetInputSchema> & {
    input: z.infer<typeof playwrightDatasetInputSchema>;
    runtimeContext?: RuntimeContext<WebBrowserRuntimeContext>;
  }) => {
    const requestId = generateId();
    const outputDir = (runtimeContext?.get('output-dir') as string) || './mastra/scraped-data';
    const debug = Boolean(runtimeContext?.get('debug') || false);

    if (debug) {
      logger.info(`[${requestId}] Starting Playwright crawler with Dataset`, {
        startUrl: input.startUrl,
        maxPages: input.maxPages,
        takeScreenshots: input.takeScreenshots
      });
    }

    try {
      const datasetName = input.datasetName || `playwright-crawl-${requestId}`;
      const dataset = await Dataset.open(datasetName);
      let pagesProcessed = 0;
      const screenshots: string[] = [];

      const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: input.maxPages,
        async requestHandler({ request, page }) {
          // Wait for selector if specified
          if (input.waitForSelector) {
            try {
              await page.waitForSelector(input.waitForSelector, { timeout: 10000 });
            } catch {
              if (debug) {
                logger.warn(`[${requestId}] Selector not found: ${input.waitForSelector}`, { url: request.url });
              }
            }
          }

          const title = await page.title();
          const text = await page.evaluate(() => document.body.innerText);
          const url = page.url();

          // Take screenshot if requested
          let screenshotPath: string | undefined;
          if (input.takeScreenshots) {
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            const urlObj = new URL(url);
            screenshotPath = path.join(outputDir, `screenshot_${urlObj.hostname}_${pagesProcessed}_${requestId}.png`);
            await page.screenshot({ path: screenshotPath });
            screenshots.push(screenshotPath);
          }

          // Save to dataset
          await dataset.pushData({
            url,
            title,
            text,
            screenshot: screenshotPath,
            crawledAt: new Date().toISOString(),
            requestId
          });

          pagesProcessed++;

          if (debug) {
            logger.info(`[${requestId}] Processed page ${pagesProcessed}`, {
              url,
              title,
              screenshot: screenshotPath
            });
          }
        },
      });

      await crawler.run([input.startUrl]);

      // Export dataset to file if requested
      let savedFile: string | undefined;
      if (input.saveToFile) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const urlObj = new URL(input.startUrl);
        const filename = `playwright_dataset_${urlObj.hostname}_${requestId}.json`;
        const filepath = path.join(outputDir, filename);

        // Get all data from dataset
        const data = await dataset.getData();
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        savedFile = filepath;
      }

      if (debug) {
        logger.info(`[${requestId}] Playwright crawler completed`, {
          startUrl: input.startUrl,
          pagesProcessed,
          datasetId: datasetName,
          screenshots: screenshots.length,
          savedFile
        });
      }

      return {
        success: true,
        startUrl: input.startUrl,
        datasetId: datasetName,
        pagesProcessed,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
        savedFile
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (debug) {
        logger.error(`[${requestId}] Playwright crawler failed`, {
          startUrl: input.startUrl,
          error: errorMessage
        });
      }

      return {
        success: false,
        startUrl: input.startUrl,
        datasetId: undefined,
        pagesProcessed: 0,
        error: errorMessage
      };
    }
  }
});

// Runtime context
export const webBrowserRuntimeContext = new RuntimeContext<WebBrowserRuntimeContext>();
webBrowserRuntimeContext.set('user-agent', 'Mozilla/5.0 (compatible; Mastra/1.0)');
webBrowserRuntimeContext.set('request-timeout', 30000);
webBrowserRuntimeContext.set('debug', false);
webBrowserRuntimeContext.set('output-dir', './mastra/scraped-data');
