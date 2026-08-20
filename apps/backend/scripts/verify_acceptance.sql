-- 1. Migration verification
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_session_history_imports') AS table_exists;
SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whathistoryimportstatus') AS enum_exists;

-- 2. Check migration history
SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_history_import%';

-- 3. No duplicate sessionIds
SELECT COUNT(*) as total, COUNT(DISTINCT "sessionId") as unique_sessions FROM whatsapp_session_history_imports;

-- 4. No orpahns
SELECT COUNT(*) as orphans FROM whatsapp_session_history_imports wshi LEFT JOIN whatsapp_sessions ws ON ws.id = wshi."sessionId" WHERE ws.id IS NULL;

-- 5. Count by status
SELECT status, COUNT(*) FROM whatsapp_session_history_imports GROUP BY status ORDER BY status;
