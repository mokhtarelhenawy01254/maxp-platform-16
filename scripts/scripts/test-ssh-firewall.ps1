#!/usr/bin/env pwsh
# ============================================================
# SSH Firewall Diagnostic & Fix Helper (PowerShell)
# ============================================================
# Usage:
#   .\test-ssh-firewall.ps1
#
# This script checks SSH connectivity to the production server
# and provides step-by-step fix instructions for Hostinger hPanel.
# ============================================================

$SERVER_HOST = "srv974554.hstgr.cloud"
$SERVER_PORT = 22
$SERVER_USER = "root"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SSH Firewall Diagnostic Tool" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. DNS resolution test
Write-Host "1) Testing DNS resolution..." -ForegroundColor Yellow
try {
    $dns = [System.Net.Dns]::GetHostAddresses($SERVER_HOST)
    Write-Host "   ✅ $SERVER_HOST resolves to: $($dns[0].IPAddressToString)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ DNS resolution failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Port connectivity test
Write-Host "`n2) Testing SSH port $SERVER_PORT connectivity..." -ForegroundColor Yellow
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $connect = $tcp.BeginConnect($SERVER_HOST, $SERVER_PORT, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
    if ($wait -and $tcp.Connected) {
        Write-Host "   ✅ SSH port $SERVER_PORT is OPEN and reachable!" -ForegroundColor Green
        $tcp.Close()
        exit 0
    } else {
        Write-Host "   ❌ SSH port $SERVER_PORT is BLOCKED (connection timed out)" -ForegroundColor Red
        $tcp.Close()
    }
} catch {
    Write-Host "   ❌ SSH port $SERVER_PORT is BLOCKED: $_" -ForegroundColor Red
}

# 3. Get public IP
Write-Host "`n3) Getting your public IP..." -ForegroundColor Yellow
try {
    $PUBLIC_IP = (Invoke-WebRequest -Uri "https://ifconfig.me/ip" -UseBasicParsing -TimeoutSec 10).Content.Trim()
    Write-Host "   🌐 Your public IP: $PUBLIC_IP" -ForegroundColor Cyan
} catch {
    $PUBLIC_IP = "UNKNOWN"
    Write-Host "   ⚠️ Could not determine public IP" -ForegroundColor Yellow
}

# 4. Fix instructions
Write-Host ""
Write-Host "============================================" -ForegroundColor Red
Write-Host "  🔒 SSH IS BLOCKED — Manual Fix Required" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""
Write-Host "The Hostinger Cloud Firewall is blocking GitHub Actions runners" -ForegroundColor White
Write-Host "from connecting to port $SERVER_PORT on $SERVER_HOST." -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  🔐 FIX VIA HOSTINGER hPanel" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Open: https://hpanel.hostinger.com" -ForegroundColor White
Write-Host "  2. Go to: VPS → Manage → Firewall" -ForegroundColor White
Write-Host "  3. Add INBOUND rule:" -ForegroundColor White
Write-Host ""
Write-Host "     ╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "     ║  Port:     $SERVER_PORT/TCP                        ║" -ForegroundColor Cyan
Write-Host "     ║  Source:   0.0.0.0/0                        ║" -ForegroundColor Cyan
Write-Host "     ║  (Allow all IPs — GitHub Actions IPs vary)  ║" -ForegroundColor Cyan
Write-Host "     ╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Save → Apply" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  💡 Alternative: Run fix script directly ON THE SERVER" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Via Hostinger hPanel → VPS → Browser Terminal:" -ForegroundColor White
Write-Host ""
Write-Host "    curl -sfL https://raw.githubusercontent.com/mokhtar-elhenawy/maxp3/main/scripts/fix-ssh-firewall.sh | sudo bash" -ForegroundColor Green
Write-Host ""
Write-Host "  Or via SSH from whitelisted IP:" -ForegroundColor White
Write-Host ""
Write-Host "    ssh $SERVER_USER@$SERVER_HOST 'curl -sfL https://raw.githubusercontent.com/mokhtar-elhenawy/maxp3/main/scripts/fix-ssh-firewall.sh | sudo bash'" -ForegroundColor Green
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  📋 After Fix — Verify & Deploy" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Re-run this script to verify SSH is open" -ForegroundColor White
Write-Host "  2. Go to GitHub → Actions → Deploy to Server → Run workflow" -ForegroundColor White
Write-Host "  3. Or push to main: git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

exit 1
