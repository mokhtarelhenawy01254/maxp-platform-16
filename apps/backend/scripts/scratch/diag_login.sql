
SELECT id, email, role, "companyId", "isActive" 
FROM "User" 
WHERE email ILIKE 'h2m.office@maxp.com';

SELECT "userId", "companyId", role, "isDefault", "isActive" 
FROM "UserCompany" 
WHERE "userId" IN (SELECT id FROM "User" WHERE email ILIKE 'h2m.office@maxp.com');
