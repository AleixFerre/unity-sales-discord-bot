import puppeteer, { Page } from 'puppeteer';
import { AssetStoreListData, extractAssetStoreListData } from '../utils/assetStoreListParser';
import { AssetStoreData, extractAssetStoreData } from '../utils/assetStoreParser';
import { fetchImpersonated } from '../utils/curlImpersonate';

export type { AssetStoreListData };

const ASSET_STORE_HOME_URL = 'https://assetstore.unity.com/';

export const scrapeAssetStore = async (url: string): Promise<AssetStoreData | null> => {
  const html = await fetchAssetStoreHtml(url);
  return extractAssetStoreData(html);
};

// List pages are server-rendered, so a fingerprinted request is enough — no
// headless browser needed, unlike the single-listing scrape below.
export const scrapeAssetStoreList = async (url: string): Promise<AssetStoreListData> => {
  const html = await fetchImpersonated({
    url,
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
      referer: ASSET_STORE_HOME_URL,
    },
    rejectBody: rejectUnusableListPage,
  });
  return extractAssetStoreListData(html);
};

const rejectUnusableListPage = (body: string): string | null => {
  if (/just a moment/i.test(body.slice(0, 2000))) {
    return 'got a bot challenge page';
  }
  return /<h1[^>]*>/i.test(body) ? null : 'response carried no list content';
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
