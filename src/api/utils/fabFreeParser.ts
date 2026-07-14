export type FabFreeItem = {
  title?: string;
  imageUrl?: string;
  price?: string;
  freeUntil?: string;
  url?: string;
};

const FAB_LISTING_BASE = 'https://www.fab.com/listings/';

export const extractFabFreeItems = (payload: unknown): FabFreeItem[] => {
  const tiles = readTiles(payload);
  const items: FabFreeItem[] = [];
  for (const tile of tiles) {
    const listing = readListing(tile);
    if (!listing) {
      continue;
    }
    const item = buildFabFreeItem(listing);
    if (item) {
      items.push(item);
    }
  }
  return items;
};

const readTiles = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const tiles = (payload as Record<string, unknown>)['tiles'];
  return Array.isArray(tiles) ? tiles : [];
};

const readListing = (tile: unknown): Record<string, unknown> | null => {
  if (!tile || typeof tile !== 'object') {
    return null;
  }
  const listing = (tile as Record<string, unknown>)['listing'];
  if (!listing || typeof listing !== 'object') {
    return null;
  }
  return listing as Record<string, unknown>;
};

const buildFabFreeItem = (listing: Record<string, unknown>): FabFreeItem | null => {
  const name = readStringProperty(listing, 'title');
  const seller = readSellerName(listing);
  const priceTier = readFirstPriceTier(listing);
  const item: FabFreeItem = {};

  const title = buildTitle(name, seller);
  if (title) {
    item.title = title;
  }
  const imageUrl = readImageUrl(listing);
  if (imageUrl) {
    item.imageUrl = imageUrl;
  }
  const price = readPrice(priceTier, listing);
  if (price) {
    item.price = price;
  }
  const freeUntil = readFreeUntil(priceTier);
  if (freeUntil) {
    item.freeUntil = freeUntil;
  }
  const url = buildListingUrl(listing);
  if (url) {
    item.url = url;
  }

  return Object.keys(item).length ? item : null;
};

const readStringProperty = (source: Record<string, unknown>, key: string): string | null => {
  const value = source[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const readSellerName = (listing: Record<string, unknown>): string | null => {
  const user = listing['user'];
  if (user && typeof user === 'object') {
    return readStringProperty(user as Record<string, unknown>, 'sellerName');
  }
  return null;
};

const readFirstPriceTier = (listing: Record<string, unknown>): Record<string, unknown> | null => {
  const licenses = listing['licenses'];
  if (!Array.isArray(licenses)) {
    return null;
  }
  for (const license of licenses) {
    if (license && typeof license === 'object') {
      const priceTier = (license as Record<string, unknown>)['priceTier'];
      if (priceTier && typeof priceTier === 'object') {
        return priceTier as Record<string, unknown>;
      }
    }
  }
  return null;
};

const readPrice = (
  priceTier: Record<string, unknown> | null,
  listing: Record<string, unknown>
): string | null => {
  const tierPrice = priceTier ? readNumericString(priceTier['price']) : null;
  if (tierPrice) {
    return tierPrice;
  }
  const startingPrice = listing['startingPrice'];
  if (startingPrice && typeof startingPrice === 'object') {
    return readNumericString((startingPrice as Record<string, unknown>)['price']);
  }
  return null;
};

const readNumericString = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const readFreeUntil = (priceTier: Record<string, unknown> | null): string | null => {
  if (!priceTier) {
    return null;
  }
  const end = priceTier['discountEndDate'];
  if (typeof end !== 'string') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(end.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
};

const readImageUrl = (listing: Record<string, unknown>): string | null => {
  const thumbnails = listing['thumbnails'];
  if (!Array.isArray(thumbnails)) {
    return null;
  }
  for (const thumbnail of thumbnails) {
    if (!thumbnail || typeof thumbnail !== 'object') {
      continue;
    }
    const images = (thumbnail as Record<string, unknown>)['images'];
    if (!Array.isArray(images)) {
      continue;
    }
    const best = pickLargestImageUrl(images);
    if (best) {
      return best;
    }
  }
  return null;
};

const pickLargestImageUrl = (images: unknown[]): string | null => {
  let bestUrl: string | null = null;
  let bestWidth = -1;
  for (const image of images) {
    if (!image || typeof image !== 'object') {
      continue;
    }
    const record = image as Record<string, unknown>;
    const url = record['url'];
    if (typeof url !== 'string' || !url.trim()) {
      continue;
    }
    const width = typeof record['width'] === 'number' ? record['width'] : 0;
    if (width > bestWidth) {
      bestWidth = width;
      bestUrl = url.trim();
    }
  }
  return bestUrl;
};

const buildListingUrl = (listing: Record<string, unknown>): string | null => {
  const uid = readStringProperty(listing, 'uid');
  return uid ? `${FAB_LISTING_BASE}${uid}` : null;
};

const buildTitle = (name: string | null, seller: string | null): string | null => {
  if (!name) {
    return null;
  }
  return seller ? `${name} by ${seller}` : name;
};
