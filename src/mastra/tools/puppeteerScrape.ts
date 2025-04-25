import type { Page } from "puppeteer";

/**
 * Scrapes elements from a Puppeteer page for use in Mastra tools.
 */
export async function scrapeElements(
  page: Page,
  selector: string,
  attribute?: string,
  multiple: boolean = false
): Promise<string | string[] | null> {
  try {
    if (multiple) {
      return await page.$$eval(
        selector,
        (elements, attr) =>
          elements.map(el =>
            attr
              ? (el as HTMLElement).getAttribute(attr as string) ?? ""
              : (el.textContent ?? "").trim()
          ),
        attribute
      );
    } else {
      return await page.$eval(
        selector,
        (el, attr) =>
          attr
            ? (el as HTMLElement).getAttribute(attr as string) ?? ""
            : (el.textContent ?? "").trim(),
        attribute
      );
    }
  } catch {
    return null;
  }
}

/**
 * Scrapes a table and returns an array of objects (rows).
 */
export async function scrapeTable(
  page: Page,
  selector: string
): Promise<Array<Record<string, string>> | null> {
  try {
    return await page.$eval(selector, table => {
      const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent?.trim() ?? "");
      const rows = Array.from(table.querySelectorAll("tbody tr")).map(tr => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const rowObj: Record<string, string> = {};
        cells.forEach((cell, i) => {
          rowObj[headers[i] || `col${i}`] = cell.textContent?.trim() ?? "";
        });
        return rowObj;
      });
      return rows;
    });
  } catch {
    return null;
  }
}

/**
 * Scrapes all values of a given attribute from matching elements.
 */
export async function scrapeAttributes(
  page: Page,
  selector: string,
  attribute: string
): Promise<string[]> {
  try {
    return await page.$$eval(selector, (elements, attr) =>
      elements
        .map(el => (el as HTMLElement).getAttribute(attr as string))
        .filter(Boolean) as string[],
      attribute
    );
  } catch {
    return [];
  }
}

/**
 * Scrapes the inner HTML of the first matching element.
 */
export async function scrapeInnerHtml(
  page: Page,
  selector: string
): Promise<string | null> {
  try {
    return await page.$eval(selector, el => el.innerHTML);
  } catch {
    return null;
  }
}

/**
 * Scrapes JSON-LD <script type="application/ld+json"> blocks from the page.
 */
export async function scrapeJsonLd(page: Page): Promise<any[]> {
  try {
    const scripts = await page.$$eval(
      'script[type="application/ld+json"]',
      elements => elements.map(el => el.textContent ?? "")
    );
    return scripts
      .map(text => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Scrapes all meta tags and returns a key-value object.
 */
export async function scrapeMetaTags(page: Page): Promise<Record<string, string>> {
  try {
    return await page.evaluate(() => {
      const metaTags: Record<string, string> = {};
      document.querySelectorAll("meta").forEach(meta => {
        const name = meta.getAttribute("name") || meta.getAttribute("property");
        const content = meta.getAttribute("content");
        if (name && content) metaTags[name] = content;
      });
      return metaTags;
    });
  } catch {
    return {};
  }
}