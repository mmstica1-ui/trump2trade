# Trump2Trade — Quickstart

## 1) Telegram
- Create a bot via @BotFather and copy the token.
- Get your chat id via @userinfobot.

## 2) IBKR Gateway
- Run IBeam (Docker) on a VPS/home machine.
- Login once (paper first). Ensure `/v1/api/iserver/auth/status` shows authenticated.
- Set IBKR_BASE_URL in `.env` to your gateway URL.

## 3) Apify
- Use a Truth Social scraper actor.
- Schedule every 1 minute.
- Add webhook to `https://<your-app>.up.railway.app/webhook/apify?secret=<APIFY_WEBHOOK_SECRET>`.

## 4) Railway
- Push this repo to GitHub.
- Create a new Railway project from repo.
- Set environment variables from `.env.example`.
- Deploy → copy the public URL.

## 5) Test
- `GET /healthz` should return `{ ok: true }`.
- `POST /dev/mock` with `{ "text": "Tariffs removed on chips", "url": "https://truth.social/mock" }`.
- You should receive a Telegram alert with trade buttons.

## 6) Run
- `npm install`
- `npm run build`
- `npm start`

## Notes
- Start with paper trading.
- You can switch market orders to limit-at-mid later.
- Add DB (e.g., Postgres) if you want long-term stats and P&L.
