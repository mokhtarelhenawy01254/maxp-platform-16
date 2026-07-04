import subprocess, json

proc = subprocess.run([
    "curl", "-s", "-X", "POST",
    "http://127.0.0.1:3007/api/v1/auth/login",
    "-H", "Content-Type: application/json",
    "-d", '{"email":"swan@h2m.com","password":"0165676135"}'
], capture_output=True, text=True)
token = json.loads(proc.stdout)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

tests = [
    "السلام عليكم",
    "عايز أشتري هدية لمراتي",
    "عايز شنطة",
    "أيه العروض المتاحة؟",
    "تكلفة الشحن كام؟",
    "عايز أعرف حالة الطلب بتاعي",
]

for i, msg in enumerate(tests, 1):
    body = json.dumps({"message": msg, "agentId": AGENT})
    proc = subprocess.run([
        "curl", "-s", "-X", "POST",
        "http://127.0.0.1:3007/api/v1/ai-sandbox/chat",
        "-H", "Content-Type: application/json",
        "-H", "Authorization: Bearer " + token,
        "-d", body
    ], capture_output=True, text=True)
    d = json.loads(proc.stdout)
    
    reply = d.get("reply", "") or ""
    tools = d.get("toolCalls", [])
    model = d.get("model", "N/A")
    lat = d.get("latencyMs", 0)
    ok = d.get("success", False)
    
    status = "PASS" if (ok and reply) else "FAIL"
    print(f"#{i} | {status} | {model} | {lat}ms | Tools:{len(tools)}")
    print(f"  U: {msg}")
    r = reply[:200].replace("\n", " ")
    print(f"  A: {r}...")
    if tools:
        for t in tools:
            inp = json.dumps(t.get("input", {}), ensure_ascii=False)
            print(f"  [{t.get('name')}] {inp[:100]}")
    print()
