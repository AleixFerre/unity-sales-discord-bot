const REQUEST_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// curl-impersonate decodes stdout as a string, so it cannot carry image bytes;
// the CDNs serving the key images accept a plain request anyway.
export const fetchImageBuffer = async (url: string): Promise<Buffer | null> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
      console.warn(`Image fetch failed with ${response.status} for ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      console.warn(`Skipping non-image response (${contentType || 'no content-type'}) for ${url}`);
      return null;
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
      console.warn(`Skipping oversized image (${declaredLength} bytes) for ${url}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn(`Skipping image with unusable size (${buffer.byteLength} bytes) for ${url}`);
      return null;
    }
    return buffer;
  } catch (error) {
    console.warn(`Image fetch errored for ${url}`, error);
    return null;
  }
};
