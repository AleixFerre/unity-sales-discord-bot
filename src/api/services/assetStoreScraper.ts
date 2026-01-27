import puppeteer, { Page } from 'puppeteer';
import { AssetStoreData, extractAssetStoreData } from '../utils/assetStoreParser';

export const scrapeAssetStore = async (url: string): Promise<AssetStoreData | null> => {
  const html = await fetchAssetStoreHtml(url);
  return extractAssetStoreData(html);
};

const fetchAssetStoreHtml = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
    const html = await fetchWithRetries(page, url);
    return html;
  } finally {
    await browser.close();
  }
};

const fetchWithRetries = async (page: Page, url: string): Promise<string> => {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const ready = await waitForAssetContent(page, 45000);
  const title = await page.title().catch(() => '');
  const isChallenge = title.toLowerCase().includes('just a moment');
  if (ready && !isChallenge) {
    return await page.content();
  }
  return await page.content();
};

const waitForAssetContent = async (page: Page, timeoutMs: number): Promise<boolean> => {
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
    return true;
  } catch {
    // Best effort: fall back to whatever content is available.
    return false;
  }
};
