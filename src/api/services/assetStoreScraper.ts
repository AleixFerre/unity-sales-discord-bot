import puppeteer, { Page } from 'puppeteer';
import { AssetStoreData, extractAssetStoreData } from '../utils/assetStoreParser';

export type AssetStoreListData = {
  title?: string;
  imageUrls: string[];
};

// Structural stand-ins for DOM types (the "dom" lib is not enabled in this project).
type MinimalElement = {
  getAttribute(name: string): string | null;
  textContent: string | null;
};

type MinimalDocument = {
  title?: string;
  querySelector(selector: string): MinimalElement | null;
  querySelectorAll(selector: string): { length: number; [index: number]: MinimalElement };
};

export const scrapeAssetStore = async (url: string): Promise<AssetStoreData | null> => {
  const html = await fetchAssetStoreHtml(url);
  return extractAssetStoreData(html);
};

export const scrapeAssetStoreList = async (url: string): Promise<AssetStoreListData> => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await newAssetStorePage(browser);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForListContent(page, 45000);
    return await extractListData(page);
  } finally {
    await browser.close();
  }
};

const fetchAssetStoreHtml = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await newAssetStorePage(browser);
    const html = await fetchPageContent(page, url);
    return html;
  } finally {
    await browser.close();
  }
};

const newAssetStorePage = async (browser: Awaited<ReturnType<typeof puppeteer.launch>>): Promise<Page> => {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
  return page;
};

const waitForListContent = async (page: Page, timeoutMs: number): Promise<void> => {
  try {
    await page.waitForFunction(
      () => {
        const doc = (globalThis as { document?: MinimalDocument }).document;
        return Boolean(doc && doc.querySelector('a[href*="/packages/"] img'));
      },
      { timeout: timeoutMs, polling: 500 }
    );
  } catch {
    // Best effort: fall back to whatever content is available.
  }
};

// The callback runs in the page context and stays synchronous on purpose:
// an async callback would be downleveled to an __awaiter helper (target es2016)
// that does not exist inside the page.
const extractListData = (page: Page): Promise<AssetStoreListData> =>
  page.evaluate(() => {
    const doc = (globalThis as { document?: MinimalDocument }).document;
    if (!doc) {
      return { imageUrls: [] as string[] };
    }

    const readText = (selector: string): string => {
      const node = doc.querySelector(selector);
      return node && node.textContent ? node.textContent.trim() : '';
    };
    const readAttribute = (selector: string, name: string): string => {
      const node = doc.querySelector(selector);
      const value = node ? node.getAttribute(name) : null;
      return value ? value.trim() : '';
    };

    const title =
      readText('h1') ||
      readAttribute('meta[property="og:title"]', 'content') ||
      (doc.title || '').replace(/\s*[|-]\s*Unity Asset Store.*$/i, '').trim();

    // List item cards link to /packages/... and carry the package key image.
    const images = doc.querySelectorAll('a[href*="/packages/"] img');
    const imageUrls: string[] = [];
    for (let index = 0; index < images.length && imageUrls.length < 3; index += 1) {
      const image = images[index];
      const src = image ? image.getAttribute('src') || '' : '';
      if (src.indexOf('http') === 0 && imageUrls.indexOf(src) === -1) {
        imageUrls.push(src);
      }
    }

    return title ? { title, imageUrls } : { imageUrls };
  });

const fetchPageContent = async (page: Page, url: string): Promise<string> => {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await waitForAssetContent(page, 45000);
  return page.content();
};

const waitForAssetContent = async (page: Page, timeoutMs: number): Promise<void> => {
  try {
    await page.waitForFunction(
      () => {
        const doc = (globalThis as { document?: { title?: string; documentElement?: { innerHTML?: string } } })
          .document;
        const title = doc?.title || '';
        if (title.toLowerCase().includes('just a moment')) {
          return false;
        }
        const html = doc?.documentElement?.innerHTML || '';
        return (
          html.includes('application/ld+json') ||
          html.includes('property="og:title"') ||
          html.includes('name="title"')
        );
      },
      { timeout: timeoutMs, polling: 500 }
    );
  } catch {
    // Best effort: fall back to whatever content is available.
  }
};
