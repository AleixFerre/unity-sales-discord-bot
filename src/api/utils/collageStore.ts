import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const COLLAGE_ROUTE = '/collages';
export const COLLAGE_DIR = path.join(process.cwd(), 'storage', 'collages');

const FILE_PATTERN = /^[0-9a-f-]{36}\.jpg$/i;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const storeCollage = async (data: Buffer): Promise<string> => {
  await mkdir(COLLAGE_DIR, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  await writeFile(path.join(COLLAGE_DIR, name), data);
  void pruneOldCollages();
  return name;
};

export const buildCollageUrl = (baseUrl: string, name: string): string =>
  `${baseUrl.replace(/\/+$/, '')}${COLLAGE_ROUTE}/${name}`;

// Matching on the path alone keeps this working when the collage was stored under a
// different host than the one currently configured (local dev vs. deployed).
export const readStoredCollage = async (rawUrl: string): Promise<Buffer | null> => {
  const name = readCollageName(rawUrl);
  if (!name) {
    return null;
  }
  try {
    return await readFile(path.join(COLLAGE_DIR, name));
  } catch {
    return null;
  }
};

// Discord keeps its own copy of an uploaded attachment, so the local file is only
// needed until the message goes out.
export const deleteStoredCollage = async (rawUrl: string): Promise<void> => {
  const name = readCollageName(rawUrl);
  if (!name) {
    return;
  }
  try {
    await unlink(path.join(COLLAGE_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Failed to delete the stored collage ${name}`, error);
    }
  }
};

const readCollageName = (rawUrl: string): string | null => {
  let pathname: string;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    return null;
  }
  const prefix = `${COLLAGE_ROUTE}/`;
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const name = pathname.slice(prefix.length);
  return FILE_PATTERN.test(name) ? name : null;
};

const pruneOldCollages = async (): Promise<void> => {
  try {
    const names = await readdir(COLLAGE_DIR);
    const cutoff = Date.now() - MAX_AGE_MS;
    await Promise.all(
      names.filter((name) => FILE_PATTERN.test(name)).map(async (name) => {
        const file = path.join(COLLAGE_DIR, name);
        const { mtimeMs } = await stat(file);
        if (mtimeMs < cutoff) {
          await unlink(file);
        }
      })
    );
  } catch (error) {
    console.warn('Failed to prune stored collages', error);
  }
};
