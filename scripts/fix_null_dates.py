import json, os, glob

batches_dir = os.path.expandvars(r'%USERPROFILE%\Downloads\swan_export\woo_batches')
batch_files = sorted(glob.glob(os.path.join(batches_dir, 'woo_batch_*.json')))

total_fixed = 0

for bf in batch_files:
    with open(bf) as f:
        orders = json.load(f)
    
    changed = False
    for order in orders:
        for key in ('date_created', 'date_created_gmt', 'wooCommerceDateCreated'):
            val = order.get(key)
            if val == 'NULL' or val == 'null' or val is None:
                order[key] = None
                changed = True
                total_fixed += 1
    
    if changed:
        with open(bf, 'w', encoding='utf-8') as f:
            json.dump(orders, f, ensure_ascii=False)

print(f'Fixed {total_fixed} date fields across {len(batch_files)} batch files')
