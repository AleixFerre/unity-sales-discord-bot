/** Small HTML-reading helpers shared by the store parsers. */

export const readMetaContent = (html: string, attributeMatch: string): string | null => {
  const regex = new RegExp(`<meta[^>]*${attributeMatch}[^>]*content=(["'])(.*?)\\1`, 'i');
  const match = html.match(regex);
  return match?.[2]?.trim() || null;
};

export const readTitleTag = (html: string): string | null => {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
};

export const decodeHtmlEntities = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

export const resolveProtocolRelativeUrl = (url: string | null): string | null => {
  if (!url) {
    return null;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url;
};
