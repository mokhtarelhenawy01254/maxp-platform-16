PGPASSWORD=mokhtar1234 psql -h localhost -U appuser -d maxp -c "SELECT COUNT(*) as total_rows, MIN(created_at) as first_added, MAX(created_at) as last_added FROM ai.whatsapp_ai_ignore_list WHERE company_id = 'cmt25v7eb0008juhbath14ovl';"
echo "---"
PGPASSWORD=mokhtar1234 psql -h localhost -U appuser -d maxp -c "SELECT phone_number, created_at FROM ai.whatsapp_ai_ignore_list WHERE company_id = 'cmt25v7eb0008juhbath14ovl' ORDER BY created_at DESC;"
echo "--- pm2 process info ---"
pm2 jlist | head -100
