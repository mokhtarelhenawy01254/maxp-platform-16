-- Find Shrouk's user ID
SELECT id, "firstName", "lastName", "employeeNumber", "companyId" FROM "User" WHERE "firstName" ILIKE '%shrouk%' OR "employeeNumber" = 'EMP00001';

-- Check assignments for today (Feb 16, 2026)
SELECT sa.id, sa.date, s.name, s."startTime", s."endTime"
FROM "ShiftAssignment" sa
JOIN "Shift" s ON sa."shiftId" = s.id
WHERE sa."userId" IN (SELECT id FROM "User" WHERE "firstName" ILIKE '%shrouk%' OR "employeeNumber" = 'EMP00001')
ORDER BY sa.date DESC
LIMIT 10;

-- Check HR Settings
SELECT "lateGracePeriod", "companyId" FROM "HRSettings" LIMIT 5;
