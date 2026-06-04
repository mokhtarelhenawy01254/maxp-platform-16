-- Find Shrouk's user ID
SELECT id, "firstName", "lastName", "employeeNumber", "companyId" 
FROM "User" 
WHERE "firstName" ILIKE '%shrouk%' OR "employeeNumber" = 'EMP00001';

-- Check assignments for today (Feb 16, 2026) using the mapped table name
SELECT sa.id, sa.date, s.name, s."startTime", s."endTime"
FROM hr_shift_assignments sa
JOIN hr_shifts s ON sa."shiftId" = s.id
WHERE sa."userId" IN (SELECT id FROM "User" WHERE "firstName" ILIKE '%shrouk%' OR "employeeNumber" = 'EMP00001')
ORDER BY sa.date DESC
LIMIT 10;

-- Check HR Settings
SELECT "lateGracePeriod", "companyId" FROM hr_settings LIMIT 5;
