# SCOR Claim888 Fast MVP

Fast deployable MVP for `scor.io/claim888`.

What is included:
- SCOR-styled one-page claim hub
- Privy-based wallet connect flow with embedded wallet creation
- Base network enforcement
- server-side XLSX eligibility lookup
- decorative claim flow
- claimed persistence via local JSON file
- basic in-memory rate limiting

Project structure:
- `backend.py` — eligibility + claim logic
- `config.py` — local `.env` loader
- `server.py` — lightweight HTTP server
- `static/` — HTML/CSS/JS frontend and logo asset
- `static/vendor/privy.bundle.js` — browser bundle for Privy integration
- `data/SCOR_Eligible addresses_888.xlsx` — local eligibility source
- `data/claims.json` — local claimed-state storage
- `scripts/build-privy.sh` — build Privy browser bundle
- `scripts/start.sh` — launch script
- `scripts/test.sh` — backend/build test script
- `netlify/functions/` — Netlify serverless bridge

Run locally:
1. `cd ~/AI/SCOR/website/claim888`
2. optional: copy `.env.example` to `.env`
3. add `PRIVY_APP_ID=...` to `.env`
4. optional: add `PRIVY_CLIENT_ID=...` if your Privy app uses app clients
5. `npm install`
6. `./scripts/test.sh`
7. `./scripts/start.sh`
8. open `http://127.0.0.1:8123/claim888`

Environment variables:
- `CLAIM888_HOST` — bind host, default `0.0.0.0` in start script
- `CLAIM888_PORT` — bind port, default `8123`
- `PRIVY_APP_ID` — required to enable Privy login and embedded wallet creation
- `PRIVY_CLIENT_ID` — optional/required depending on your Privy dashboard app-client setup
- `PUBLIC_BASE_URL` — optional future public base URL hint for mobile deep links

How local `.env` works now:
- `.env` is auto-loaded by `scripts/start.sh`
- `server.py` also loads `.env` if present
- existing shell environment variables still win over `.env`

Privy notes:
- this implementation uses the low-level `@privy-io/js-sdk-core` browser bundle
- it signs users in with `guest.create(...)`
- it requests an embedded Ethereum wallet on login when needed
- the app expects that your Privy app is configured for Base / embedded Ethereum wallets
- if your Privy dashboard requires app clients, set `PRIVY_CLIENT_ID`

Production notes:
- this MVP expects a persistent server or VPS, not ephemeral serverless storage
- `data/claims.json` must survive restarts if you want claimed state to persist
- if production hosting is ephemeral, swap storage to Redis/KV
- replace `data/SCOR_Eligible addresses_888.xlsx` and restart/redeploy when the final list changes

Deploy today on a VPS / persistent server:
1. copy the `claim888` folder to the server
2. ensure Python 3 and Node/npm are installed
3. create `.env` or set env vars directly
4. run:
   - `npm install`
   - `./scripts/test.sh`
   - `./scripts/start.sh`
5. put nginx or caddy in front and proxy `/claim888`, `/api/claim888/`, `/api/config`, and `/logo/scor-logo-dark.svg` to the Python server

Suggested nginx location block:

```nginx
location /claim888 {
  proxy_pass http://127.0.0.1:8123/claim888;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

location /claim888/ {
  proxy_pass http://127.0.0.1:8123/claim888/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

location /api/claim888/ {
  proxy_pass http://127.0.0.1:8123/api/claim888/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

location /api/config {
  proxy_pass http://127.0.0.1:8123/api/config;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

location /logo/scor-logo-dark.svg {
  proxy_pass http://127.0.0.1:8123/logo/scor-logo-dark.svg;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

Netlify deployment support added:
- `netlify.toml` in project root
- static publish dir: `static`
- serverless functions dir: `netlify/functions`
- `package.json` includes Netlify-side dependency

Important Netlify tradeoff:
- current Netlify version uses in-memory claim state inside functions
- that means claimed state is NOT durable across cold starts/redeploys
- for production you should replace claim storage with KV/Redis/Supabase/Firebase/etc.
- eligibility lookup from XLSX works in the Netlify bridge
- for Netlify builds using Privy, ensure the build step runs `./scripts/build-privy.sh` or commit the generated `static/vendor/privy.bundle.js`

Netlify deploy checklist:
1. use this `claim888` folder as the repo root
2. set environment variables in Netlify UI:
   - `PRIVY_APP_ID=...`
   - optional `PRIVY_CLIENT_ID=...`
3. run install:
   - `npm install`
4. deploy
5. test:
   - `/claim888`
   - `/api/config`
   - `/api/claim888/check`
   - `/api/claim888/claim`

Production smoke test checklist:
- page opens at `/claim888`
- `curl /healthz-claim888` returns `{ ok: true }` on VPS version
- logo loads
- footer links work
- Privy modal / guest login works
- embedded wallet is created on Base
- eligibility check works for known address
- not eligible state works for unknown address
- claim writes to `claims.json` on VPS version
- repeated check shows already claimed

Known MVP tradeoffs:
- no social login yet
- Privy integration uses the low-level JS SDK rather than the React SDK
- rate limiting is in-memory, so it resets on process restart
- claimed state is file-based on VPS version
- Netlify claim state is currently in-memory only
- no analytics/Sentry yet
