import gzip
import re
import json
import sys
import os
from datetime import datetime

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = [2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376]

# Extract wp_posts rows
posts = {}
current_table = None
buf = []

def try_parse_insert_line(line, table):
    m = re.match(r"INSERT INTO `(wp_posts|wp_postmeta|wp_woocommerce_order_items|wp_woocommerce_order_itemmeta)` VALUES\s*(.*?);\s*$", line, re.S | re.I)
    if m:
        return m.group(1), m.group(2)
    return None, None

def parse_values(values_str):
    rows = []
    current = ''
    depth = 0
    for ch in values_str:
        if ch == '(' and depth == 0:
            current = '('
            depth = 1
        elif ch == '(' and depth > 0:
            current += ch
            depth += 1
        elif ch == ')' and depth > 1:
            current += ch
            depth -= 1
        elif ch == ')' and depth == 1:
            current += ch
            rows.append(current)
            current = ''
            depth = 0
        else:
            if depth > 0:
                current += ch
    return rows

def clean_value(val):
    val = val.strip()
    if val == 'NULL':
        return None
    if val.startswith("'") and val.endswith("'"):
        s = val[1:-1]
        s = s.replace("\\'", "'").replace("\\n", "\n").replace("\\r", "\r")
        return s
    return val

def split_row(row_str):
    vals = []
    current = ''
    quote = None
    for ch in row_str[1:-1]:
        if quote:
            if ch == '\\':
                current += ch
            elif ch == quote:
                quote = None
            current += ch
        elif ch in ("'", '"'):
            quote = ch
            current += ch
        elif ch == ',':
            vals.append(clean_value(current))
            current = ''
        else:
            current += ch
    vals.append(clean_value(current))
    return vals

print("Reading SQL dump...", file=sys.stderr)
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        tbl, vals_str = try_parse_insert_line(line, current_table)
        if tbl and vals_str:
            raw_rows = parse_values(vals_str)
            if tbl == 'wp_posts':
                for rr in raw_rows:
                    cols = split_row(rr)
                    if len(cols) >= 4:
                        pid = cols[0]
                        if pid and pid.isdigit() and int(pid) in ORDER_IDS:
                            posts[int(pid)] = {
                                'id': int(pid),
                                'date_created': cols[2] if len(cols) > 2 else None,
                                'status': cols[7] if len(cols) > 7 else None,
                                'order_key': cols[11] if len(cols) > 11 else None,
                            }

print(f"Found {len(posts)} orders in wp_posts", file=sys.stderr)
for pid, p in sorted(posts.items()):
    print(f"  Order {pid}: status={p['status']}, date={p['date_created']}", file=sys.stderr)
