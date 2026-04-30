# SCOR Claim888 Fast MVP

Fast deployable MVP for `scor.io/claim888`.

What is included:
- SCOR-styled one-page claim hub
- MetaMask connect
- Base App deep link
- WalletConnect hook with real QR flow support once `WALLETCONNECT_PROJECT_ID` is added
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
- `data/SCOR_Eligible addresses_888.xlsx` — local eligibility source
- `data/claims.json` — local claimed-state storage
- `scripts/start.sh` — launch script
- `scripts/test.sh` — backend test script
- `netlify/functions/` — Netlify serverless bridge

Run locally:
1. `cd ~/AI/SCOR/website/claim888`
2. optional: copy `.env.example` to `.env`
3. add `WALLETCONNECT_PROJECT_ID=...` to `.env` if you want WalletConnect QR flow
4. `./scripts/test.sh`
5. `./scripts/start.sh`
6. open `http://127.0.0.1:8123/claim888`

Environment variables:
- `CLAIM888_HOST` — bind host, default `0.0.0.0` in start script
- `CLAIM888_PORT` — bind port, default `8123`
- `WALLETCONNECT_PROJECT_ID` — required to enable full WalletConnect QR modal flow
- `PUBLIC_BASE_URL` — optional future public base URL hint for mobile deep links

How local `.env` works now:
- `.env` is auto-loaded by `scripts/start.sh`
- `server.py` also loads `.env` if present
- existing shell environment variables still win over `.env`

Production notes:
- this MVP expects a persistent server or VPS, not ephemeral serverless storage
- `data/claims.json` must survive restarts if you want claimed state to persist
- if production hosting is ephemeral, swap storage to Redis/KV
- replace `data/SCOR_Eligible addresses_888.xlsx` and restart/redeploy when the final list changes

Deploy today on a VPS / persistent server:
1. copy the `claim888` folder to the server
2. ensure Python 3 is installed
3. create `.env` or set env vars directly
4. run:
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

Netlify deploy checklist:
1. use this `claim888` folder as the repo root
2. set environment variable in Netlify UI:
   - `WALLETCONNECT_PROJECT_ID=...`
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
- MetaMask connect works
- Base App deep link works on a public HTTPS URL
- WalletConnect button shows QR modal if project id is set and the client library loads correctly
- eligibility check works for known address
- not eligible state works for unknown address
- claim writes to `claims.json` on VPS version
- repeated check shows already claimed

Known MVP tradeoffs:
- no social login yet
- rate limiting is in-memory, so it resets on process restart
- claimed state is file-based on VPS version
- Netlify claim state is currently in-memory only
- no analytics/Sentry yet
