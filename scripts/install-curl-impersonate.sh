#!/usr/bin/env bash
set -euo pipefail

# Downloads the curl-impersonate CLI used by fabFreeScraper as its primary
# fetch path (Chrome TLS fingerprint gets past Cloudflare where plain HTTP
# clients are challenged). Linux x86_64 only — on other platforms (local dev)
# this is a no-op and the scraper falls back to puppeteer.

VERSION="v1.5.6"
DEST="bin/curl-impersonate"
WRAPPER="curl_chrome146"

# On Windows (git-bash) the Linux binary still works for local dev by running
# it through WSL — delegate this install there. Must be run from the package
# root (DEST is relative).
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    if command -v wsl.exe >/dev/null 2>&1; then
      echo "curl-impersonate: delegating install to WSL"
      exec wsl.exe bash scripts/install-curl-impersonate.sh
    fi
    echo "curl-impersonate: skipping install (Windows without WSL — /fab/free will not work locally)"
    exit 0
    ;;
esac

if [ "$(uname -s)" != "Linux" ] || [ "$(uname -m)" != "x86_64" ]; then
  echo "curl-impersonate: skipping install ($(uname -s)/$(uname -m) is not Linux/x86_64)"
  exit 0
fi

if [ -x "$DEST/curl-impersonate" ] && [ -f "$DEST/$WRAPPER" ]; then
  echo "curl-impersonate: already installed in $DEST"
  exit 0
fi

URL="https://github.com/lexiforest/curl-impersonate/releases/download/${VERSION}/curl-impersonate-${VERSION}.x86_64-linux-gnu.tar.gz"
mkdir -p "$DEST"
curl -fsSL "$URL" | tar -xz -C "$DEST" curl-impersonate "$WRAPPER"
chmod +x "$DEST/curl-impersonate" "$DEST/$WRAPPER"
echo "curl-impersonate: installed ${VERSION} to $DEST"
