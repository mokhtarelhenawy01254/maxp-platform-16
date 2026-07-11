#!/bin/bash
PGPASSWORD="${PASSWORD:-mokhtar1234}" psql -h localhost -U appuser -d maxp <<'SQL'
SELECT name, sku, price FROM public.products 
WHERE "companyId" = 'cmleybpf70028juo2wwpmp8rt' 
  AND "deletedAt" IS NULL 
  AND "isActive" = TRUE 
ORDER BY name LIMIT 30;
SQL
