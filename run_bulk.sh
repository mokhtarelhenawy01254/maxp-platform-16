cat > /tmp/bulk_test.py <<'PYEOF'
import asyncio
import json
import sys
import os

# Load the file with phones
with open("/tmp/phones.txt") as f:
    lines = [l.strip() for l in f if l.strip()]

# Build items list
items = [{"companyId": "cmt25v7eb0008juhbath14ovl", "phoneNumber": p} for p in lines]
body = {"companyId": "cmt25v7eb0008juhbath14ovl", "items": items}
print(f"Submitting {len(items)} numbers via direct HTTP to the AI service...")

import urllib.request
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
except Exception as e:
    print(f"ERROR: {e}")
PYEOF
which python3
ls -la /tmp/phones.txt | head -3
PYEOF
