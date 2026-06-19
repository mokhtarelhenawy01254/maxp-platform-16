#!/bin/bash
DB_PASSWORD="${PASSWORD:-mokhtar1234}"
DB_URL="postgresql://appuser:${DB_PASSWORD}@localhost/maxp"
OUT_FILE='/tmp/diag_results.txt'

echo "--- User Details ---" > $OUT_FILE
psql "$DB_URL" -A -F',' -c "SELECT id, email, role, \"companyId\", \"isActive\" FROM users WHERE email ILIKE 'h2m.office@maxp.com';" >> $OUT_FILE

echo "" >> $OUT_FILE
echo "--- User-Company Links ---" >> $OUT_FILE
psql "$DB_URL" -A -F',' -c "SELECT \"userId\", \"companyId\", role, \"isDefault\", \"isActive\" FROM user_companies WHERE \"userId\" IN (SELECT id FROM users WHERE email ILIKE 'h2m.office@maxp.com');" >> $OUT_FILE

echo "" >> $OUT_FILE
echo "--- Associated Companies ---" >> $OUT_FILE
psql "$DB_URL" -A -F',' -c "SELECT id, name, slug, \"isActive\" FROM companies WHERE id IN (SELECT \"companyId\" FROM user_companies WHERE \"userId\" IN (SELECT id FROM users WHERE email ILIKE 'h2m.office@maxp.com'));" >> $OUT_FILE

cat $OUT_FILE
