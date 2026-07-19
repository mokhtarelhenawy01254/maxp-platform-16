import json, os, glob, re

base = os.path.expandvars(r'%USERPROFILE%\Downloads\swan_export')
batches_dir = os.path.join(base, 'woo_batches')
names_file = os.path.join(base, 'product_names.json')

with open(names_file) as f:
    product_names = json.load(f)  # {"556": "swan 54", ...}

pat = re.compile(r'^Product #(\d+)$')

batch_files = sorted(glob.glob(os.path.join(batches_dir, 'woo_batch_*.json')))
total_replaced = 0

for bf in batch_files:
    with open(bf) as f:
        orders = json.load(f)
    
    changed = False
    for order in orders:
        for item in order.get('line_items', []):
            m = pat.match(item.get('name', ''))
            if m:
                pid = m.group(1)
                if pid in product_names:
                    item['name'] = product_names[pid]
                    total_replaced += 1
                    changed = True
                # also fix product_id to int if it's a string
                if isinstance(item.get('product_id'), str):
                    item['product_id'] = int(item['product_id'])
    
    if changed:
        with open(bf, 'w', encoding='utf-8') as f:
            json.dump(orders, f, ensure_ascii=False)

print(f"Done. Updated {total_replaced} line item names across {len(batch_files)} batch files.")
