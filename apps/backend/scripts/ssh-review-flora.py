import paramiko, sys, time

HOST = "153.92.223.119"
PORT = 22
USER = "root"
PASSWORD = "Mokhtar1234@#"
FID = "cmlc7s6kh000iju40ei73ez36"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run(cmd, timeout=15):
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        return out, err
    except Exception as e:
        return "", str(e)

def Q(query, timeout=30):
    q = query.replace("'", "'\\''")
    cmd = f"PGPASSWORD=mokhtar1234 psql -h localhost -U appuser -d maxp -c '{q}' 2>&1"
    return run(cmd, timeout=timeout)[0]

print("[+] Connecting...", flush=True)
client.connect(HOST, PORT, USER, PASSWORD, look_for_keys=False, allow_agent=False, timeout=10)
print("[+] Connected!\n", flush=True)

# 0. Get column names
print("=== 0. AI_INTERACTIONS SCHEMA ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_interactions' ORDER BY ordinal_position", timeout=15), flush=True)

print("\n=== 0b. CONVERSATIONS SCHEMA ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position", timeout=15), flush=True)

print("\n=== 0c. MESSAGES SCHEMA ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' ORDER BY ordinal_position", timeout=15), flush=True)

# 1. Flora company
print("\n=== 1. FLORA COMPANY ===", flush=True)
print(Q("SELECT id, name FROM companies WHERE id = '{}'".format(FID)), flush=True)

# Use camelCase since that's what the DB uses
CID = FID  # companyId

# 2. Total interactions
print("\n=== 2. AI INTERACTIONS TOTAL ===", flush=True)
print(Q("SELECT COUNT(*) AS total, MIN(\"createdAt\") AS oldest, MAX(\"createdAt\") AS newest FROM ai_interactions WHERE \"companyId\" = '{}'".format(CID)), flush=True)

# 3. Daily volume last 7 days
print("\n=== 3. DAILY VOLUME (7d) ===", flush=True)
print(Q("SELECT DATE(\"createdAt\") AS day, COUNT(*) AS cnt FROM ai_interactions WHERE \"companyId\" = '{}' AND \"createdAt\" >= CURRENT_DATE - 7 GROUP BY DATE(\"createdAt\") ORDER BY day DESC".format(CID)), flush=True)

# 4. Human intervention needed
print("\n=== 4. HUMAN INTERVENTION NEEDED ===", flush=True)
print(Q("SELECT \"requiresHumanIntervention\", COUNT(*) FROM ai_interactions WHERE \"companyId\" = '{}' GROUP BY \"requiresHumanIntervention\"".format(CID)), flush=True)

# 5. Intent distribution
print("\n=== 5. INTENT DISTRIBUTION ===", flush=True)
print(Q("SELECT intent, COUNT(*) FROM ai_interactions WHERE \"companyId\" = '{}' AND intent IS NOT NULL AND intent != '' GROUP BY intent ORDER BY COUNT(*) DESC LIMIT 15".format(CID)), flush=True)

# 6. Sentiment
print("\n=== 6. SENTIMENT ===", flush=True)
print(Q("SELECT sentiment, COUNT(*) FROM ai_interactions WHERE \"companyId\" = '{}' AND sentiment IS NOT NULL AND sentiment != '' GROUP BY sentiment ORDER BY COUNT(*) DESC".format(CID)), flush=True)

# 7. Models
print("\n=== 7. MODELS ===", flush=True)
print(Q("SELECT \"modelUsed\", COUNT(*) FROM ai_interactions WHERE \"companyId\" = '{}' AND \"modelUsed\" IS NOT NULL AND \"modelUsed\" != '' GROUP BY \"modelUsed\" ORDER BY COUNT(*) DESC".format(CID)), flush=True)

# 8. Conversations
print("\n=== 8. CONVERSATIONS ===", flush=True)
print(Q("SELECT status, channel, COUNT(*) FROM conversations WHERE \"companyId\" = '{}' GROUP BY status, channel ORDER BY COUNT(*) DESC".format(CID)), flush=True)

# 9. Empty responses
print("\n=== 9. EMPTY/SHORT RESPONSES ===", flush=True)
print(Q("SELECT COUNT(*) FROM ai_interactions WHERE \"companyId\" = '{}' AND (\"aiResponse\" IS NULL OR LENGTH(TRIM(\"aiResponse\")) < 5)".format(CID)), flush=True)

# 10. Last 20 responses
print("\n=== 10. LAST 20 RESPONSES ===", flush=True)
result = Q("SELECT \"createdAt\", LEFT(\"userMessage\",100) AS msg, LEFT(\"aiResponse\",250) AS resp, intent, sentiment FROM ai_interactions WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 20".format(CID))
print(result, flush=True)

# 11. Negative sentiment
print("\n=== 11. NEGATIVE SENTIMENT ===", flush=True)
result = Q("SELECT \"createdAt\", LEFT(\"userMessage\",120) AS msg, LEFT(\"aiResponse\",250) AS resp FROM ai_interactions WHERE \"companyId\" = '{}' AND sentiment IN ('negative','very_negative') ORDER BY \"createdAt\" DESC LIMIT 10".format(CID))
print(result, flush=True)

# 12. Error-like responses
print("\n=== 12. POTENTIAL ERROR RESPONSES ===", flush=True)
result = Q("SELECT \"createdAt\", LEFT(\"userMessage\",80) AS msg, LEFT(\"aiResponse\",150) AS resp FROM ai_interactions WHERE \"companyId\" = '{}' AND (LOWER(\"aiResponse\") LIKE '%error%' OR LOWER(\"aiResponse\") LIKE '%sorry%' OR LOWER(\"aiResponse\") LIKE '%unable%' OR LOWER(\"aiResponse\") LIKE '%cannot%') ORDER BY \"createdAt\" DESC LIMIT 15".format(CID))
print(result, flush=True)

# 13. Top convos
print("\n=== 13. TOP CONVERSATIONS ===", flush=True)
print(Q("SELECT c.id, c.channel, c.status, COUNT(m.id) AS msg_ct FROM conversations c JOIN messages m ON m.\"conversationId\" = c.id WHERE c.\"companyId\" = '{}' GROUP BY c.id, c.channel, c.status ORDER BY msg_ct DESC LIMIT 10".format(CID)), flush=True)

# 14. Response time stats
print("\n=== 14. RESPONSE TIME ===", flush=True)
print(Q("SELECT COUNT(*) AS analyzed, AVG(\"responseTime\")::int AS avg_ms, MAX(\"responseTime\") AS max_ms, MIN(\"responseTime\") AS min_ms FROM ai_interactions WHERE \"companyId\" = '{}' AND \"responseTime\" IS NOT NULL".format(CID)), flush=True)

# 15. Repetitive messages
print("\n=== 15. REPETITIVE CUSTOMER MESSAGES ===", flush=True)
print(Q("SELECT LEFT(\"userMessage\",80) AS snippet, COUNT(*) FROM ai_interactions WHERE \"companyId\" = '{}' GROUP BY snippet HAVING COUNT(*) > 2 ORDER BY COUNT(*) DESC LIMIT 15".format(CID)), flush=True)

# 16. AI evaluations
print("\n=== 16. AI EVALUATIONS ===", flush=True)
print(Q("SELECT status, score, COUNT(*) FROM ai_response_evaluations WHERE \"companyId\" = '{}' GROUP BY status, score ORDER BY score".format(CID)), flush=True)

client.close()
print("\n[+] DONE", flush=True)
