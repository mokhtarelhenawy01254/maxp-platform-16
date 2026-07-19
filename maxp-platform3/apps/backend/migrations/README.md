# Database Migration Fixes

This directory contains fixes for database migration issues that can occur during deployment.

## Issue Description

The deployment was failing with the following error:
```
Error: Data truncated for column 'type' at row 1
```

This was caused by:
1. Failed migration `20250120_add_product_reviews` stuck in failed state
2. Column type changes from `String` to enum types causing data truncation
3. Existing data in `type` columns not matching new enum values

## Files

### `fix_migration_state.sql`
Manual SQL script that:
- Cleans up invalid data in `type` columns
- Ensures `product_reviews` table exists with proper structure
- Adds foreign key constraints safely
- Removes orphaned data

### `deploy_fix.sh`
Bash script for manual deployment fix (if needed):
- Applies the SQL fix script
- Resolves failed migration state
- Applies migrations properly

## How It Works

The deployment workflow now includes these steps:

1. **Apply Manual Fixes**: Run `fix_migration_state.sql` to clean up data
2. **Resolve Failed Migration**: Mark stuck migration as resolved
3. **Generate Prisma Client**: Ensure client is up to date
4. **Apply Migrations**: Use `migrate deploy` first, fallback to `db push`
5. **Fallback Strategy**: If all else fails, use `db push` with force reset

## Manual Recovery (if needed)

If deployment still fails, you can manually run these commands on the server:

```bash
cd /var/www/backend2

# Apply the fix script
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/fix_migration_state.sql

# Resolve the failed migration
npx prisma migrate resolve --applied 20250120_add_product_reviews --schema=prisma/schema

# Generate client
npx prisma generate --schema=prisma/schema

# Apply migrations
npx prisma migrate deploy --schema=prisma/schema

# Or force push schema
npx prisma db push --schema=prisma/schema --accept-data-loss --force-reset
```

## Prevention

To prevent similar issues in the future:

1. **Test migrations locally** before deploying
2. **Use proper enum migrations** when changing String to enum types
3. **Clean up data** before schema changes
4. **Use `prisma migrate dev`** during development to catch issues early

## Affected Models

Models with `type` columns that were causing issues:
- `TelegramUserbotChats`: `type` field (GROUP, CHANNEL)
- `Notifications`: `type` field
- `TaskNotifications`: `type` field  
- `TaskTemplates`: `type` field
- `Tasks`: `type` field
- `TaskDependencies`: `type` field

All these have been cleaned up to use valid enum values or default strings.
