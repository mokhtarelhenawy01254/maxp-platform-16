-- 1. Check table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'whatsapp_session_history_imports';

-- 2. Check columns
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'whatsapp_session_history_imports' ORDER BY ordinal_position;

-- 3. Check backfill count
SELECT COUNT(*) as total_records FROM whatsapp_session_history_imports;

-- 4. Check no duplicate sessionIds
SELECT sessionId, COUNT(*) as cnt FROM whatsapp_session_history_imports GROUP BY sessionId HAVING COUNT(*) > 1;

-- 5. Check status distribution
SELECT status, COUNT(*) as cnt FROM whatsapp_session_history_imports GROUP BY status ORDER BY status;

-- 6. Check backfill timestamps
SELECT id, sessionId, status, requestedAt, startedAt, completedAt FROM whatsapp_session_history_imports ORDER BY requestedAt DESC LIMIT 15;

-- 7. Check fk integrity - orphan records
SELECT wshi.id FROM whatsapp_session_history_imports wshi LEFT JOIN whatsapp_sessions ws ON ws.id = wshi."sessionId" WHERE ws.id IS NULL;
