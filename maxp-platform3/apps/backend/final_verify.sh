#!/bin/bash
DB_URL='postgresql://appuser:mokhtar1234@localhost/maxp'

echo "--- User Record ---"
psql "$DB_URL" -c "SELECT id, email, role, \"companyId\", \"isActive\" FROM users WHERE email ILIKE 'h2m.office@maxp.com';"

echo "--- UserCompany Table ---"
psql "$DB_URL" -c "SELECT \"userId\", \"companyId\", role, \"isDefault\", \"isActive\" FROM user_companies WHERE \"userId\" IN (SELECT id FROM users WHERE email ILIKE 'h2m.office@maxp.com');"

echo "--- Other 'f' accounts ---"
psql "$DB_URL" -c "SELECT email, role, \"companyId\" FROM users WHERE \"companyId\" = 'f' OR \"companyId\" IS NULL;"
