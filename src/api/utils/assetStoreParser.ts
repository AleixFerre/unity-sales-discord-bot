export type AssetStoreData = {
  title?: string;
  description?: string;
  imageUrl?: string;
};

export const extractAssetStoreData = (html: string): AssetStoreData | null => {
  const product = findProductJsonLd(html);
  const name = readStringProperty(product, 'name');
  const publisher = readBrandName(product);
  const description = decodeHtml(
    readStringProperty(product, 'description') ||
      readMetaContent(html, 'property="og:description"') ||
      readMetaContent(html, 'name="description"')
  );
  const imageUrl = normalizeImageUrl(
    readImageUrl(product) || readMetaContent(html, 'property="og:image"')
  );

  const title = buildTitle(name, publisher);
  const result: AssetStoreData = {};
  if (title) {
    result.title = title;
  }
  if (description) {
    result.description = description;
  }
  if (imageUrl) {
    result.imageUrl = imageUrl;
  }

  return Object.keys(result).length ? result : null;
};

const findProductJsonLd = (html: string): Record<string, unknown> | null => {
  const matches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const match of matches) {
    const payload = match[1]?.trim();
    if (!payload) {
      continue;
    }
    const parsed = safeParseJson(payload);
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const product = extractProductNode(candidate);
      if (product) {
        return product;
      }
    }
  }
  return null;
};

const extractProductNode = (candidate: unknown): Record<string, unknown> | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  const typed = candidate as Record<string, unknown>;
  if (typed['@type'] === 'Product') {
    return typed;
  }
  const graph = typed['@graph'];
  if (Array.isArray(graph)) {
    for (const entry of graph) {
      if (entry && typeof entry === 'object' && (entry as Record<string, unknown>)['@type'] === 'Product') {
        return entry as Record<string, unknown>;
      }
    }
  }
  return null;
};

const safeParseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readStringProperty = (product: Record<string, unknown> | null, key: string): string | null => {
  if (!product) {
    return null;
  }
  const value = product[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const readBrandName = (product: Record<string, unknown> | null): string | null => {
  if (!product) {
    return null;
  }
  const brand = product['brand'];
  if (typeof brand === 'string') {
    return brand.trim();
  }
  if (brand && typeof brand === 'object' && typeof (brand as Record<string, unknown>)['name'] === 'string') {
    return ((brand as Record<string, unknown>)['name'] as string).trim();
  }
  return null;
};

const readImageUrl = (product: Record<string, unknown> | null): string | null => {
  if (!product) {
    return null;
  }
  const image = product['image'];
  if (typeof image === 'string') {
    return image;
  }
  if (Array.isArray(image) && typeof image[0] === 'string') {
    return image[0];
  }
  return null;
};

const readMetaContent = (html: string, attributeMatch: string): string | null => {
  const regex = new RegExp(`<meta[^>]*${attributeMatch}[^>]*content="([^"]+)"`, 'i');
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
};

const buildTitle = (name: string | null, publisher: string | null): string | null => {
  if (!name) {
    return null;
  }
  const baseName = humanizeAssetName(name);
  if (baseName && publisher) {
    return `${baseName} by ${publisher}`;
  }
  return baseName || null;
};

const humanizeAssetName = (name: string): string => {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
};

const normalizeImageUrl = (url: string | null): string | null => {
  if (!url) {
    return null;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url;
};

const decodeHtml = (value: string | null): string | null => {
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
