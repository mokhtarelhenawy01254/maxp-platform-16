"""
Extract product names from wp_posts for our product IDs
"""
import gzip, re, json
from pathlib import Path

dump_file = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"
out_dir = Path.home() / "Downloads" / "swan_export"

ids_data = json.load(open(out_dir / "stage1_ids.json"))
product_ids = set(ids_data['product_ids'])
variation_ids = set(ids_data['variation_ids'])

all_targets = product_ids | variation_ids
products = {}
variations = {}
orders = {}

def parse_vals(text):
    text = text.strip().strip(',').strip(';')
    if text.startswith('(') and text.endswith(')'):
        text = text[1:-1]
    elif text.startswith('('):
        text = text[1:]
    vals = []
    cur = ''
    instr = False
    esc = False
    depth = 0
    for ch in text:
        if esc: cur += ch; esc = False; continue
        if ch == '\\' and instr: esc = True; cur += ch; continue
        if ch == "'": instr = not instr; continue
        if instr: cur += ch; continue
        if ch == '(': depth += 1; cur += ch; continue
        if ch == ')': depth -= 1; cur += ch; continue
        if ch == ',' and depth == 0: vals.append(cur.strip()); cur = ''; continue
        cur += ch
    if cur.strip(): vals.append(cur.strip())
    return vals

with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        if line.startswith("INSERT INTO `wp_posts`"):
            full = line
            for nl in f:
                full += nl
                if nl.rstrip().endswith(';'):
                    break
            for m in re.finditer(r"\([^)]+\)", full):
                vals = parse_vals(m.group(0))
                if len(vals) >= 21:
                    pid = vals[0]
                    ptype = vals[20]
                    if pid in all_targets and ptype in ('product', 'product_variation'):
                        entry = {
                            'title': vals[5],  # post_title
                            'status': vals[7],  # post_status
                            'date': vals[2],    # post_date
                            'name': vals[11],   # post_name
                            'parent': vals[17], # post_parent
                            'order_key': vals[10], # post_password
                        }
                        if ptype == 'product':
                            products[pid] = entry
                        else:
                            variations[pid] = entry
                    elif ptype == 'shop_order':
                        orders[pid] = {
                            'title': vals[5],
                            'status': vals[7],
                            'date': vals[2],
                            'name': vals[11],
                            'order_key': vals[10],
                        }

print(f"Products: {len(products)}, Variations: {len(variations)}, Orders: {len(orders)}")
json.dump(products, open(out_dir / "products.json", 'w', encoding='utf8'), ensure_ascii=False)
json.dump(variations, open(out_dir / "variations.json", 'w', encoding='utf8'), ensure_ascii=False)
json.dump(orders, open(out_dir / "orders_meta.json", 'w', encoding='utf8'), ensure_ascii=False)
print("Saved products.json, variations.json, orders_meta.json")
