
BEGIN;

-- Update the user record directly by ID
UPDATE users 
SET "companyId" = 'cmlp252qy5p3bju6q9m2ydgna', "isActive" = true
WHERE id = 'cmldvhqli0003juj6ti0cnm9j';

-- Update the company link to be default
UPDATE user_companies 
SET "isDefault" = true, "isActive" = true
WHERE "userId" = 'cmldvhqli0003juj6ti0cnm9j' 
AND "companyId" = 'cmlp252qy5p3bju6q9m2ydgna';

-- Final check of the state
SELECT id, email, "companyId", "isActive" FROM users WHERE id = 'cmldvhqli0003juj6ti0cnm9j';
SELECT "userId", "companyId", "isDefault", "isActive" FROM user_companies WHERE "userId" = 'cmldvhqli0003juj6ti0cnm9j';

COMMIT;
