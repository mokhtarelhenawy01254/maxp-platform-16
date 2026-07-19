import gzip, re, json
from pathlib import Path

dump_dir = Path.home() / "Downloads"
dump_file = dump_dir / "u339372869_cv6D7.20260715113030 (1).sql.gz"
out_dir = dump_dir / "swan_export"

orders = {}
products = {}
variations = {}

def parse_sql_row(row_text):
    row_text = row_text.strip().strip(',').strip(';')
    if not row_text or row_text == '()':
        return []
    if row_text.startswith('(') and row_text.endswith(')'):
        row_text = row_text[1:-1]
    elif row_text.startswith('('):
        row_text = row_text[1:]
    values = []
    current = ''
    in_str = False
    escape = False
    depth = 0
    for ch in row_text:
        if escape:
            current += ch
            escape = False
            continue
        if ch == '\\' and in_str:
            escape = True
            continue
        if ch == "'" and in_str:
            in_str = False
            continue
        if ch == "'" and not in_str:
            in_str = True
            continue
        if in_str:
            current += ch
            continue
        if ch == '(':
            depth += 1
            current += ch
            continue
        if ch == ')':
            depth -= 1
            current += ch
            continue
        if ch == ',' and depth == 0:
            values.append(current.strip())
            current = ''
            continue
        current += ch
    if current.strip():
        values.append(current.strip())
    return values

print("Scanning wp_posts...")
with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    in_posts = False
    for line in f:
        if line.startswith("INSERT INTO `wp_posts`"):
            in_posts = True
            full_text = line
            for nl in f:
                full_text += nl
                if nl.rstrip().endswith(';'):
                    break
            for m in re.finditer(r"\([^)]+\)", full_text):
                row_str = m.group(0)
                vals = parse_sql_row(row_str)
                if len(vals) >= 21:
                    pid = vals[0]
                    ptype = vals[20]
                    ptitle = vals[5]
                    pstatus = vals[7]
                    pdate = vals[2]
                    pname = vals[11]
                    pparent = vals[17]
                    pkey = vals[10]
                    if ptype == 'shop_order':
                        orders[pid] = {
                            'title': ptitle, 'status': pstatus, 'date': pdate,
                            'name': pname, 'order_key': pkey, 'parent': pparent
                        }
                    elif ptype == 'product':
                        products[pid] = {'title': ptitle, 'status': pstatus}
                    elif ptype == 'product_variation':
                        variations[pid] = {'title': ptitle, 'parent': pparent}
            in_posts = False

data = {
    'order_ids': list(orders.keys()),
    'product_ids': list(products.keys()),
    'variation_ids': list(variations.keys()),
    'counts': {'orders': len(orders), 'products': len(products), 'variations': len(variations)}
}
json.dump(data, open(out_dir / "stage1_ids.json", 'w'))
print(f"Saved: {len(orders):,} orders, {len(products):,} products, {len(variations):,} variations")
