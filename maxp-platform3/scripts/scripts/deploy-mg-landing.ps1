[CmdletBinding()]
param(
    [string]$Server = "root@mokhtarelhenawy.online",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $root "frontend"
$backendDir = Join-Path $root "backend"
$frontendDist = Join-Path $frontendDir "dist"
$backendRoute = Join-Path $backendDir "routes\\publicCustomerRoutes.js"

if (-not $SkipBuild) {
    Write-Host "Building frontend bundle..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed"
        }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $frontendDist)) {
    throw "Frontend dist folder not found: $frontendDist"
}

if (-not (Test-Path $backendRoute)) {
    throw "Backend route file not found: $backendRoute"
}

Write-Host "Ensuring remote target directories exist..." -ForegroundColor Yellow
ssh $Server "mkdir -p /var/www/frontend2/dist /var/www/backend2/routes"
if ($LASTEXITCODE -ne 0) {
    throw "SSH connection failed. Verify the SSH key is installed on the server."
}

Write-Host "Uploading frontend dist..." -ForegroundColor Yellow
scp -r "$frontendDist/." "${Server}:/var/www/frontend2/dist/"
if ($LASTEXITCODE -ne 0) {
    throw "Frontend upload failed"
}

Write-Host "Uploading MG lead route..." -ForegroundColor Yellow
scp $backendRoute "${Server}:/var/www/backend2/routes/publicCustomerRoutes.js"
if ($LASTEXITCODE -ne 0) {
    throw "Backend route upload failed"
}

Write-Host "Reloading backend service..." -ForegroundColor Yellow
ssh $Server "cd /var/www/backend2 && pm2 startOrReload ecosystem.config.js --env production && pm2 save"
if ($LASTEXITCODE -ne 0) {
    throw "PM2 reload failed"
}

Write-Host "MG landing deployment completed." -ForegroundColor Green
