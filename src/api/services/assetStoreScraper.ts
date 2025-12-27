import puppeteer from 'puppeteer';
import { AssetStoreData, extractAssetStoreData } from '../utils/assetStoreParser';

export const scrapeAssetStore = async (url: string): Promise<AssetStoreData | null> => {
  const html = await fetchAssetStoreHtml(url);
  return extractAssetStoreData(html);
};

const fetchAssetStoreHtml = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('UnitySalesBot/1.0');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    return await page.content();
  } finally {
    await browser.close();
  }
};
