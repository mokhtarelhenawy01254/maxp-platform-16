#!/bin/bash
DB_URL='postgresql://appuser:mokhtar1234@localhost/maxp'

echo "--- User Details (from 'users' table) ---"
psql "$DB_URL" -c "SELECT id, email, role, \"companyId\", \"isActive\" FROM users WHERE email ILIKE 'h2m.office@maxp.com';"

echo "--- User-Company Links (from 'user_companies' table) ---"
psql "$DB_URL" -c "SELECT \"userId\", \"companyId\", role, \"isDefault\", \"isActive\" FROM user_companies WHERE \"userId\" IN (SELECT id FROM users WHERE email ILIKE 'h2m.office@maxp.com');"

echo "--- Company Details for these links ---"
psql "$DB_URL" -c "SELECT id, name, slug, \"isActive\" FROM companies WHERE id IN (SELECT \"companyId\" FROM user_companies WHERE \"userId\" IN (SELECT id FROM users WHERE email ILIKE 'h2m.office@maxp.com'));"
