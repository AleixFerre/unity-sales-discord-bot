import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { FabFreeItem, extractFabFreeItems } from '../utils/fabFreeParser';

const execFileAsync = promisify(execFile);

const FAB_FREE_PAGE_URL = 'https://www.fab.com/limited-time-free';
const FAB_FREE_BLADE_URL = 'https://www.fab.com/i/blades/free_content_blade';

// Cloudflare rejects plain HTTP clients on TLS fingerprint alone (copying
// Chrome's headers and even valid clearance cookies still gets a 403
// challenge), so requests must go out with a real browser handshake via
// curl-impersonate. Cloudflare can score fingerprints differently, so we
// rotate through several until one gets JSON back.
// Wrappers are installed by scripts/install-curl-impersonate.sh (part of
// `npm run build`). They are Linux binaries; on Windows dev machines they run
// through WSL. Paths stay relative because WSL maps the spawn cwd to
// /mnt/<drive>/… — the same relative path resolves on both sides.
const CURL_IMPERSONATE_DIR = 'bin/curl-impersonate';
const FINGERPRINT_WRAPPERS = ['curl_chrome146', 'curl_firefox147', 'curl_chrome131'];

const isWindows = process.platform === 'win32';
const CURL_COMMAND = isWindows ? 'wsl' : 'bash';

const BLADE_RETRY_DELAY_MS = 3000;
// Sentinel appended to the response body via curl -w so we can read the HTTP
// status and content type without a second request.
const META_MARKER = '\n__META__ ';

export const scrapeFabFree = async (): Promise<FabFreeItem[]> => {
  const payload = await fetchFabFreeBlade();
  return extractFabFreeItems(payload);
};

const fetchFabFreeBlade = async (): Promise<unknown> => {
  const wrappers = FINGERPRINT_WRAPPERS.filter((wrapper) =>
    existsSync(path.resolve(process.cwd(), CURL_IMPERSONATE_DIR, wrapper))
  );
  if (!wrappers.length) {
    throw new Error(
      `no curl-impersonate wrappers found in ${path.resolve(process.cwd(), CURL_IMPERSONATE_DIR)} — ` +
        'run scripts/install-curl-impersonate.sh (uses WSL on Windows).'
    );
  }
  const failures: string[] = [];
  for (const wrapper of wrappers) {
    if (failures.length) {
      await delay(BLADE_RETRY_DELAY_MS);
    }
    try {
      return await fetchBladeOnce(wrapper);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Fab blade fetch failed with every fingerprint: ${failures.join(' ||| ')}`);
};

const runCurl = (wrapper: string, args: string[]): Promise<{ stdout: string }> =>
  execFileAsync(
    CURL_COMMAND,
    [...(isWindows ? ['bash'] : []), `${CURL_IMPERSONATE_DIR}/${wrapper}`, '-sS', '--max-time', '30', ...args],
    { maxBuffer: 10 * 1024 * 1024 }
  );

const fetchBladeOnce = async (wrapper: string): Promise<unknown> => {
  // Warm up a session first: Cloudflare tends to apply stricter rules to the
  // /i/blades/* API path than to normal pages, and hitting the page earns the
  // __cf_bm session cookie a browser would carry into the API request.
  // The jar path is relative so it resolves identically under WSL.
  const jar = `${CURL_IMPERSONATE_DIR}/.cookiejar-${wrapper}-${process.pid}.txt`;
  try {
    try {
      await runCurl(wrapper, ['-c', jar, '-o', '/dev/null', FAB_FREE_PAGE_URL]);
    } catch {
      // A failed warm-up is not fatal — try the blade request anyway.
    }
    const { stdout } = await runCurl(wrapper, [
      '-b',
      jar,
      '-c',
      jar,
      '-H',
      'accept: application/json',
      '-H',
      `referer: ${FAB_FREE_PAGE_URL}`,
      '-w',
      `${META_MARKER}%{http_code} %{content_type} cf-mitigated=[%header{cf-mitigated}]`,
      FAB_FREE_BLADE_URL,
    ]);
    const metaIndex = stdout.lastIndexOf(META_MARKER);
    const body = (metaIndex >= 0 ? stdout.slice(0, metaIndex) : stdout).trim();
    const meta =
      metaIndex >= 0 ? stdout.slice(metaIndex + META_MARKER.length).trim() : 'unknown unknown';
    if (!meta.startsWith('200') || !/^[[{]/.test(body)) {
      throw new Error(
        `[${wrapper}] status/content-type: ${meta}; body starts with: ${body.slice(0, 200)}`
      );
    }
    return JSON.parse(body);
  } finally {
    await rm(path.resolve(process.cwd(), jar), { force: true });
  }
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
