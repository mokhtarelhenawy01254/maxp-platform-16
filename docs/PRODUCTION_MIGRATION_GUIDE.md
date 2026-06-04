# Production Database Safety Guide

## ⚠️ CRITICAL RULES

### NEVER run these in production:
```bash
# ❌ DESTRUCTIVE — drops and recreates tables
npx prisma db push

# ❌ DESTRUCTIVE — drops database and recreates
npx prisma migrate reset

# ❌ DESTRUCTIVE — uses shadow database, can drop data
npx prisma migrate dev
```

### ALWAYS use in production:
```bash
# ✅ SAFE — applies pending migrations only
npx prisma migrate deploy

# ✅ SAFE — seeds data after migrations
npx prisma db seed
```

## Workflow for Production Schema Changes

1. **Development Phase:**
   ```bash
   # Edit files in prisma/schema/*.prisma
   # Rebuild merged schema
   node scripts/merge-prisma-schema.js

   # Create migration (development only)
   npx prisma migrate dev --schema prisma/schema.prisma --name add_new_feature
   ```

2. **Review Phase:**
   ```bash
   # Read the generated SQL migration
   cat prisma/migrations/YYYYMMDDXXXXXX_add_new_feature/migration.sql
   ```

3. **Production Phase:**
   ```bash
   # Deploy reviewed migrations
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```

## What Happened Here (2026-05-31)

`npx prisma db push --accept-data-loss` was run on a DB with existing data. This caused:
- Complete data loss (all tables dropped)
- 1681 ai_provider_logs lost
- 104 companies lost
- 347 customers lost
- All other tables wiped

**Root Cause:** `db push` is designed for fresh/development databases. It performs a schema sync that can drop tables.

**Prevention:** Use `migrate deploy` in production. Use the safety guard script.

## Safety Guard

```bash
# Check if environment is safe before running commands
node scripts/production-db-safety-guard.js "db push"

# This will BLOCK if NODE_ENV=production or DATABASE_URL points to prod DB
```

## Recovery (If Accident Happens)

1. **Immediately:** Stop all application servers
2. **Check backups:** Look for latest PostgreSQL dump
3. **If no backup:** Data is unrecoverable
4. **Restore from dump:**
   ```bash
   pg_restore --dbname=maxp --clean latest_backup.dump
   ```

## Environment Variables

```bash
# Development (safe for db push)
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/maxp

# Production (BLOCKS db push)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/maxp
```
