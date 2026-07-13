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

# 1. Users assigned to Flora
print("=== 1. USERS FOR FLORA ===", flush=True)
print(Q("SELECT id, name, email, role FROM users WHERE \"companyId\" = '{}'".format(FID)), flush=True)

# 2. Agent configurations for Flora
print("\n=== 2. AGENTS CONFIG ===", flush=True)
print(Q("SELECT id, name, slug, role, status, \"modelPolicy\" FROM agents WHERE \"companyId\" = '{}' LIMIT 20".format(FID)), flush=True)

# 3. Check AI API keys for Flora
print("\n=== 3. AI KEYS ===", flush=True)
print(Q("SELECT id, name, provider, \"keyAlias\" FROM api_keys WHERE \"companyId\" = '{}' AND provider IN ('openai','anthropic','google','groq','openrouter')".format(FID)), flush=True)

# 4. Check if there are any AI errors in a log table
print("\n=== 4. ACTIVITY LOGS (recent, any type) ===", flush=True)
tables = Q("SELECT table_name FROM information_schema.columns WHERE column_name = 'companyId' OR column_name = 'company_id' GROUP BY table_name", timeout=15)
print(f"Tables with companyId: {tables[:500]}", flush=True)

# 5. Check activity_logs
print("\n=== 5. ACTIVITY LOGS TABLE ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activity_logs' ORDER BY ordinal_position", timeout=15), flush=True)

# 6. Check ai_correction_queue for Flora
print("\n=== 6. AI CORRECTION QUEUE ===", flush=True)
print(Q("SELECT id, status, LEFT(\"userMessage\",100) AS msg, LEFT(\"aiResponse\",100) AS resp, \"createdAt\" FROM ai_correction_queue WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 10".format(FID)), flush=True)

# 7. Check what's happening with the 2 sender IDs
print("\n=== 7. SENDER IDs - USER INFO ===", flush=True)
for sid in ["cmlglmcii7cukjunzl87mca2g", "cmlglj3ke7cu4junzg17m0k0i", "cmn8wulhflkdgjuunz1ceuhxf"]:
    out = Q("SELECT id, name, email, role FROM users WHERE id = '{}'".format(sid))
    print(f"  {sid}:\n{out}", flush=True)

# 8. Flora company settings
print("\n=== 8. COMPANY SETTINGS ===", flush=True)
out = Q("SELECT id, name, settings FROM companies WHERE id = '{}'".format(FID))
print(out, flush=True)

# 9. Check for recent conversations with customer messages (actual conversations, not broadcasts)
print("\n=== 9. CONVERSATIONS WITH CUSTOMER MSGS RECENTLY ===", flush=True)
result = Q("""
SELECT c.id, c.channel, c.status, m."createdAt", LEFT(m.content, 150) AS msg
FROM conversations c
JOIN messages m ON m."conversationId" = c.id
WHERE c."companyId" = '{}' AND m."isFromCustomer" = true
ORDER BY m."createdAt" DESC LIMIT 15
""".format(FID))
print(result, flush=True)

# 10. Check ai_interactions columns for the company that has data
print("\n=== 10. SAMPLE AI INTERACTIONS (from company with data) ===", flush=True)
result = Q("SELECT \"companyId\", \"createdAt\", LEFT(\"userMessage\",80) AS msg, LEFT(\"aiResponse\",80) AS resp, \"modelUsed\" FROM ai_interactions LIMIT 5")
print(result, flush=True)

client.close()
print("\n[+] DONE", flush=True)
