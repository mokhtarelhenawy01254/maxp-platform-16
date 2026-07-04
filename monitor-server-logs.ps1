#!/usr/bin/env pwsh
# ==============================================================================
# Script: monitor-server-logs.ps1
# Description: Stream real-time logs from the production server over SSH.
# ==============================================================================

$SERVER_HOST = "srv974554.hstgr.cloud"
$SERVER_USER = "root"

Clear-Host
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         MaxP Server Log Monitor Bot" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select which logs you want to stream:" -ForegroundColor Yellow
Write-Host "  [1] AI Service logs (maxp-ai-service)"
Write-Host "  [2] Backend API logs (maxp-backend)"
Write-Host "  [3] Webhook Worker logs (maxp-webhook-worker)"
Write-Host "  [4] All server logs combined"
Write-Host "  [5] Custom PM2 Command (e.g. pm2 status)"
Write-Host "  [6] Exit"
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

$pm2_app = ""
switch ($choice) {
    "1" { $pm2_app = "maxp-ai-service" }
    "2" { $pm2_app = "maxp-backend" }
    "3" { $pm2_app = "maxp-webhook-worker" }
    "4" { $pm2_app = "--raw" }
    "5" { 
        $custom_cmd = Read-Host "Enter custom command (e.g. status, list, show maxp-backend)"
        Write-Host "Executing 'pm2 $custom_cmd' on $SERVER_HOST..." -ForegroundColor Green
        ssh -t "$SERVER_USER@$SERVER_HOST" "pm2 $custom_cmd"
        exit
    }
    "6" {
        Write-Host "Goodbye!" -ForegroundColor Yellow
        exit
    }
    default {
        Write-Host "Invalid choice, exiting." -ForegroundColor Red
        exit
    }
}

Write-Host "Connecting to $SERVER_HOST and streaming logs for '$pm2_app'..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop streaming and disconnect." -ForegroundColor Yellow
Write-Host ""

# Use ssh -t to allocate tty so Ctrl+C gracefully terminates the remote stream
ssh -t "$SERVER_USER@$SERVER_HOST" "pm2 logs $pm2_app --lines 50"
