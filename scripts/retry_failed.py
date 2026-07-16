import json, requests, sys

BASE = 'http://153.92.223.119:3007/api/v1'
BATCHES_DIR = r'C:\Users\mokhtar\Downloads\swan_export\woo_batches'

s = requests.Session()
resp = s.post(BASE + '/auth/login', json={'email':'swan@h2m.com','password':'0165676135'})
token = resp.json()['data']['token']
s.headers.update({'Authorization': f'Bearer {token}'})
print(f'Logged in')

# Load the failed batch
with open(f'{BATCHES_DIR}\\woo_batch_0404.json') as f:
    orders = json.load(f)

print(f'Batch 0404 has {len(orders)} orders. Testing first 5...')
for order in orders[:5]:
    oid = order.get('id')
    resp = s.post(BASE + '/woocommerce/orders/import',
        json={'orders': [order], 'duplicateAction': 'skip'}, timeout=30)
    d = resp.json()
    if d['data']['failed'] > 0:
        print(f'  OID {oid}: FAILED')
    elif d['data']['imported'] > 0:
        print(f'  OID {oid}: IMPORTED OK')
    else:
        print(f'  OID {oid}: SKIPPED (already exists)')
