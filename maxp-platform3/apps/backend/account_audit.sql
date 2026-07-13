
-- Count users with potentially problematic companyId values
SELECT count(*), 'Users with companyId = f' as category FROM users WHERE "companyId" = 'f';
SELECT count(*), 'Users with companyId IS NULL' as category FROM users WHERE "companyId" IS NULL;

-- Show roles of users without a companyId
SELECT role, count(*) FROM users WHERE "companyId" IS NULL OR "companyId" = 'f' GROUP BY role;

-- Check if there are users with memberships but no default company
SELECT count(DISTINCT "userId") as users_with_no_default 
FROM user_companies 
WHERE "userId" NOT IN (SELECT "userId" FROM user_companies WHERE "isDefault" = true);
