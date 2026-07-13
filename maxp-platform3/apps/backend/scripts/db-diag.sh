#!/bin/bash
# سكريبت لتشخيص مشكلة الاتصال بقاعدة البيانات على السيرفر
# Diagnosis script for database connection issue on the server

echo "🔍 Database Diagnosis..."
ENV_FILE="/var/www/backend2/.env"

if [ -f "$ENV_FILE" ]; then
    echo "✅ .env file exists at $ENV_FILE"
    
    # Check if POSTGRES_URL or DATABASE_URL exists without showing values
    if grep -q "POSTGRES_URL=" "$ENV_FILE"; then
        echo "✅ POSTGRES_URL is defined in .env"
        # Extract user from URL safely
        DB_USER=$(grep "POSTGRES_URL=" "$ENV_FILE" | sed -e 's/.*:\/\/\([^:]*\):.*/\1/')
        echo "👤 User in URL: $DB_USER"
    elif grep -q "DATABASE_URL=" "$ENV_FILE"; then
        echo "✅ DATABASE_URL is defined in .env"
        DB_USER=$(grep "DATABASE_URL=" "$ENV_FILE" | sed -e 's/.*:\/\/\([^:]*\):.*/\1/')
        echo "👤 User in URL: $DB_USER"
    else
        echo "❌ Neither POSTGRES_URL nor DATABASE_URL found in .env"
    fi
else
    echo "❌ .env file NOT found at $ENV_FILE"
fi

# Check if appuser exists in Postgres
echo "🐘 Checking PostgreSQL users..."
sudo -u postgres psql -t -c "SELECT usename FROM pg_catalog.pg_user;" | grep "appuser" && echo "✅ appuser exists in PostgreSQL" || echo "❌ appuser does NOT exist in PostgreSQL"

# Test connection internally as appuser (bypass password if peer auth is enabled for testing)
echo "🧪 Testing internal connection as appuser (no password check)..."
if sudo -u postgres psql -d maxp -U appuser -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Internal connection (via postgres user) as appuser works"
else
    echo "❌ Internal connection as appuser fails"
fi
