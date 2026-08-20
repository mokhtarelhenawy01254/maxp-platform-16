
BEGIN;

-- Update the user record directly by ID to avoid any 'where' clause issues
-- Also reset isActive to true just in case
UPDATE users 
SET "companyId" = 'cmlp252qy5p3bju6q9m2ydgna', "isActive" = true
WHERE id = 'cmldvhqli0003juj6ti0cnm9j';

-- Ensure the company link exists and is default
-- First check if it exists
INSERT INTO user_companies ("userId", "companyId", role, "isDefault", "isActive", "joinedAt")
VALUES ('cmldvhqli0003juj6ti0cnm9j', 'cmlp252qy5p3bju6q9m2ydgna', 'OWNER', true, true, NOW())
ON CONFLICT ("userId", "companyId") 
DO UPDATE SET "isDefault" = true, "isActive" = true;

-- Final check of the state
SELECT id, email, "companyId", "isActive" FROM users WHERE id = 'cmldvhqli0003juj6ti0cnm9j';
SELECT "userId", "companyId", "isDefault", "isActive" FROM user_companies WHERE "userId" = 'cmldvhqli0003juj6ti0cnm9j';

COMMIT;
