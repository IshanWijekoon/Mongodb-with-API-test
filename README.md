# ConvertHub — Temperature & Currency Converter

Spring Boot microservices + MongoDB for USD/LKR currency and temperature conversion, with a clean organic web UI.

## Features

- Currency conversion (USD → LKR) with MongoDB history
- Temperature conversion (Celsius, Fahrenheit, Kelvin) with history
- Safety check endpoint for heat warnings (Lab 04)
- Filtered temperature history by input unit (Lab 04)
- MongoDB-backed API key auth on temperature convert (Lab 05)
- Dockerized full stack (frontend + 2 APIs + 2 MongoDB instances)

## Architecture

```
Frontend (3000) ──┬── Temperature API (8081) ── MongoDB temp_db (27017)
                  └── Currency API (8082)   ── MongoDB currency_db (27018)
```

| Service | Port | Notes |
|---------|------|-------|
| Frontend UI | 3000 | Open this in the browser |
| Temperature API | 8081 | REST only — not the UI |
| Currency API | 8082 | REST only — not the UI |
| MongoDB (temp) | 27017 | `temp_db` + `api_keys` |
| MongoDB (currency) | 27018 | `currency_db` |

## Quick start (Docker)

```bash
docker compose up --build
```

Open **http://localhost:3000** for the UI.

Stop:

```bash
docker compose down
```

API keys are seeded automatically on startup via `mongo-seed`. To re-seed manually:

```bash
mongosh mongodb://localhost:27017/temp_db docs/mongo-seed-api-keys.js
```

## Project layout

```
Mongodb-with-API-testX/
├── tempconv/           # Temperature microservice (8081)
├── currencyconvertor/  # Currency microservice (8082)
├── frontend/           # Web UI
├── scripts/            # Local dev helpers (start-local, verify-mongo, etc.)
├── docs/               # Lab PDFs, demo screenshot, Mongo seed script
└── docker-compose.yml
```

## API reference

### Temperature (`8081`)

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/temperatures/safety-check?value=&unit=` | None |
| GET | `/api/temperatures/history` | None |
| GET | `/api/temperatures/history/filter?unit=` | None |
| POST | `/api/temperatures/convert?value=&unit=` | `X-API-KEY` header |

### Currency (`8082`)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/currency/convert?usdAmount=` | None |
| GET | `/api/currency/history` | None |

### Lab 04 — Safety check & filtered history

```bash
curl "http://localhost:8081/api/temperatures/safety-check?value=102&unit=F"
# → Warning: 102.0°F is dangerously HOT! Stay hydrated.

curl "http://localhost:8081/api/temperatures/safety-check?value=21&unit=C"
# → The temperature is comfortable and safe.

curl "http://localhost:8081/api/temperatures/history/filter?unit=celsius"
# → JSON array of Celsius logs only
```

### Lab 05 — API key on convert

```bash
# Missing key → 401
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius"

# Invalid/inactive key → 401
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" \
  -H "X-API-KEY: EXPIRED-HACKER-KEY-999"

# Valid key → 200
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" \
  -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
```

Seeded keys in the `api_keys` collection:

| Key | Active |
|-----|--------|
| `SUPER-SECRET-DEV-KEY-123` | yes |
| `EXPIRED-HACKER-KEY-999` | no |

## Local run (without Docker)

**Prerequisites:** Java 21+, MongoDB 6+ on ports **27017** and **27018**

| MongoDB port | Database | Used by |
|--------------|----------|---------|
| 27017 | `temp_db` | Temperature API — collections: `conversions`, `api_keys` |
| 27018 | `currency_db` | Currency API — conversion history |

> **Note:** Do not use the `test` database from older projects. This app reads/writes `temp_db` and `currency_db` only.

API keys are **auto-seeded** when `tempconv` starts. Manual seeding is optional:

```bash
mongosh mongodb://localhost:27017/temp_db docs/mongo-seed-api-keys.js
```

### Set up currency MongoDB (port 27018)

The currency API expects MongoDB on **port 27018** with database **`currency_db`**. You do not create the database manually — MongoDB creates `currency_db` automatically on the first successful currency conversion.

**Option A — Docker (recommended):**

```powershell
docker compose up -d mongo-currency
# or
.\scripts\start-mongo-currency.ps1
```

**Option B — Second local `mongod` (no Docker):**

```powershell
mkdir C:\data\db-currency
mongod --port 27018 --dbpath C:\data\db-currency
```

Keep that terminal open. Your existing MongoDB on **27017** continues to serve `temp_db`.

**Verify both instances:**

```powershell
.\scripts\verify-mongo.ps1
```

Or manually:

```powershell
mongosh mongodb://localhost:27017/temp_db --eval "db.runCommand({ ping: 1 })"
mongosh mongodb://localhost:27018/currency_db --eval "db.runCommand({ ping: 1 })"
```

**Compass:** add connection `mongodb://localhost:27018` — after converting, open `currency_db` → `currencyLog` collection.

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
| `401 Invalid or inactive API key` | Keys missing from `temp_db` | Restart `tempconv` (auto-seeds) or run mongosh seed script |
| `Connection refused` on 8081/8082 | Service not running | Start both `tempconv` and `currencyconvertor` |
| Currency fails, temp works | MongoDB not on 27018 | Run `.\scripts\start-mongo-currency.ps1` or `docker compose up -d mongo-currency` |
| History empty in Compass | Wrong database | Check `temp_db` / `currency_db`, not `test` |
| Frontend hits wrong API | Opened without local server | Use `http://localhost:3000` or ensure APIs are on 8081/8082 |

### Quick API tests

```powershell
curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"
curl -X POST "http://localhost:8082/api/currency/convert?usdAmount=100"
```

## Tech stack

Spring Boot 4 · Java 21 · MongoDB · HTML/CSS/JS · Docker · Cloudflare Pages
