
SELECT email 
FROM users 
WHERE id IN (
    SELECT DISTINCT "userId" 
    FROM user_companies 
    WHERE "userId" NOT IN (
        SELECT "userId" 
        FROM user_companies 
        WHERE "isDefault" = true
    )
);
