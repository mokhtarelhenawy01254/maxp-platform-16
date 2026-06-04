#!/bin/bash
DB_URL='postgresql://appuser:mokhtar1234@localhost/maxp'
echo "--- Tables ---"
psql "$DB_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name ILIKE '%user%' OR table_name ILIKE '%company%');"

echo "--- User Details ---"
psql "$DB_URL" -c "SELECT id, email, role, \"companyId\", \"isActive\" FROM \"User\" WHERE email ILIKE 'h2m.office@maxp.com';"

echo "--- User-Company Links ---"
# Try a few common names if UserCompany fails
for table in "UserCompany" "user_companies" "user_company" "User_Company"; do
  echo "Checking $table..."
  psql "$DB_URL" -c "SELECT * FROM \"$table\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE email ILIKE 'h2m.office@maxp.com');" 2>/dev/null && break
done
