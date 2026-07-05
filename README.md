# ConvertHub — Temperature & Currency Converter

Spring Boot microservices + MongoDB for USD/LKR currency and temperature conversion, with a clean organic web UI.

## Features

- Currency conversion (USD → LKR) with MongoDB history
- Temperature conversion (Celsius, Fahrenheit, Kelvin) with history
- Safety check endpoint for heat warnings (Lab 04)
- Filtered temperature history by input unit (Lab 04)
- MongoDB-backed API key auth on all API endpoints (Lab 05)
- Dockerized full stack (frontend + 2 APIs + 2 MongoDB instances)

## Architecture

```
Frontend (3000) ──┬── Temperature API (8081) ── MongoDB temp_db
                  └── Currency API (8082)   ── MongoDB currency_db

Docker: two MongoDB containers (ports 27017 + 27018)
Local mvnw: MongoDB on 27017 (temp_db) and 27018 (currency_db)
```

| Service | Port | Notes |
|---------|------|-------|
| Frontend UI | 3000 | Open this in the browser |
| Temperature API | 8081 | REST only — not the UI |
| Currency API | 8082 | REST only — not the UI |
| MongoDB (temp) | 27017 | `temp_db` + `api_keys` |
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
Mongodb-with-API-testX/
├── tempconv/           # Temperature microservice (8081)
├── currencyconvertor/  # Currency microservice (8082)
├── frontend/           # Web UI
├── scripts/            # docker-up, mongo-docker-sync, install-mongo-docker-sync
├── docs/               # Lab PDFs, demo screenshot, Mongo seed script
└── docker-compose.yml
```

## API reference

All endpoints on both services require the `X-API-KEY` HTTP header (including `GET /`).

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

### Start everything (3 terminals)

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

**Terminal 3 — Frontend:**
```powershell
cd frontend
python -m http.server 3000
```

Open **http://localhost:3000** (recommended). Opening `index.html` directly also works — the UI targets `localhost` APIs.

Or run `.\scripts\start-local.ps1` from the project root for a copy-paste checklist.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401 Missing X-API-KEY` | Request without API key header | Use frontend or add `-H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"` |
| `401 Invalid or inactive API key` | Keys missing from `temp_db` or `currency_db` | Restart the service (auto-seeds) or run mongosh seed scripts |
| `Connection refused` on 8081/8082 | Service not running | Start both `tempconv` and `currencyconvertor` |
| Currency fails, temp works | MongoDB not on 27018, or `currency_db` still on 27017 | Run `.\scripts\setup-local-currency-mongo.ps1`, then restart `currencyconvertor` |
| History empty in Compass | Wrong database | Check `temp_db` / `currency_db`, not `test` |
| Frontend hits wrong API | Opened without local server | Use `http://localhost:3000` or ensure APIs are on 8081/8082 |

### Quick API tests

```powershell
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
curl -X POST "http://localhost:8082/api/currency/convert?usdAmount=100" -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
```

## Tech stack

Spring Boot 4 · Java 21 · MongoDB · HTML/CSS/JS · Docker · Cloudflare Pages
