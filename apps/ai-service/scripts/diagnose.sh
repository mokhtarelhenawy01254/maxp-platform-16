#!/usr/bin/env bash
# Quick server diagnostic — run this first to know what state the server is in
set -e
echo "============================================================"
echo "  MaxP AI Service :: Server Diagnostic"
echo "============================================================"
echo ""

echo "## OS"
cat /etc/os-release | head -3
echo ""

echo "## Current user"
whoami
echo ""

echo "## Docker"
if command -v docker >/dev/null 2>&1; then
    docker --version
    echo "Docker daemon: $(systemctl is-active docker 2>/dev/null || echo 'unknown')"
else
    echo "❌ NOT INSTALLED"
fi
echo ""

echo "## Postgres connectivity"
if command -v psql >/dev/null 2>&1; then
    if sudo -u postgres psql -c '\l' >/dev/null 2>&1; then
        echo "✓ Postgres OK"
        sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datistemplate = false;" 2>/dev/null
    else
        echo "❌ Postgres not running or not accessible"
    fi
else
    echo "❌ psql client not installed"
fi
echo ""

echo "## MaxP backend"
[ -f /var/www/backend2/.env ] && echo "✓ /var/www/backend2/.env exists" || echo "❌ missing"
[ -f /var/www/backend2/ecosystem.config.js ] && echo "✓ ecosystem.config.js exists" || echo "❌ missing"
if command -v pm2 >/dev/null 2>&1; then
    echo "PM2 processes:"
    pm2 list 2>/dev/null | head -10
else
    echo "❌ pm2 not installed"
fi
echo ""

echo "## Nginx"
if command -v nginx >/dev/null 2>&1; then
    nginx -v 2>&1
    echo "Active sites:"
    ls /etc/nginx/sites-enabled/ 2>/dev/null
    echo ""
    echo "ai.maxp-ai.pro block:"
    grep -A 2 "server_name ai.maxp-ai.pro" /etc/nginx/sites-enabled/*.conf 2>/dev/null || echo "❌ NOT YET CONFIGURED"
else
    echo "❌ nginx not installed"
fi
echo ""

echo "## DNS (this server's view)"
echo "Server public IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'unknown')"
echo ""

echo "## SSL certs"
if [ -d /etc/letsencrypt/live ]; then
    sudo certbot certificates 2>/dev/null || ls /etc/letsencrypt/live/
else
    echo "❌ No Let's Encrypt certs"
fi
echo ""

echo "## AI service already running?"
if curl -fsS --max-time 3 http://localhost:8000/health 2>/dev/null; then
    echo ""
    echo "✓ AI service already responding"
else
    echo "❌ AI service not running on :8000"
fi
echo ""

echo "## Disk space"
df -h / | tail -1
echo ""

echo "============================================================"
echo "  Diagnostic complete"
echo "============================================================"
