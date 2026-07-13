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

# 1. Check aiEnabled on Flora conversations
print("=== 1. AI ENABLED ON CONVERSATIONS ===", flush=True)
print(Q("SELECT \"aiEnabled\", COUNT(*) FROM conversations WHERE \"companyId\" = '{}' GROUP BY \"aiEnabled\"".format(FID)), flush=True)

# 2. Sample messages from busiest conversations - are they from customer or agent?
print("\n=== 2. SAMPLE MESSAGES (5 most recent from busiest conv) ===", flush=True)
result = Q("""
SELECT m.id, m.\"isFromCustomer\", m.type, LEFT(m.content,150) AS content_snippet, m.\"createdAt\"
FROM messages m
JOIN conversations c ON m.\"conversationId\" = c.id
WHERE c.\"companyId\" = '{}'
ORDER BY m.\"createdAt\" DESC LIMIT 20
""".format(FID))
print(result, flush=True)

# 3. Check who sent the non-customer messages (AI or human)
print("\n=== 3. NON-CUSTOMER MESSAGES SAMPLE ===", flush=True)
result = Q("""
SELECT m.\"senderId\", LEFT(m.content,120) AS snippet, m.type, m.\"createdAt\"
FROM messages m
JOIN conversations c ON m.\"conversationId\" = c.id
WHERE c.\"companyId\" = '{}' AND m.\"isFromCustomer\" = false
AND m.\"senderId\" IS NOT NULL
ORDER BY m.\"createdAt\" DESC LIMIT 15
""".format(FID))
print(result, flush=True)

# 4. Check sender IDs to find AI agent system user
print("\n=== 4. UNIQUE SENDER IDs (non-customer) ===", flush=True)
print(Q("""
SELECT m.\"senderId\", COUNT(*) 
FROM messages m
JOIN conversations c ON m.\"conversationId\" = c.id
WHERE c.\"companyId\" = '{}' AND m.\"isFromCustomer\" = false AND m.\"senderId\" IS NOT NULL
GROUP BY m.\"senderId\" ORDER BY COUNT(*) DESC LIMIT 10
""".format(FID)), flush=True)

# 5. What model is configured for Flora?
print("\n=== 5. COMPANY SETTINGS (AI config) ===", flush=True)
print(Q("SELECT \"aiToolsEnabled\", settings FROM companies WHERE id = '{}'".format(FID)), flush=True)

# 6. Check that ai_interactions has anything at all
print("\n=== 6. AI INTERACTIONS TOTAL (any company) ===", flush=True)
print(Q("SELECT \"companyId\", COUNT(*) FROM ai_interactions GROUP BY \"companyId\" ORDER BY COUNT(*) DESC LIMIT 10"), flush=True)

# 7. Check if the messages table has AI-generated content patterns
print("\n=== 7. SAMPLE AI-LIKE MESSAGES (non-customer, recent) ===", flush=True)
result = Q("""
SELECT LEFT(m.content,200) AS snippet, m.\"createdAt\"
FROM messages m
JOIN conversations c ON m.\"conversationId\" = c.id
WHERE c.\"companyId\" = '{}' AND m.\"isFromCustomer\" = false
AND LENGTH(m.content) > 50
ORDER BY m.\"createdAt\" DESC LIMIT 10
""".format(FID))
print(result, flush=True)

# 8. Messages table total count
print("\n=== 8. MESSAGES TOTAL FOR FLORA ===", flush=True)
print(Q("SELECT COUNT(*) AS total_messages FROM messages m JOIN conversations c ON m.\"conversationId\" = c.id WHERE c.\"companyId\" = '{}'".format(FID)), flush=True)

# 9. Customer messages vs Agent messages
print("\n=== 9. CUSTOMER VS AGENT MESSAGES ===", flush=True)
print(Q("""
SELECT m.\"isFromCustomer\", COUNT(*)
FROM messages m
JOIN conversations c ON m.\"conversationId\" = c.id
WHERE c.\"companyId\" = '{}'
GROUP BY m.\"isFromCustomer\"
""".format(FID)), flush=True)

# 10. Check activity_log for AI responses to Flora
print("\n=== 10. AI-RELATED ACTIVITY LOG ===", flush=True)
print(Q("""
SELECT action, entity_type, COUNT(*)
FROM activity_logs
WHERE \"companyId\" = '{}' 
AND entity_type IN ('ai','message','conversation')
AND action IN ('ai_response','ai_error','message_sent')
GROUP BY action, entity_type ORDER BY COUNT(*) DESC LIMIT 10
""".format(FID)), flush=True)

client.close()
print("\n[+] DONE", flush=True)
