#!/bin/bash
# سكريبت لمزامنة كلمة مرور appuser مع ملف .env
# Script to synchronize appuser password with .env file

echo "🔄 Synchronizing appuser password..."
ENV_FILE="/var/www/backend2/.env"

if [ -f "$ENV_FILE" ]; then
    # Extract password from POSTGRES_URL
    # URL format: postgresql://user:password@host:port/db
    POSTGRES_URL=$(grep "POSTGRES_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [ ! -z "$POSTGRES_URL" ]; then
        # Use python or perl to safely extract password part as it might contain special characters
        DB_PASS=$(echo "$POSTGRES_URL" | sed -e 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
        
        if [ ! -z "$DB_PASS" ]; then
            echo "🔑 Extracted password from .env (length: ${#DB_PASS})"
            
            # Update password in PostgreSQL
            sudo -u postgres psql -c "ALTER USER appuser WITH PASSWORD '$DB_PASS';"
            if [ $? -eq 0 ]; then
                echo "✅ appuser password updated in PostgreSQL to match .env"
            else
                echo "❌ Failed to update appuser password"
            fi
        else
            echo "❌ Could not extract password from POSTGRES_URL"
        fi
    else
        echo "❌ POSTGRES_URL not found or empty in .env"
    fi
else
    echo "❌ .env file NOT found at $ENV_FILE"
fi
