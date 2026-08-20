
SELECT '--- TABLES ---' as label;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

SELECT '--- USERS COLUMNS ---' as label;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';

SELECT '--- USER COLUMNS ---' as label;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User';

SELECT '--- RLS POLICIES ---' as label;
SELECT tablename, policyname, roles, cmd, qual FROM pg_policies;

SELECT '--- h2m account check ---' as label;
SELECT id, email, "companyId" FROM users WHERE email ILIKE 'h2m.office@maxp.com';
