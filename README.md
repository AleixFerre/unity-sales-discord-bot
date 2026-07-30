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
CLI into `bin/curl-impersonate/` (Linux x86_64 binary). The `/fab/free` endpoint requires it:
Fab sits behind Cloudflare TLS-fingerprint checks that plain HTTP clients cannot pass, so the
scraper shells out to curl-impersonate for a Chrome-fingerprinted request.

On Windows dev machines the same binary is used through WSL — run
`bash scripts/install-curl-impersonate.sh` once from the package root (it delegates the
download to WSL), and the scraper automatically invokes it via `wsl`. Without WSL,
`/fab/free` returns 502 with a clear error; the rest of the bot works normally.

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

An embed may carry up to 4 `images`; when it also has a `url`, the extra images
are sent as additional embeds sharing that URL, which Discord renders as a
single image gallery.

- `GET /fab/free` — scrapes Fab's limited-time-free blade and returns
  `{ "items": [{ "title", "imageUrl", "price", "freeUntil", "url" }] }`.
- `GET /assetstore/scrape?url=<listing>` — scrapes a single Unity Asset Store
  (`/packages/...`) or Fab (`/listings/...`) listing and returns
  `{ "title", "imageUrl", "price" }`.
- `GET /assetstore/list?url=<list>` — scrapes a Unity Asset Store list page
  (`/lists/...`) and returns `{ "title", "imageUrls": [] }` with the first
  three item images.

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
