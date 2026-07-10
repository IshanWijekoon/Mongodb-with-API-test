# ConvertHub — Temperature & Currency Converter

Spring Boot microservices + MongoDB for USD/LKR currency and temperature conversion, with a clean organic web UI.

## Features

- Currency conversion (USD → LKR) with MongoDB history
- Temperature conversion (Celsius, Fahrenheit, Kelvin) with history
- Safety check endpoint for heat warnings (Lab 04)
- Filtered temperature history by input unit (Lab 04)
- MongoDB-backed API key auth on all API endpoints (Lab 05)
- Google OAuth 2.0 login via auth-service (JWT) for the web UI + APIs
- Dockerized full stack (frontend + 2 APIs + 2 MongoDB instances)

## Architecture

```
Frontend (3000) ──┬── Auth Service (8083) ── Google OAuth + auth_db (27017)
                  ├── Temperature API (8081) ── MongoDB temp_db (27017)
                  └── Currency API (8082)   ── MongoDB currency_db (27018)

Docker: two MongoDB containers (ports 27017 + 27018)
Local mvnw: MongoDB on 27017 (temp_db + auth_db) and 27018 (currency_db)
```

| Service | Port | Notes |
|---------|------|-------|
| Frontend UI | 3000 | Requires Google sign-in |
| Auth Service | 8083 | Google OAuth + JWT issuer |
| Temperature API | 8081 | REST only — not the UI |
| Currency API | 8082 | REST only — not the UI |
| MongoDB (temp + auth) | 27017 | `temp_db`, `auth_db` |
| MongoDB (currency) | 27018 | `currency_db` + `api_keys` |

## Quick start (Docker)

**Recommended on Windows** — stops local MongoDB first so Docker can use port 27017:

```powershell
.\scripts\docker-up.ps1
```

Or manually:

```bash
docker compose up --build
```

Open **http://localhost:3000** for the UI.

Stop:

```bash
docker compose down
```

### Auto-stop local MongoDB when Docker Desktop opens

Local MongoDB and Docker both use port **27017**. To avoid conflicts, install the background watcher once:

```powershell
.\scripts\install-mongo-docker-sync.ps1
```

This registers a Windows scheduled task that:

- **Stops** the local `MongoDB` Windows service when Docker Desktop starts
- **Restarts** local MongoDB when you close Docker Desktop (if port 27017 is free)

Logs: `%LOCALAPPDATA%\ConvertHub\mongo-docker-sync.log`

To remove: `Unregister-ScheduledTask -TaskName 'ConvertHub-MongoDockerSync' -Confirm:$false`

If stopping the service fails, re-run the install script **as Administrator**, or use `.\scripts\mongo-docker-sync.ps1 -StopLocal` before `docker compose up`.

API keys are seeded automatically on startup (`mongo-seed` for Docker temp DB; both services auto-seed on `mvnw` start). Manual seeding:

```bash
mongosh mongodb://localhost:27017/temp_db docs/mongo-seed-api-keys.js
mongosh mongodb://localhost:27018/currency_db docs/mongo-seed-currency-api-keys.js
```

## Project layout

```
Mongodb-with-API-test/
├── auth-service/       # Google OAuth + JWT (8083)
├── tempconv/           # Temperature microservice (8081)
├── currencyconvertor/  # Currency microservice (8082)
├── frontend/           # Web UI
├── scripts/            # docker-up, mongo-docker-sync, install-mongo-docker-sync
├── docs/               # Lab PDFs, demo screenshot, Mongo seed script
└── docker-compose.yml
```

## Google OAuth 2.0 (local)

The browser UI requires Google sign-in. APIs accept **either** a valid Lab 05 `X-API-KEY` **or** a Bearer JWT from `auth-service`.

### 1. Google Cloud Console (one-time)

1. Create/select a Google Cloud project
2. Configure the **OAuth consent screen** (External / Testing; add your Google account as a test user)
3. Create credentials → **OAuth client ID** → Application type **Web application**
4. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:8083`
5. Authorized redirect URI:
   - `http://localhost:8083/login/oauth2/code/google`
6. Copy the **Client ID** and **Client Secret**

### 2. Environment variables

Set these before starting `auth-service` (and preferably the APIs, so JWT secrets match):

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET = "your-client-secret"
$env:JWT_SECRET = "change-me-local-dev-secret-min-32-chars!!"
```

Use the **same** `JWT_SECRET` for `auth-service`, `tempconv`, and `currencyconvertor`.

### 3. Auth endpoints

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/oauth2/authorization/google` | Start Google login |
| GET | `/api/auth/me` | `Authorization: Bearer <jwt>` |
| GET | `/api/auth/health` | Public health check |

After Google login, auth-service redirects to:

```text
http://localhost:3000/?token=<jwt>
```

## API reference

Temperature and currency endpoints accept **either**:

- `X-API-KEY` header (Lab 05 curl demos), **or**
- `Authorization: Bearer <jwt>` from Google login

The web UI sends **both** after sign-in.
### Temperature (`8081`)

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/` | `X-API-KEY` header |
| GET | `/api/temperatures/safety-check?value=&unit=` | `X-API-KEY` header |
| GET | `/api/temperatures/history` | `X-API-KEY` header |
| GET | `/api/temperatures/history/filter?unit=` | `X-API-KEY` header |
| POST | `/api/temperatures/convert?value=&unit=` | `X-API-KEY` header |

### Currency (`8082`)

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/` | `X-API-KEY` header |
| POST | `/api/currency/convert?usdAmount=` | `X-API-KEY` header |
| GET | `/api/currency/history` | `X-API-KEY` header |

### Lab 04 — Safety check & filtered history

```bash
curl "http://localhost:8081/api/temperatures/safety-check?value=102&unit=F" \
  -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
# → Warning: 102.0°F is dangerously HOT! Stay hydrated.

curl "http://localhost:8081/api/temperatures/safety-check?value=21&unit=C" \
  -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
# → The temperature is comfortable and safe.

curl "http://localhost:8081/api/temperatures/history/filter?unit=celsius" \
  -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
# → JSON array of Celsius logs only
```

### Lab 05 — API key auth (both services)

```bash
# Test 1: Missing key → 401
curl "http://localhost:8081/api/temperatures/history"
curl "http://localhost:8082/api/currency/history"

# Test 2: Inactive key → 401
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" \
  -H "X-API-KEY: EXPIRED-HACKER-KEY-999"
curl -X POST "http://localhost:8082/api/currency/convert?usdAmount=100" \
  -H "X-API-KEY: EXPIRED-HACKER-KEY-999"

# Test 3: Valid key → 200
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" \
  -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
curl -X POST "http://localhost:8082/api/currency/convert?usdAmount=100" \
  -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
```

Seeded keys in `api_keys` (in both `temp_db` and `currency_db`):

| Key | clientName | Active |
|-----|------------|--------|
| `SUPER-SECRET-DEV-KEY-123` | Frontend-Web-App | yes |
| `EXPIRED-HACKER-KEY-999` | Suspicious-Client | no |

## Local run (without Docker)

**Prerequisites:** Java 21+, MongoDB 6+ on ports **27017** and **27018**

| Port | Database | Used by | Collections |
|------|----------|---------|-------------|
| 27017 | `temp_db` | Temperature API (8081) | `conversions`, `api_keys` |
| 27017 | `auth_db` | Auth Service (8083) | `users` |
| 27018 | `currency_db` | Currency API (8082) | `currencyLog`, `api_keys` |

> **Note:** Do not use the `test` database from older projects. This app reads/writes `temp_db` and `currency_db` only.

API keys are **auto-seeded** when each service starts. Manual seeding is optional:

```bash
mongosh mongodb://localhost:27017/temp_db docs/mongo-seed-api-keys.js
mongosh mongodb://localhost:27018/currency_db docs/mongo-seed-currency-api-keys.js
```

### Currency MongoDB on port 27018 (local mvnw)

The currency API connects to **`mongodb://localhost:27018/currency_db`**. Start MongoDB on 27018 before running `currencyconvertor`:

**Option A — Project script (recommended):**

```powershell
.\scripts\setup-local-currency-mongo.ps1
```

This starts MongoDB on **27018** and moves `currency_db` off **27017** (where it may have landed earlier).

**Option B — Start 27018 only:**

```powershell
.\scripts\start-mongo-currency.ps1
```

**Option C — Manual second `mongod`:**

```powershell
mkdir C:\data\db-currency
mongod --port 27018 --dbpath C:\data\db-currency
```

### Start everything (4 terminals)

Set Google + JWT env vars in the auth-service terminal (and the same `JWT_SECRET` in the API terminals if you override the default).

**Terminal 1 — Temperature API (8081):**
```powershell
cd tempconv
.\mvnw.cmd spring-boot:run
```

**Terminal 2 — Currency API (8082):**
```powershell
cd currencyconvertor
.\mvnw.cmd spring-boot:run
```

**Terminal 3 — Auth Service (8083):**
```powershell
cd auth-service
$env:GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET = "your-client-secret"
$env:JWT_SECRET = "change-me-local-dev-secret-min-32-chars!!"
.\mvnw.cmd spring-boot:run
```

**Terminal 4 — Frontend:**
```powershell
cd frontend
python -m http.server 3000
```

Open **http://localhost:3000**, click **Sign in with Google**, then use the converters.

Lab 05 curl tests still work with API key only (no Google login required for curl).

Opening `index.html` directly also works for local APIs — the UI targets `localhost` — but you still need auth-service running for Google login.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401 Missing X-API-KEY` | Request without API key header | Use frontend or add `-H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"` |
| `401 Invalid or inactive API key` | Keys missing from `temp_db` or `currency_db` | Restart the service (auto-seeds) or run mongosh seed scripts |
| `Connection refused` on 8081/8082 | Service not running | Start both `tempconv` and `currencyconvertor` |
| Currency fails, temp works | MongoDB not on 27018, or `currency_db` still on 27017 | Run `.\scripts\setup-local-currency-mongo.ps1`, then restart `currencyconvertor` |
| Google sign-in fails | Missing Client ID/Secret or wrong redirect URI | Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; redirect must be `http://localhost:8083/login/oauth2/code/google` |
| UI stuck on login gate | Auth service down or invalid JWT | Start `auth-service` on 8083; Sign out and sign in again |
| History empty in Compass | Wrong database | Check `temp_db` / `currency_db` / `auth_db`, not `test` |
| Frontend hits wrong API | Opened without local server | Use `http://localhost:3000` or ensure APIs are on 8081/8082 |

### Quick API tests

```powershell
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
curl -X POST "http://localhost:8082/api/currency/convert?usdAmount=100" -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
```

## Tech stack

Spring Boot 4 · Java 21 · MongoDB · HTML/CSS/JS · Docker · Cloudflare Pages
