import { execFile } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { FabFreeItem, extractFabFreeItems } from '../utils/fabFreeParser';

const execFileAsync = promisify(execFile);

const FAB_FREE_BLADE_URL = 'https://www.fab.com/i/blades/free_content_blade';

// Cloudflare rejects plain HTTP clients on TLS fingerprint alone (copying
// Chrome's headers and even valid clearance cookies still gets a 403
// challenge), so the request must go out with a real Chrome handshake.
// The wrapper is installed by scripts/install-curl-impersonate.sh (part of
// `npm run build`). It is a Linux binary; on Windows dev machines it runs
// through WSL. The path stays relative because WSL maps the spawn cwd to
// /mnt/<drive>/… — the same relative path resolves on both sides.
const CURL_IMPERSONATE_WRAPPER = 'bin/curl-impersonate/curl_chrome146';
const CURL_IMPERSONATE_WRAPPER_ABS = path.resolve(process.cwd(), CURL_IMPERSONATE_WRAPPER);

const isWindows = process.platform === 'win32';
const CURL_COMMAND = isWindows ? 'wsl' : 'bash';
const CURL_BASE_ARGS = isWindows ? ['bash', CURL_IMPERSONATE_WRAPPER] : [CURL_IMPERSONATE_WRAPPER];

const BLADE_FETCH_ATTEMPTS = 3;
const BLADE_RETRY_DELAY_MS = 3000;

export const scrapeFabFree = async (): Promise<FabFreeItem[]> => {
  const payload = await fetchFabFreeBlade();
  return extractFabFreeItems(payload);
};

const fetchFabFreeBlade = async (): Promise<unknown> => {
  if (!existsSync(CURL_IMPERSONATE_WRAPPER_ABS)) {
    throw new Error(
      `curl-impersonate wrapper not found at ${CURL_IMPERSONATE_WRAPPER_ABS} — ` +
        'run scripts/install-curl-impersonate.sh (uses WSL on Windows).'
    );
  }
  let lastFailure = 'no fetch attempted';
  for (let attempt = 1; attempt <= BLADE_FETCH_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await delay(BLADE_RETRY_DELAY_MS);
    }
    try {
      return await fetchBladeOnce();
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`Fab blade fetch failed after ${BLADE_FETCH_ATTEMPTS} attempts: ${lastFailure}`);
};

const fetchBladeOnce = async (): Promise<unknown> => {
  const { stdout } = await execFileAsync(
    CURL_COMMAND,
    [
      ...CURL_BASE_ARGS,
      // -f turns HTTP errors into a non-zero exit; -S puts the status line on
      // stderr, which execFile includes in the thrown error.
      '-sSf',
      '--max-time',
      '30',
      '-H',
      'accept: application/json',
      FAB_FREE_BLADE_URL,
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  );
  const body = stdout.trim();
  if (!/^[[{]/.test(body)) {
    throw new Error(`blade endpoint returned non-JSON body starting with: ${body.slice(0, 200)}`);
  }
  return JSON.parse(body);
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
