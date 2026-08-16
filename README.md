# Unity Sales Discord Bot (Backend)

_Important: this project is meant to run alongside the frontend. Grab both repos._
_Frontend repo: https://github.com/AleixFerre/unity-sales-discord-bot-frontend_

Discord bot + HTTP API for posting game-dev promo embeds (Unity Asset Store sales,
Fab limited-time-free assets) to registered Discord channels. The frontend composes
the embeds; this backend scrapes store data on demand and relays the finished
message to every channel registered with `/register`.

## Requirements

- Node.js 18+
- Bun or npm
- A Discord bot token

## Install

```bash
cd unity-sales-discord-bot
bun install
```

If you prefer npm:

```bash
npm install
```

## Configure

Copy the template and fill the values:

```bash
cp .env.template .env
```

Key variables:

- `TOKEN`: Discord bot token
- `CLIENT_ID`: Discord application client ID
- `API_PORT` or `PORT`: HTTP API port (default 3000)
- `API_TOKEN`: Bearer token required by the HTTP API
- `ALLOWED_ORIGINS`: comma-separated CORS origins
- `DATABASE_URL`: Postgres connection string (required)

## Run locally

```bash
bun run dev
```

This starts the bot and the HTTP API once the bot is ready.

## Build and run (production)

```bash
npm run build
npm start
```

The build also downloads the [curl-impersonate](https://github.com/lexiforest/curl-impersonate)
CLI into `bin/curl-impersonate/` (Linux x86_64 binary). The `/fab/free` and `/assetstore/list`
endpoints require it: Fab sits behind Cloudflare TLS-fingerprint checks that plain HTTP clients
cannot pass, so both scrapers shell out to curl-impersonate for a browser-fingerprinted request
(several fingerprints are tried until one returns a usable body).

On Windows dev machines the same binary is used through WSL — run
`bash scripts/install-curl-impersonate.sh` once from the package root (it delegates the
download to WSL), and the scrapers automatically invoke it via `wsl`. Without WSL, those two
endpoints return 502 with a clear error; the rest of the bot works normally.

`/assetstore/scrape` is the one endpoint still driven by a headless browser (Puppeteer):
single `/packages/` and `/listings/` pages need the client-side render to expose their data,
while list pages are server-rendered and parse straight from the fetched HTML.

## Slash commands

- `/register` (admin): toggles the current channel in the notification list
- `/ping`: replies "Pong!"

## HTTP API

The API listens on `API_PORT`/`PORT`. If `API_TOKEN` is set, requests must include
`Authorization: Bearer <token>`.

Endpoints:

- `POST /message` — sends the embeds to every registered channel (no `channelId`
  required; messages go to all channels stored in the DB):

```json
{
  "embeds": [
    {
      "title": "Offer",
      "color": 3447003,
      "url": "https://assetstore.unity.com/packages/...",
      "fields": [{ "name": "Preu", "value": "~~€19.99~~ GRATIS", "inline": true }],
      "footer": { "text": "GameDev Sales Bot" },
      "images": [{ "url": "https://example.com/banner.png" }],
      "thumbnail": { "url": "https://example.com/thumb.png" }
    }
  ]
}
```

An embed may carry up to 4 `images`. Two or more are merged server-side into a
single 1200x800 collage that is uploaded as an attachment. Set `"collage": false`
on the embed to opt out; the images are then sent as additional embeds sharing the
embed `url`, which Discord renders as its own image gallery. The same gallery is
used automatically whenever the collage cannot be built.

- `GET /fab/free` — scrapes Fab's limited-time-free blade and returns
  `{ "items": [{ "title", "imageUrl", "price", "freeUntil", "url" }] }`.
- `GET /assetstore/scrape?url=<listing>` — scrapes a single Unity Asset Store
  (`/packages/...`) or Fab (`/listings/...`) listing and returns
  `{ "title", "imageUrl", "price" }`.
- `GET /assetstore/list?url=<list>` — scrapes a Unity Asset Store list page
  (`/lists/...`) and returns `{ "title", "imageUrls": [] }` with the first
  four item images.

Example:

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"embeds":[{"title":"Offer","color":3447003}]}'
```

## Deploy

1. Set all required environment variables on your host.
2. Build and run:

```bash
npm run build
npm start
```

3. Ensure the bot can reach Discord and your HTTP API port is exposed.
4. Update the frontend `backendUrl` (in its `src/app/config.json`) to point at `https://your-host`.

## Project Structure

- `src/index.ts` entry point
- `src/bot/` Discord client setup and handlers
- `src/api/` HTTP API server, routes, controllers, and services

## Troubleshooting

- Bot is online but not posting: run `/register` in the target channel and confirm the bot's permissions
- 401 from API: confirm `API_TOKEN` and Authorization header
- 502 from `POST /message`: no registered channel could be reached — check the `channels` table and bot access

## License

[LICENSE](LICENSE)

## Related repos

- https://github.com/AleixFerre/unity-sales-discord-bot
- https://github.com/AleixFerre/unity-sales-discord-bot-frontend
