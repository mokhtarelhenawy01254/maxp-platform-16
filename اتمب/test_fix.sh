#!/bin/bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"\0639\0627\064a\0632 \0623\0634\062a\0631\064a \062a\0644\0641\0648\0646 \0645\062d\0645\0648\0644","agentId":"agent_Aj64Ho82vj0Z-UO34XWbdQ"}' > /tmp/r4.json

python3 -c "
import json
with open('/tmp/r4.json') as f:
    d = json.load(f)
print('Success:', d.get('success'))
if not d.get('success'):
    print('Error:', d.get('error'), 'Code:', d.get('code'))
else:
    r = d.get('data', {})
    print('Model:', r.get('model'))
    print('Provider:', r.get('provider'))
    print('Latency:', r.get('latencyMs'))
    print('Reply:', (r.get('reply') or '')[:400])
    for t in r.get('toolCalls', []):
        inp = json.dumps(t.get('input'), ensure_ascii=False)
        print(f'  {t.get(\"name\")}: input={inp} status={t.get(\"status\")}')
"
