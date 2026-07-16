import json, requests

BASE = 'http://153.92.223.119:3007/api/v1'
s = requests.Session()
resp = s.post(BASE + '/auth/login', json={'email':'swan@h2m.com','password':'0165676135'})
token = resp.json()['data']['token']
s.headers.update({'Authorization': f'Bearer {token}'})

with open(r'C:\Users\mokhtar\Downloads\swan_export\woo_batches\woo_batch_0404.json') as f:
    orders = json.load(f)

print(f"Testing {len(orders[:10])} orders individually...")
for order in orders[:10]:
    oid = order.get('id')
    resp = s.post(BASE + '/woocommerce/orders/import',
        json={'orders': [order], 'duplicateAction': 'skip'}, timeout=30)
    d = resp.json()
    status = 'FAIL' if d['data']['failed'] > 0 else 'OK'
    b = order.get('billing',{})
    print(f'OID {oid}: {status} | name={b.get("first_name","")} | phone={b.get("phone","")} | total={order.get("total")} | status={order.get("status")}')
