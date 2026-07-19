import gzip, json, os, sys

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
OUT_DIR = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'swan_export')

product_names = {}
n_blocks = 0

def parse_insert_rows(data):
    rows = []
    current = ''
    depth = 0
    in_string = False
    sc = None
    i = 0
    n = len(data)
    while i < n:
        ch = data[i]
        if in_string:
            if ch == '\\' and i + 1 < n:
                current += ch + data[i+1]
                i += 2
                continue
            elif ch == sc:
                in_string = False
            current += ch
        elif ch in ("'", '"'):
            in_string = True
            sc = ch
            current += ch
        elif ch == '(':
            if depth == 0:
                current = '('
            else:
                current += ch
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                current += ch
                if current.strip():
                    rows.append(current)
                current = ''
            else:
                current += ch
        else:
            if depth > 0:
                current += ch
        i += 1
    return rows

def parse_row_cols(row_str):
    vals = []
    cur = ''
    in_s = False
    s = None
    j = 0
    rn = len(row_str)
    while j < rn:
        ch = row_str[j]
        if in_s:
            if ch == '\\' and j + 1 < rn:
                cur += ch + row_str[j+1]
                j += 2
                continue
            elif ch == s:
                in_s = False
            cur += ch
        elif ch in ("'", '"'):
            in_s = True
            s = ch
            cur += ch
        elif ch == ',':
            vals.append(cur.strip())
            cur = ''
        else:
            cur += ch
        j += 1
    if cur.strip():
        vals.append(cur.strip())
    return vals

def clean(val):
    val = val.strip()
    if val == 'NULL':
        return None
    if val.startswith("'") and val.endswith("'"):
        s = val[1:-1]
        s = s.replace("\\'", "'").replace("\\n", "\n").replace("\\\\", "\\")
        return s
    try:
        return int(val)
    except:
        pass
    try:
        return float(val)
    except:
        return val

sys.stderr.write("Scanning wp_posts for products (multi-line)...\n")

current_table = None
current_text = []

with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line:
            continue

        # Check if this starts a new INSERT block
        if line.startswith('INSERT INTO'):
            # Process previous block
            if current_table == 'wp_posts' and current_text:
                data = ' '.join(current_text)
                rows = parse_insert_rows(data)
                for rr in rows:
                    cols = parse_row_cols(rr)
                    if len(cols) < 22:
                        continue
                    pid_str = cols[0].lstrip('(')
                    if not pid_str.isdigit():
                        continue
                    post_type = str(clean(cols[20]) or '')
                    if post_type in ('product', 'product_variation'):
                        title = str(clean(cols[5]) or '')
                        product_names[pid_str] = title
                n_blocks += 1
                if n_blocks % 5 == 0:
                    sys.stderr.write(f"  {n_blocks} blocks, {len(product_names)} products\r")

            # Extract table name
            parts = line.split()
            if len(parts) >= 2:
                tbl = parts[1].strip('`')
                current_table = tbl
                current_text = []
                # Check if there's data on the same line
                vi = line.find('VALUES')
                if vi >= 0:
                    rest = line[vi + 6:].strip()
                    if rest:
                        if rest.endswith(';'):
                            rest = rest[:-1]
                        if rest:
                            current_text.append(rest)
            continue

        # Accumulate data lines
        if current_table == 'wp_posts' and line:
            add = line
            if add.endswith(';'):
                add = add[:-1]
            if add:
                current_text.append(add)

# Process last block
if current_table == 'wp_posts' and current_text:
    data = ' '.join(current_text)
    rows = parse_insert_rows(data)
    for rr in rows:
        cols = parse_row_cols(rr)
        if len(cols) < 22:
            continue
        pid_str = cols[0].lstrip('(')
        if not pid_str.isdigit():
            continue
        post_type = str(clean(cols[20]) or '')
        if post_type in ('product', 'product_variation'):
            title = str(clean(cols[5]) or '')
            product_names[pid_str] = title
    n_blocks += 1

sys.stderr.write(f"\nDone: {n_blocks} INSERT blocks, {len(product_names)} products\n")

# Save
with open(os.path.join(OUT_DIR, 'product_names.json'), 'w', encoding='utf8') as f:
    json.dump(product_names, f, ensure_ascii=False)

# Print some samples
simple = {k: v for k, v in product_names.items() if v}
sample = dict(list(simple.items())[:20])
print(json.dumps(sample, ensure_ascii=False, indent=2))
