import {
  decodeHtmlEntities,
  readMetaContent,
  readTitleTag,
  resolveProtocolRelativeUrl,
} from './html';

export type AssetStoreListData = {
  title?: string;
  author?: string;
  itemCount?: number;
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
  const author = readListAuthor(html);
  const itemCount = readItemCount(html);
  const imageUrls = readItemImageUrls(html, limit);
  const data: AssetStoreListData = { imageUrls };
  if (title) {
    data.title = title;
  }
  if (author) {
    data.author = author;
  }
  if (itemCount > 0) {
    data.itemCount = itemCount;
  }
  return data;
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
  return stripTags(match[1]) || null;
};

// The list owner is only named in the header breadcrumb — Home › author › list
// title — so the last link before the heading is the account the list belongs
// to. Anything after the heading is an item card.
const readListAuthor = (html: string): string | null => {
  const headerStart = html.search(/<main\b/i);
  const headingStart = html.search(/<h1\b/i);
  if (headerStart < 0 || headingStart <= headerStart) {
    return null;
  }
  const links = [
    ...html.slice(headerStart, headingStart).matchAll(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi),
  ];
  for (const link of links.reverse()) {
    if (link[1] === '/') {
      continue;
    }
    const name = stripTags(link[2] ?? '');
    if (name) {
      return decodeHtmlEntities(name);
    }
  }
  return null;
};

const stripTags = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const stripStoreSuffix = (value: string): string =>
  value.replace(/\s*[|-]\s*(?:Unity\s*)?Asset Store\s*$/i, '').trim();

// A card links to its package more than once (image and title), so the distinct
// paths are the item count. The image list can't stand in for it — that one is
// capped at the four images the collage needs.
const readItemCount = (html: string): number => {
  const firstCardIndex = html.search(/href="\/packages\//i);
  if (firstCardIndex < 0) {
    return 0;
  }
  const paths = new Set<string>();
  for (const match of html.slice(firstCardIndex).matchAll(/href="(\/packages\/[^"]+)"/gi)) {
    const href = match[1];
    if (href) {
      paths.add(href.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase());
    }
  }
  return paths.size;
};

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
