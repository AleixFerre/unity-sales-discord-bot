# Unity Sales Discord Bot (Backend)
_Important: this project is meant to run alongside the frontend. Grab both repos._
_Frontend repo: https://github.com/AleixFerre/unity-sales-discord-bot-frontend_

Discord bot that monitors Unity Asset Store promotions and posts alerts for:

- free assets
- strong discounts
- coupon codes
- good-value bundles and limited-time deals

Includes an optional HTTP API so the frontend can send custom embeds to a channel.

## Requirements

- Node.js 18+
- Bun or npm
- A Discord bot token

## Install

```bash
cd unity-sales-backend
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
- `OWNER_ID`: Discord user ID that owns/admins the bot
- `API_PORT` or `PORT`: HTTP API port (default 3000)
- `API_TOKEN`: Bearer token required by the HTTP API
- `ALLOWED_ORIGINS`: comma-separated CORS origins
- `DATABASE_URL`: Postgres connection string (required if database features are enabled)

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

## HTTP API

The API listens on `API_PORT`/`PORT`. If `API_TOKEN` is set, requests must include
`Authorization: Bearer <token>`.

Endpoint:

- `POST /message`

Body:

```json
{
  "channelId": "123456789012345678",
  "content": "hello",
  "embed": {
    "title": "Offer",
    "description": "50% off",
    "color": 3447003
  }
}
```

Example:

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"channelId":"123456789012345678","content":"hello","embed":{"title":"Offer","description":"50% off","color":3447003}}'
```

## Deploy

1. Set all required environment variables on your host.
2. Build and run:

```bash
npm run build
npm start
```

3. Ensure the bot can reach Discord and your HTTP API port is exposed.
4. Update the frontend `BACKEND_URL` to point at `https://your-host/message`.

## Project Structure

- `src/index.ts` entry point
- `src/bot/` Discord client setup and handlers
- `src/api/` HTTP API server, routes, controllers, and services

## Troubleshooting

- Bot is online but not posting: confirm channel IDs and permissions
- No alerts: check the polling interval and discount threshold
- 401 from API: confirm `API_TOKEN` and Authorization header

## License

[LICENSE](LICENSE)

## Related repos

- https://github.com/AleixFerre/unity-sales-discord-bot
- https://github.com/AleixFerre/unity-sales-discord-bot-frontend
