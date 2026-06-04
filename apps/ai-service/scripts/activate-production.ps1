# ==============================================
# Activate AI Service in Production
# Run this on the production server as root
# ==============================================
# 1. Copy production env
$aiDir = "/opt/maxp-ai-service"
$beDir = "/opt/maxp-platform/apps/backend"

Write-Host "=== Activating AI Service ===" -ForegroundColor Green

# 2. Restart AI Service (Docker)
Write-Host "Restarting AI service..." -ForegroundColor Yellow
Set-Location $aiDir
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
Write-Host "Waiting for AI service..." -ForegroundColor Yellow
Start-Sleep 5

# 3. Health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 10
    if ($health.status -eq "ok") {
        Write-Host "AI Service: OK ($($health.version))" -ForegroundColor Green
    }
} catch {
    Write-Host "AI Service health check FAILED: $_" -ForegroundColor Red
    exit 1
}

# 4. Ready check (LLM provider)
try {
    $ready = Invoke-RestMethod -Uri "http://localhost:8000/ready" -TimeoutSec 10
    Write-Host "AI Service ready: $($ready.status) ($($ready.provider))" -ForegroundColor Green
} catch {
    Write-Host "AI Service ready check FAILED: $_" -ForegroundColor Yellow
}

# 5. Check backend AI_SERVICE_MODE
$backendEnv = "$beDir/.env"
if (Test-Path $backendEnv) {
    $mode = Select-String -Path $backendEnv -Pattern "AI_SERVICE_MODE"
    Write-Host "Backend AI_SERVICE_MODE: $mode" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. Set AI_SERVICE_MODE=pilot in backend .env"
Write-Host "  2. Set AI_SERVICE_URL=http://localhost:8000"
Write-Host "  3. Restart backend: pm2 restart maxp-backend"
Write-Host "  4. Test: curl http://localhost:8000/health"
