"""
Full Swan SQL Dump Parser - Extract all orders and products from wp_posts
"""
import gzip, re, json, csv
from pathlib import Path
from io import StringIO

dump_dir = Path.home() / "Downloads"
dump_file = dump_dir / "u339372869_cv6D7.20260715113030 (1).sql.gz"
out_dir = dump_dir / "swan_export"
out_dir.mkdir(exist_ok=True)

print(f"Parsing {dump_file}...")

orders = {}
products = {}
variations = {}

# Column order for wp_posts:
# ID, post_author, post_date, post_date_gmt, post_content, post_title,
# post_excerpt, post_status, comment_status, ping_status, post_password,
# post_name, to_ping, pinged, post_modified, post_modified_gmt,
# post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count

def parse_sql_row(row_text):
    """Parse a single SQL value row like (1,2,'text','more text',...) -> list of values"""
    row_text = row_text.strip().strip(',').strip(';')
    if not row_text or row_text == '()':
        return []
    # Remove outer parens if present
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

print("=== Scanning wp_posts ===")
with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    in_posts = False
    post_count = 0
    for line in f:
        if line.startswith("INSERT INTO `wp_posts`"):
            in_posts = True
            full_text = line
            # Read continuation lines
            for next_line in f:
                full_text += next_line
                if next_line.rstrip().endswith(';'):
                    break
            # Parse all rows
            # Find all value tuples
            for m in re.finditer(r"\([^)]+\),[ \t]*\n?", full_text):
                row_str = m.group(0).rstrip().rstrip(',').rstrip()
                vals = parse_sql_row(row_str)
                if len(vals) >= 21:
                    pid = vals[0]
                    ptype = vals[20]  # post_type
                    ptitle = vals[5]   # post_title
                    pstatus = vals[7]  # post_status
                    pdate = vals[2]    # post_date
                    pname = vals[11]   # post_name
                    pparent = vals[17] # post_parent
                    pkey = vals[10]    # post_password (order_key)

                    if ptype == 'shop_order':
                        orders[pid] = {
                            'title': ptitle, 'status': pstatus, 'date': pdate,
                            'name': pname, 'order_key': pkey, 'parent': pparent
                        }
                    elif ptype in ('product', 'product_variation'):
                        if ptype == 'product_variation':
                            variations[pid] = {'title': ptitle, 'parent': pparent}
                        else:
                            products[pid] = {'title': ptitle, 'status': pstatus}

                    post_count += 1
                    if post_count % 20000 == 0:
                        print(f"  Parsed {post_count:,} posts...")

            in_posts = False

print(f"\nResults:")
print(f"  Orders: {len(orders):,}")
print(f"  Products: {len(products):,}")
print(f"  Variations: {len(variations):,}")

# Save order IDs for next pass
with open(out_dir / "order_ids.txt", 'w') as f:
    for pid in orders:
        f.write(f"{pid}\n")

# Status breakdown
from collections import Counter
statuses = Counter(o['status'] for o in orders.values())
print(f"\nOrder statuses:")
for s, c in statuses.most_common():
    print(f"  {s}: {c:,}")

# Save sample
sample = dict(list(orders.items())[:5])
print(f"\nSample orders:")
for pid, o in sample.items():
    print(f"  {pid}: {o['title']} | {o['status']} | {o['date']}")
