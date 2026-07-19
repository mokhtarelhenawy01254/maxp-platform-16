import json

with open(r'C:\Users\mokhtar\Downloads\swan_export\woo_batches\woo_batch_0404.json') as f:
    batch404 = json.load(f)
with open(r'C:\Users\mokhtar\Downloads\swan_export\woo_batches\woo_batch_0226.json') as f:
    batch226 = json.load(f)

of = batch404[0]
ok = batch226[0]

print('=== KEYS ===')
all_keys = set(list(of.keys()) + list(ok.keys()))
for k in sorted(all_keys):
    vf = of.get(k)
    vk = ok.get(k)
    diff = '' if type(vf) == type(vk) else ' DIFF'
    print(f'{k}: fail={type(vf).__name__}({str(vf)[:60]}) | ok={type(vk).__name__}({str(vk)[:60]}){diff}')

print()
bf = of.get('billing',{})
bok = ok.get('billing',{})
print('=== BILLING ===')
for k in sorted(set(list(bf.keys()) + list(bok.keys()))):
    print(f'{k}: fail="{bf.get(k)}" | ok="{bok.get(k)}"')

print()
print(f'fail line_items: {len(of.get("line_items",[]))}')
print(f'ok line_items: {len(ok.get("line_items",[]))}')
if of.get('line_items'):
    print(f'fail first: {json.dumps(of["line_items"][0], ensure_ascii=False)}')
if ok.get('line_items'):
    print(f'ok first: {json.dumps(ok["line_items"][0], ensure_ascii=False)}')
