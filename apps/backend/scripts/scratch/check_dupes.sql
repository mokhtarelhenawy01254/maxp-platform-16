
SELECT id, email, role, "companyId", "isActive" 
FROM users 
WHERE email ILIKE 'h2m.office@maxp.com';

SELECT COUNT(*), email FROM users GROUP BY email HAVING COUNT(*) > 1 AND email ILIKE 'h2m.office@maxp.com';
