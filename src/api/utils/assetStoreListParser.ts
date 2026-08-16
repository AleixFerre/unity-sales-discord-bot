import {
  decodeHtmlEntities,
  readMetaContent,
  readTitleTag,
  resolveProtocolRelativeUrl,
} from './html';

export type AssetStoreListData = {
  title?: string;
  imageUrls: string[];
};

/** The list embed shows the first four item images, combined into one collage. */
export const LIST_IMAGE_LIMIT = 4;

// Asset Store list pages are server-rendered, so the item cards are in the HTML
// that comes back from a plain (browser-fingerprinted) request.
export const extractAssetStoreListData = (
  html: string,
  limit: number = LIST_IMAGE_LIMIT
): AssetStoreListData => {
  const title = readListTitle(html);
  const imageUrls = readItemImageUrls(html, limit);
  return title ? { title, imageUrls } : { imageUrls };
};

const readListTitle = (html: string): string | null => {
  const heading = readHeadingText(html);
  const fallback = stripStoreSuffix(
    readMetaContent(html, 'property="og:title"') || readTitleTag(html) || ''
  );
  return decodeHtmlEntities(heading || fallback || null);
};

const readHeadingText = (html: string): string | null => {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match?.[1]) {
    return null;
  }
  // Cards render through React SSR, so the heading holds comment nodes and spans.
  const text = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text || null;
};

const stripStoreSuffix = (value: string): string =>
  value.replace(/\s*[|-]\s*(?:Unity\s*)?Asset Store\s*$/i, '').trim();

// Item cards come first in document order, each a /packages/ link followed by its
// key image. Anchoring on the first package link skips the header and the list
// author's avatar, which use the same image host.
const readItemImageUrls = (html: string, limit: number): string[] => {
  const firstCardIndex = html.search(/href="\/packages\//i);
  if (firstCardIndex < 0) {
    return [];
  }
  const urls: string[] = [];
  for (const candidate of collectImageUrls(html.slice(firstCardIndex))) {
    const url = resolveProtocolRelativeUrl(decodeHtmlEntities(candidate));
    if (!url || !isItemImage(url) || urls.includes(url)) {
      continue;
    }
    urls.push(url);
    if (urls.length >= limit) {
      break;
    }
  }
  return urls;
};

// Cards carry their key image as an inline background-image; <img> is matched too
// so a markup change on the store side degrades instead of returning nothing.
const BACKGROUND_IMAGE_PATTERN =
  /background-image:\s*url\(\s*(?:&quot;|&#34;|["'])?([^"'()]+?)(?:&quot;|&#34;|["'])?\s*\)/gi;
const IMG_SRC_PATTERN = /<img[^>]+\bsrc=(["'])([^"']+)\1/gi;

const collectImageUrls = (html: string): string[] => {
  const found: { index: number; url: string }[] = [];
  for (const match of html.matchAll(BACKGROUND_IMAGE_PATTERN)) {
    if (match[1]) {
      found.push({ index: match.index ?? 0, url: match[1].trim() });
    }
  }
  for (const match of html.matchAll(IMG_SRC_PATTERN)) {
    if (match[2]) {
      found.push({ index: match.index ?? 0, url: match[2].trim() });
    }
  }
  return found.sort((a, b) => a.index - b.index).map((entry) => entry.url);
};

const isItemImage = (url: string): boolean => {
  if (!/^https?:\/\//i.test(url) || /\/logo/i.test(url)) {
    return false;
  }
  return url.includes('key-image') || /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(url);
};
