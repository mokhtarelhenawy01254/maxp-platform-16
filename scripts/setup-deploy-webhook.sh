#!/bin/bash
set -euo pipefail

NODE_BIN=/root/.nvm/versions/node/v20.19.5/bin
export PATH="$NODE_BIN:$PATH"

echo "=== Setting up deploy webhook server ==="

# 1. Create directory
mkdir -p /opt/deploy-webhook

# 2. Copy files (already uploaded to /tmp)
cp /tmp/deploy-webhook-server.js /opt/deploy-webhook/server.js
tr -d '\r' < /tmp/server-deploy.sh > /opt/deploy-webhook/deploy.sh
chmod +x /opt/deploy-webhook/deploy.sh

# 3. Create env file
cat > /opt/deploy-webhook/.env << 'ENVEOF'
WEBHOOK_PORT=9001
DEPLOY_WEBHOOK_SECRET=nieaG5jVsUEyw6FM29QvSC8YtgLxhDNX
DEPLOY_SCRIPT=/opt/deploy-webhook/deploy.sh
WEBHOOK_LOG=/var/log/maxp-deploy-webhook.log
GITHUB_TOKEN=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
ENVEOF

# 4. Create log files
touch /var/log/maxp-deploy-webhook.log /var/log/maxp-deploy.log
chmod 666 /var/log/maxp-deploy-webhook.log /var/log/maxp-deploy.log

# 5. Start with PM2
pm2 delete maxp-deploy-webhook 2>/dev/null || true
pm2 start /opt/deploy-webhook/server.js \
  --name maxp-deploy-webhook \
  --env-file /opt/deploy-webhook/.env
pm2 save

echo ""
echo "=== Webhook server status ==="
pm2 list | grep -E "name|deploy-webhook" || true

# 6. Quick health check
sleep 2
if curl -fsS http://localhost:9001/health; then
  echo ""
  echo "✅ Webhook server is running on port 9001"
else
  echo "❌ Webhook server not responding"
  pm2 logs maxp-deploy-webhook --lines 20 --nostream || true
fi

# 7. Update UFW to allow port 9001
ufw allow 9001/tcp comment "maxp-deploy-webhook" || true
echo "✅ UFW updated for port 9001"

# 8. Add nginx location for webhook
NGINX_CONF=/etc/nginx/sites-available/maxp.online.conf
if [ -f "$NGINX_CONF" ] && ! grep -q "deploy-webhook" "$NGINX_CONF"; then
  # Add webhook proxy before the last closing brace
  sed -i 's|# END MAXP WEBHOOK PLACEHOLDER||g' "$NGINX_CONF" || true
  # Find the server block and add location
  cat >> /tmp/nginx-webhook.conf << 'NGINXEOF'

    # Deploy webhook (internal trigger)
    location /deploy-hook/ {
        proxy_pass http://127.0.0.1:9001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
NGINXEOF
  echo "ℹ️ Add the above nginx block manually to maxp.online.conf if needed"
fi

echo ""
echo "=== Setup complete ==="
echo "Webhook URL will be: https://maxp.online/deploy-hook/deploy"
echo "Or direct: http://$(curl -s ifconfig.me):9001/deploy"
