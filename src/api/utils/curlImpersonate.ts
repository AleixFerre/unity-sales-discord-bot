import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Cloudflare rejects plain HTTP clients on TLS fingerprint alone (copying
// Chrome's headers and even valid clearance cookies still gets a 403
// challenge), so requests must go out with a real browser handshake via
// curl-impersonate. Cloudflare can score fingerprints differently, so we
// rotate through several until one returns a usable body.
// Wrappers are installed by scripts/install-curl-impersonate.sh (part of
// `npm run build`). They are Linux binaries; on Windows dev machines they run
// through WSL. Paths stay relative because WSL maps the spawn cwd to
// /mnt/<drive>/… — the same relative path resolves on both sides.
const CURL_IMPERSONATE_DIR = 'bin/curl-impersonate';
const FINGERPRINT_WRAPPERS = ['curl_chrome146', 'curl_firefox147', 'curl_chrome131'];

const isWindows = process.platform === 'win32';
const CURL_COMMAND = isWindows ? 'wsl' : 'bash';

const RETRY_DELAY_MS = 3000;
// Server-rendered store pages run to a few MB.
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
// Sentinel appended to the response body via curl -w so we can read the HTTP
// status and content type without a second request.
const META_MARKER = '\n__META__ ';

let jarCounter = 0;

export type ImpersonatedRequest = {
  url: string;
  headers?: Record<string, string>;
  /** Fetched first on the same cookie jar, for hosts that expect a browser session (Cloudflare's `__cf_bm`). */
  warmupUrl?: string;
  /** Returns why a 200 body is unusable (challenge page, wrong shape) so the next fingerprint is tried. */
  rejectBody?: (body: string) => string | null;
};

/** Fetches a URL with a real browser TLS fingerprint, trying each wrapper until one returns a usable body. */
export const fetchImpersonated = async (request: ImpersonatedRequest): Promise<string> => {
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
      await delay(RETRY_DELAY_MS);
    }
    try {
      return await fetchOnce(wrapper, request);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`${request.url} failed with every fingerprint: ${failures.join(' ||| ')}`);
};

const fetchOnce = async (wrapper: string, request: ImpersonatedRequest): Promise<string> => {
  // The jar path is relative so it resolves identically under WSL; the counter
  // keeps concurrent requests from clobbering each other's jar.
  jarCounter += 1;
  const jar = `${CURL_IMPERSONATE_DIR}/.cookiejar-${wrapper}-${process.pid}-${jarCounter}.txt`;
  const headerArgs = Object.entries(request.headers ?? {}).flatMap(([name, value]) => [
    '-H',
    `${name}: ${value}`,
  ]);
  try {
    if (request.warmupUrl) {
      try {
        await runCurl(wrapper, ['-c', jar, '-o', '/dev/null', request.warmupUrl]);
      } catch {
        // A failed warm-up is not fatal — try the real request anyway.
      }
    }
    const { stdout } = await runCurl(wrapper, [
      '-b',
      jar,
      '-c',
      jar,
      ...headerArgs,
      '-w',
      `${META_MARKER}%{http_code} %{content_type} cf-mitigated=[%header{cf-mitigated}]`,
      request.url,
    ]);
    const metaIndex = stdout.lastIndexOf(META_MARKER);
    const body = (metaIndex >= 0 ? stdout.slice(0, metaIndex) : stdout).trim();
    const meta =
      metaIndex >= 0 ? stdout.slice(metaIndex + META_MARKER.length).trim() : 'unknown unknown';
    if (!meta.startsWith('200')) {
      throw new Error(
        `[${wrapper}] status/content-type: ${meta}; body starts with: ${body.slice(0, 200)}`
      );
    }
    const rejection = request.rejectBody ? request.rejectBody(body) : null;
    if (rejection) {
      throw new Error(`[${wrapper}] ${rejection} (${meta}); body starts with: ${body.slice(0, 200)}`);
    }
    return body;
  } finally {
    await rm(path.resolve(process.cwd(), jar), { force: true });
  }
};

const runCurl = (wrapper: string, args: string[]): Promise<{ stdout: string }> =>
  execFileAsync(
    CURL_COMMAND,
    [...(isWindows ? ['bash'] : []), `${CURL_IMPERSONATE_DIR}/${wrapper}`, '-sS', '--max-time', '30', ...args],
    { maxBuffer: MAX_RESPONSE_BYTES }
  );

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
