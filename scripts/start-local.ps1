# ConvertHub — Local development checklist (Windows)
# Run from project root: .\scripts\start-local.ps1

$root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "ConvertHub — Local mvnw setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  - MongoDB on localhost:27017 (temp_db)"
Write-Host "  - MongoDB on localhost:27018 (currency_db)"
Write-Host "  - Java 21+"
Write-Host ""
Write-Host "Open 3 separate terminals and run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 — Temperature API (port 8081):" -ForegroundColor Green
Write-Host "  cd `"$root\tempconv`""
Write-Host "  .\mvnw.cmd spring-boot:run"
Write-Host ""
Write-Host "Terminal 2 — Currency API (port 8082):" -ForegroundColor Green
Write-Host "  cd `"$root\currencyconvertor`""
Write-Host "  .\mvnw.cmd spring-boot:run"
Write-Host ""
Write-Host "Terminal 3 — Frontend (port 3000):" -ForegroundColor Green
Write-Host "  cd `"$root\frontend`""
Write-Host "  python -m http.server 3000"
Write-Host ""
Write-Host "Then open: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "API keys are auto-seeded when tempconv starts." -ForegroundColor DarkGray
Write-Host "Check Compass: temp_db -> api_keys (2 documents)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Quick tests (after services are up):" -ForegroundColor Yellow
Write-Host '  curl -X POST "http://localhost:8081/api/temperatures/convert?value=25&unit=celsius" -H "X-API-KEY: SUPER-SECRET-DEV-KEY-123"'
Write-Host '  curl -X POST "http://localhost:8082/api/currency/convert?usdAmount=100"'
Write-Host ""
