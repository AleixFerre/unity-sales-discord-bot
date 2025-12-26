# Unity Sales Discord Bot

Discord bot that monitors Unity Asset Store promotions and posts alerts for:

- free assets
- strong discounts
- coupon codes
- good-value bundles and limited-time deals

## Features

- Automatic sale detection with configurable thresholds
- Separate channels or role pings per alert type
- Deduping to avoid repeat notifications
- Simple config via environment variables

## Requirements

- Node.js 18+
- Bun (recommended) or npm
- A Discord bot token

## Setup

1. Clone and install dependencies

   - Bun: `bun install`
   - npm: `npm install`

2. Create a Discord bot and invite it to your server

   - Create an application in the Discord Developer Portal
   - Add a bot and copy the token
   - Invite with the appropriate permissions (Send Messages, Embed Links)

3. Configure environment variables

   Copy the template and edit the values:

   ```
   cp .env.template .env
   ```

   `.env` template:

   ```
   TOKEN="token"
   CLIENT_ID="client_id"
   DEFAULT_GUILD_ID="default_guild_id"
   OWNER_ID="owner_id"
   PREFIX="!"
   ```

4. Run the bot
   - Bun: `bun run src/index.ts`
   - npm: `npm run start`

## How It Works

- Polls Unity Asset Store promotions on an interval
- Classifies promotions into free, discount, coupon, and deal buckets
- Sends a message embed to the configured channel(s)
- Skips items already announced

## Configuration Notes

- If a specific alert channel is not set, the bot falls back to `ALERT_CHANNEL_ID`
- `MIN_DISCOUNT_PERCENT` filters low-value discounts
- Add role IDs in your config if you want pings (see `src/index.ts` for wiring)

## Development

- `bun run dev` for watch mode (if configured)
- `bun run lint` for linting (if configured)

## Project Structure

- `src/index.ts` entry point
- `src/base/CustomClient.ts` Discord client setup
- `src/base/handlers/events/` event handlers

## Troubleshooting

- Bot is online but not posting: confirm channel IDs and permissions
- No alerts: check the polling interval and discount threshold

## License
MIT
