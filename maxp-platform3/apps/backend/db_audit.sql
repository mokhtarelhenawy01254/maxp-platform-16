
SELECT '--- Schemas ---' as label;
SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema';

SELECT '--- Users Table Columns ---' as label;
SELECT table_schema, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY table_schema, ordinal_position;

SELECT '--- RLS Status ---' as label;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';

SELECT '--- RLS Policies ---' as label;
SELECT * FROM pg_policies WHERE tablename = 'users';

SELECT '--- Current User Data ---' as label;
SELECT id, email, "companyId" FROM users WHERE email ILIKE 'h2m.office@maxp.com';
