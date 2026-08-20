
-- Check exact column metadata and values
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'companyId';

-- Check exact value for the user
SELECT 
    id, 
    email, 
    "companyId",
    quote_literal("companyId") as quoted_val,
    length("companyId") as val_len
FROM users 
WHERE email ILIKE 'h2m.office@maxp.com';
