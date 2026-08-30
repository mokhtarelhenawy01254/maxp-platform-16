ls /var/www/ai-service/src/api/admin/auth.py
echo "--- auth.py ---"
head -80 /var/www/ai-service/src/api/admin/auth.py
echo "--- env token ---"
grep -E "TOKEN|SECRET|JWT" /var/www/ai-service/.env 2>&1 | head -5
echo "--- backend env ---"
grep -E "TOKEN|SECRET|JWT" /var/www/backend2/.env 2>&1 | head -10
