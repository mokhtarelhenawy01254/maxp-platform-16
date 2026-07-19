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

# 1. Flora users properly
print("=== 1. FLORA USERS ===", flush=True)
print(Q("SELECT id, \"firstName\", \"lastName\", email, role, \"isActive\" FROM users WHERE \"companyId\" = '{}' LIMIT 20".format(FID)), flush=True)

# 2. Top sender users
print("\n=== 2. TOP SENDER USER INFO ===", flush=True)
for sid in ["cmlglmcii7cukjunzl87mca2g", "cmlglj3ke7cu4junzg17m0k0i", "cmn8wulhflkdgjuunz1ceuhxf"]:
    out = Q("SELECT id, \"firstName\", \"lastName\", email, role, \"isActive\" FROM users WHERE id = '{}'".format(sid))
    print(f"  {sid}:\n{out}", flush=True)

# 3. Flora AI keys (correct column)
print("\n=== 3. FLORA AI KEYS ===", flush=True)
print(Q("SELECT id, name, provider, \"isActive\", \"keyType\" FROM ai_keys WHERE \"companyId\" = '{}'".format(FID)), flush=True)

# 4. Wofod AI keys for comparison
print("\n=== 4. WOFOD AI KEYS ===", flush=True)
print(Q("SELECT id, name, provider, \"isActive\", \"keyType\" FROM ai_keys WHERE \"companyId\" = 'cmlc65tfr0000jutofd95qi23'"), flush=True)

# 5. Flora agents (using company_id)
print("\n=== 5. FLORA AGENTS ===", flush=True)
print(Q("SELECT id, name, role, status, model, template_slug FROM agents WHERE company_id = '{}'".format(FID)), flush=True)

# 6. AI runtime ledger details for Flora - what are these 17162 entries?
print("\n=== 6. RUNTIME LEDGER STATUS BREAKDOWN ===", flush=True)
print(Q("SELECT status, COUNT(*) FROM ai_runtime_ledger WHERE \"companyId\" = '{}' GROUP BY status".format(FID)), flush=True)

# 7. Sample ledger entries
print("\n=== 7. RUNTIME LEDGER SAMPLE ===", flush=True)
out = Q("""
SELECT id, status, "createdAt", "conversationId", "userMessageId", "outputMessageId"
FROM ai_runtime_ledger 
WHERE "companyId" = '{}' 
ORDER BY "createdAt" DESC LIMIT 10
""".format(FID))
print(out, flush=True)

# 8. Check ai_provider_logs for Flora
print("\n=== 8. AI PROVIDER LOGS ===", flush=True)
print(Q("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_provider_logs' ORDER BY ordinal_position", timeout=15), flush=True)
out = Q("SELECT id, provider, model, status, \"createdAt\" FROM ai_provider_logs WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 10".format(FID))
print(f"  Flora:\n{out}", flush=True)

# 9. Delivery outbox for Flora
print("\n=== 9. AI DELIVERY OUTBOX ===", flush=True)
print(Q("SELECT id, status, \"messageType\", \"createdAt\" FROM ai_delivery_outbox WHERE \"companyId\" = '{}' ORDER BY \"createdAt\" DESC LIMIT 10".format(FID)), flush=True)

# 10. Check if there are agent-handled conversations (with assignedUserId)
print("\n=== 10. CONVOS WITH ASSIGNED USER ===", flush=True)
print(Q("""
SELECT "assignedUserId", COUNT(*) 
FROM conversations 
WHERE "companyId" = '{}' AND "assignedUserId" IS NOT NULL 
GROUP BY "assignedUserId" ORDER BY COUNT(*) DESC
""".format(FID)), flush=True)

# 11. Customer messages that got NO response (last message is from customer)
print("\n=== 11. CONVOS LAST MSG FROM CUSTOMER (unanswered) ===", flush=True)
print(Q("""
SELECT COUNT(*)
FROM conversations 
WHERE "companyId" = '{}' AND "lastMessageIsFromCustomer" = true AND status = 'ACTIVE'
""".format(FID)), flush=True)

# 12. Check the status of the two main sender accounts
print("\n=== 12. AGENTS TABLE (2 senders) ===", flush=True)
for sid in ["cmlglmcii7cukjunzl87mca2g", "cmlglj3ke7cu4junzg17m0k0i"]:
    out = Q("SELECT id, name, role, status, model, template_slug FROM agents WHERE id = '{}'".format(sid))
    print(f"  Agent {sid}:\n{out}", flush=True)

client.close()
print("\n[+] DONE", flush=True)
