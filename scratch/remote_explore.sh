#!/bin/bash
echo "=== whoami/host ==="
whoami; hostname
echo "=== backend2 dir ==="
ls -la /var/www/backend2 | head -40
echo "=== tools ==="
command -v node; command -v psql; command -v redis-cli; node -v 2>/dev/null
echo "=== backend2 .env relevant ==="
grep -E '^(DATABASE_URL|POSTGRES|DB_|PORT|NODE_ENV)' /var/www/backend2/.env 2>/dev/null
echo "=== backend2 prisma generated ==="
ls /var/www/backend2/prisma/generated 2>/dev/null
echo "=== ecosystem ==="
cat /var/www/backend2/ecosystem.config.js 2>/dev/null | head -40
echo "=== pm2 ==="
pm2 list 2>/dev/null | head -30
