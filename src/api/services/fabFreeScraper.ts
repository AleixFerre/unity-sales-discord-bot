import puppeteer from 'puppeteer';
import { FabFreeItem, extractFabFreeItems } from '../utils/fabFreeParser';

const FAB_FREE_PAGE_URL = 'https://www.fab.com/limited-time-free';
const FAB_FREE_BLADE_URL = 'https://www.fab.com/i/blades/free_content_blade';

export const scrapeFabFree = async (): Promise<FabFreeItem[]> => {
  const payload = await fetchFabFreeBlade();
  return extractFabFreeItems(payload);
};

const fetchFabFreeBlade = async (): Promise<unknown> => {
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
    // Load the page first so the request to the blade endpoint carries any
    // Cloudflare clearance cookies obtained while rendering.
    await page.goto(FAB_FREE_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const raw = await page.evaluate(async (url) => {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        credentials: 'include',
      });
      return response.text();
    }, FAB_FREE_BLADE_URL);
    return JSON.parse(raw);
  } finally {
    await browser.close();
  }
};
