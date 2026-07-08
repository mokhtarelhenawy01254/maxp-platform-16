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

# 1. Users table schema
print("=== 1. USERS SCHEMA ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position", timeout=15), flush=True)

# 2. Users for Flora with correct columns
print("\n=== 2. FLORA USERS ===", flush=True)
print(Q("""
SELECT id, username, email, role, status 
FROM users WHERE "companyId" = '{}' LIMIT 20
""".format(FID)), flush=True)

# 3. The two big sender IDs from messages
print("\n=== 3. TOP SENDER USERS ===", flush=True)
for sid in ["cmlglmcii7cukjunzl87mca2g", "cmlglj3ke7cu4junzg17m0k0i", "cmn8wulhflkdgjuunz1ceuhxf"]:
    out = Q("SELECT id, username, email, role, status FROM users WHERE id = '{}'".format(sid))
    print(f"  {sid}:\n{out}", flush=True)

# 4. Check ai_keys table
print("\n=== 4. AI KEYS TABLE ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_keys' ORDER BY ordinal_position", timeout=15), flush=True)

# 5. AI keys for Flora  
print("\n=== 5. FLORA AI KEYS ===", flush=True)
print(Q("SELECT id, name, provider, status FROM ai_keys WHERE \"companyId\" = '{}'".format(FID)), flush=True)

# 6. Check ai_failure_logs for Flora
print("\n=== 6. AI FAILURE LOGS ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_failure_logs' ORDER BY ordinal_position", timeout=15), flush=True)
print(Q("SELECT id, \"companyId\", \"errorMessage\", \"createdAt\" FROM ai_failure_logs WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 10".format(FID)), flush=True)

# 7. Check ai_agent_runs
print("\n=== 7. AI AGENT RUNS ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_agent_runs' ORDER BY ordinal_position", timeout=15), flush=True)
out = Q("SELECT id, status, \"agentId\", \"createdAt\" FROM ai_agent_runs WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 10".format(FID))
print(f"  Flora:\n{out}", flush=True)

# Check total
out = Q("SELECT COUNT(*) FROM ai_agent_runs WHERE \"companyId\" = '{}'".format(FID))
print(f"  Total runs: {out}", flush=True)

# 8. Check ai_runtime_ledger for Flora
print("\n=== 8. AI RUNTIME LEDGER ===", flush=True)
out = Q("SELECT id, \"companyId\", status, \"createdAt\" FROM ai_runtime_ledger WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 10".format(FID))
print(f"  Flora:\n{out}", flush=True)
out = Q("SELECT \"companyId\", COUNT(*) FROM ai_runtime_ledger GROUP BY \"companyId\" ORDER BY COUNT(*) DESC LIMIT 10")
print(f"  By company:\n{out}", flush=True)

# 9. Check the working company's AI keys/agents for comparison
print("\n=== 9. WORKING COMPANY (cmlc65tfr...) ===", flush=True)
print(Q("SELECT id, name FROM companies WHERE id = 'cmlc65tfr0000jutofd95qi23'"), flush=True)
print(Q("SELECT id, name, provider, status FROM ai_keys WHERE \"companyId\" = 'cmlc65tfr0000jutofd95qi23'"), flush=True)

# 10. Check agent table structure
print("\n=== 10. AGENTS TABLE ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agents' ORDER BY ordinal_position", timeout=15), flush=True)

# 11. Agents for Flora
print("\n=== 11. FLORA AGENTS ===", flush=True)
print(Q("SELECT id, name, slug, role, status FROM agents WHERE \"companyId\" = '{}' LIMIT 20".format(FID)), flush=True)

# 12. Activity logs for Flora - AI related
print("\n=== 12. ACTIVITY LOGS FOR FLORA ===", flush=True)
print(Q("""
SELECT action, category, severity, COUNT(*) 
FROM activity_logs 
WHERE "companyId" = '{}'
AND category IN ('ai','agent','system','error')
GROUP BY action, category, severity 
ORDER BY COUNT(*) DESC LIMIT 20
""".format(FID)), flush=True)

# 13. Recent activity errors for Flora
print("\n=== 13. RECENT ERRORS ===", flush=True)
print(Q("""
SELECT "createdAt", action, category, "errorMessage"
FROM activity_logs 
WHERE "companyId" = '{}' AND severity = 'error'
ORDER BY "createdAt" DESC LIMIT 10
""".format(FID)), flush=True)

# 14. Check the FB broadcast pattern - are these from an agent or direct?
print("\n=== 14. BROADCAST MESSAGE COUNT PER DAY ===", flush=True)
print(Q("""
SELECT DATE(m."createdAt") AS day, COUNT(*) 
FROM messages m 
JOIN conversations c ON m."conversationId" = c.id 
WHERE c."companyId" = '{}' AND m."isFromCustomer" = false
GROUP BY day ORDER BY day DESC LIMIT 14
""".format(FID)), flush=True)

client.close()
print("\n[+] DONE", flush=True)
