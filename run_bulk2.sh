ls -la /tmp/phones.txt
echo "--- Python check ---"
which python3 || which python
ls /var/www/ai-service/.venv/bin/python*
echo "--- File contents ---"
head -3 /tmp/phones.txt
echo "--- Running bulk test ---"
cd /var/www/ai-service
./.venv/bin/python - <<'PYEOF'
import json
import urllib.request

with open("/tmp/phones.txt") as f:
    lines = [l.strip() for l in f if l.strip()]

items = [{"companyId": "cmt25v7eb0008juhbath14ovl", "phoneNumber": p} for p in lines]
body = {"companyId": "cmt25v7eb0008juhbath14ovl", "items": items}
print(f"Submitting {len(items)} numbers via direct HTTP to the AI service...")

req = urllib.request.Request(
    "http://localhost:8000/admin/whatsapp-ai-ignore-list/bulk",
    data=json.dumps(body).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        print(f"HTTP {resp.status}")
        print(f"inserted={result.get('inserted')}, skipped={result.get('skipped')}")
        if result.get('entries'):
            print(f"first 3 inserted: {[e.get('phoneNumber') for e in result['entries'][:3]]}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
PYEOF
