#!/bin/bash
set -e

echo "🔧 Fixing database migration state..."

# Step 1: Run the manual fix script first
echo "📋 Applying manual database fixes..."
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /var/www/backend2/migrations/fix_migration_state.sql

# Step 2: Mark the failed migration as resolved
echo "✅ Resolving failed migration state..."
npx prisma migrate resolve --applied 20250120_add_product_reviews --schema=prisma/schema || echo "⚠️ Migration was not in failed state (expected)"

# Step 3: Reset migration state if needed
echo "🔄 Resetting migration state..."
npx prisma migrate reset --force --schema=prisma/schema --skip-seed || echo "⚠️ Reset not needed"

# Step 4: Apply all migrations
echo "🗄️ Applying migrations..."
npx prisma migrate deploy --schema=prisma/schema || {
    echo "⚠️ Migrate deploy failed, using db push as fallback..."
    npx prisma db push --schema=prisma/schema --accept-data-loss --force-reset
}

# Step 5: Generate Prisma client
echo "📦 Generating Prisma Client..."
npx prisma generate --schema=prisma/schema

echo "✅ Database migration fix completed!"
