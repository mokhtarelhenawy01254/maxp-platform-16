import subprocess, json, sys, time

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()

res = sh("""curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}'""")
token = json.loads(res)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

def chat(msg, session=None):
    import json as j
    if not session:
        s = sh('curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/sessions -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" -d \'{"agentId":"' + AGENT + '","title":"Test Batch"}\'')
        session = j.loads(s)["session"]["id"]
    msg_json = j.dumps(msg)
    res = sh('curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" -d \'{"sessionId":"' + session + '","message":' + msg_json + ',"agentId":"' + AGENT + '"}\'')
    return j.loads(res), session

tests = [
    "السلام عليكم",
    "عايز أشتري تلفون محمول",
    "عندكم إيه من أصناف؟",
    "أيه العروض المتاحة؟",
    "أيه الأكثر مبيعا عندكم النهارده؟",
    "عندي كود خصم SAVE10 مظبوط؟",
    "تكلفة الشحن كام؟",
    "توصلوا لمحافظة الأسكندرية؟",
    "أنا عميل قديم تعرف بياناتي؟",
    "عايز أعرف حالة الطلب بتاعي",
    "في حاجة تنصحيني أضيفها مع الطلب ده؟",
    "ممكن أحصل على خصم لو جبت بكمية كبيرة؟",
    "أيه العملاء اللي محتاجين متابعة؟",
    "تمام شكرا"
]

print(f"{'#':>2} | {'Test':<50} | {'Result':<8} | {'Tools':<4} | {'Latency':<8} | {'Model':<20}")
print("=" * 110)

session = None
passed = 0
failed = 0
issues = []

for i, msg in enumerate(tests, 1):
    d, session = chat(msg, session)
    r = d.get("data", d)
    reply = r.get("reply", "") or r.get("reply")
    error = r.get("error", r.get("code", ""))
    model = r.get("model", "")
    latency = r.get("latencyMs", 0)
    tools = r.get("toolCalls", [])
    
    status = "PASS" if (reply and len(reply) > 5) else "FAIL"
    
    if status == "PASS":
        passed += 1
    else:
        failed += 1
        issues.append(f"  [{i}] EMPTY REPLY: {msg[:50]}, error={error}")
    
    print(f"{i:2d} | {msg:<50} | {status:<8} | {len(tools):<4} | {latency:<8} | {model or 'N/A'}")

print("=" * 110)
print(f"\nPASS: {passed}/{len(tests)}  FAIL: {failed}/{len(tests)}")
if issues:
    print("\nIssues found:")
    for iss in issues:
        print(iss)
else:
    print("\nNo issues found!")
