
-- Target User: h2m.office@maxp.com
-- Target Company: sola (cmlp252qy5p3bju6q9m2ydgna)

BEGIN;

-- 1. Correct the primary companyId in 'users' table
UPDATE users 
SET "companyId" = 'cmlp252qy5p3bju6q9m2ydgna' 
WHERE email ILIKE 'h2m.office@maxp.com' AND "companyId" = 'f';

-- 2. Mark this company as default in 'user_companies' table
UPDATE user_companies 
SET "isDefault" = true 
WHERE "userId" = (SELECT id FROM users WHERE email ILIKE 'h2m.office@maxp.com')
AND "companyId" = 'cmlp252qy5p3bju6q9m2ydgna';

-- 3. Check for other users with 'f' as companyId
SELECT email, role, "companyId" FROM users WHERE "companyId" = 'f';

COMMIT;
