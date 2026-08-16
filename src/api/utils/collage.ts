import sharp from 'sharp';

export const COLLAGE_WIDTH = 1200;
export const COLLAGE_HEIGHT = 800;
export const MAX_COLLAGE_IMAGES = 4;

const PADDING = 16;
const GUTTER = 12;
const RADIUS = 16;
const BACKGROUND = { r: 36, g: 36, b: 41, alpha: 1 };

const INNER_WIDTH = COLLAGE_WIDTH - PADDING * 2;
const INNER_HEIGHT = COLLAGE_HEIGHT - PADDING * 2;
const HALF_WIDTH = Math.floor((INNER_WIDTH - GUTTER) / 2);
const HALF_HEIGHT = Math.floor((INNER_HEIGHT - GUTTER) / 2);
const RIGHT_COLUMN = PADDING + HALF_WIDTH + GUTTER;
const BOTTOM_ROW = PADDING + HALF_HEIGHT + GUTTER;

type Tile = { left: number; top: number; width: number; height: number };

// A single image is posted as-is, so the collage only covers 2..4.
export const layoutFor = (count: number): Tile[] | null => {
  switch (count) {
    case 4:
      return [
        { left: PADDING, top: PADDING, width: HALF_WIDTH, height: HALF_HEIGHT },
        { left: RIGHT_COLUMN, top: PADDING, width: HALF_WIDTH, height: HALF_HEIGHT },
        { left: PADDING, top: BOTTOM_ROW, width: HALF_WIDTH, height: HALF_HEIGHT },
        { left: RIGHT_COLUMN, top: BOTTOM_ROW, width: HALF_WIDTH, height: HALF_HEIGHT },
      ];
    case 3:
      return [
        { left: PADDING, top: PADDING, width: HALF_WIDTH, height: HALF_HEIGHT },
        { left: RIGHT_COLUMN, top: PADDING, width: HALF_WIDTH, height: HALF_HEIGHT },
        { left: PADDING, top: BOTTOM_ROW, width: INNER_WIDTH, height: HALF_HEIGHT },
      ];
    case 2:
      return [
        { left: PADDING, top: PADDING, width: HALF_WIDTH, height: INNER_HEIGHT },
        { left: RIGHT_COLUMN, top: PADDING, width: HALF_WIDTH, height: INNER_HEIGHT },
      ];
    default:
      return null;
  }
};

export const buildCollage = async (buffers: Buffer[]): Promise<Buffer | null> => {
  const decodable = await keepDecodable(buffers.slice(0, MAX_COLLAGE_IMAGES));
  const layout = layoutFor(decodable.length);
  if (!layout) {
    return null;
  }

  try {
    const tiles = await Promise.all(
      layout.map(async (rect, index) => {
        const source = decodable[index];
        if (!source) {
          throw new Error(`Missing source image for tile ${index}`);
        }
        return { input: await renderTile(source, rect), left: rect.left, top: rect.top };
      })
    );

    return await sharp({
      create: {
        width: COLLAGE_WIDTH,
        height: COLLAGE_HEIGHT,
        channels: 4,
        background: BACKGROUND,
      },
    })
      .composite(tiles)
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    console.warn('Failed to build the image collage', error);
    return null;
  }
};

// Store CDNs occasionally serve a truncated or mislabelled file; dropping it here
// lets the collage fall back to a smaller layout instead of failing outright.
const keepDecodable = async (buffers: Buffer[]): Promise<Buffer[]> => {
  const probed = await Promise.all(
    buffers.map(async (buffer) => {
      try {
        const { width, height } = await sharp(buffer, { failOn: 'none' }).metadata();
        return width && height ? buffer : null;
      } catch (error) {
        console.warn('Discarding an undecodable collage image', error);
        return null;
      }
    })
  );
  return probed.filter((buffer): buffer is Buffer => buffer !== null);
};

// Masking with `dest-in` keeps only the pixels under the rounded rectangle, which
// is how the corners get cut; PNG output preserves the alpha until the final composite.
const renderTile = (source: Buffer, rect: Tile): Promise<Buffer> => {
  const mask = Buffer.from(
    `<svg width="${rect.width}" height="${rect.height}">` +
      `<rect width="${rect.width}" height="${rect.height}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/>` +
      `</svg>`
  );

  return sharp(source, { failOn: 'none' })
    .resize(rect.width, rect.height, { fit: 'cover', position: 'centre' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
};
