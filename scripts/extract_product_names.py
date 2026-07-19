import gzip, re, json, os, sys

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
OUT_DIR = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'swan_export')

product_names = {}
n_inserts = 0

with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line or 'INSERT INTO `wp_posts`' not in line:
            continue

        # Extract everything after VALUES
        idx = line.find('VALUES')
        if idx == -1:
            continue
        rest = line[idx + 6:].strip().lstrip()
        # Remove trailing ;
        if rest.endswith(';'):
            rest = rest[:-1]

        n_inserts += 1
        if n_inserts % 5 == 0:
            sys.stderr.write(f"  scanned {n_inserts} INSERT blocks\r")

        # Parse rows
        rows = []
        current = ''
        depth = 0
        in_string = False
        sc = None
        i = 0
        n = len(rest)
        while i < n:
            ch = rest[i]
            if in_string:
                if ch == '\\' and i + 1 < n:
                    current += ch + rest[i+1]
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
                    rows.append(current)
                    current = ''
                else:
                    current += ch
            else:
                if depth > 0:
                    current += ch
            i += 1

        for rr in rows:
            # Parse columns from this row
            vals = []
            cur = ''
            in_s = False
            s = None
            j = 0
            rn = len(rr)
            while j < rn:
                ch = rr[j]
                if in_s:
                    if ch == '\\' and j + 1 < rn:
                        cur += ch + rr[j+1]
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

            if len(vals) < 22:
                continue

            # Clean values
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

            pid_str = vals[0].lstrip('(')
            if not pid_str.isdigit():
                continue
            pid = int(pid_str)
            post_type = str(clean(vals[20]) or '')
            if post_type in ('product', 'product_variation'):
                title = str(clean(vals[5]) or '')
                product_names[pid] = title

sys.stderr.write(f"\nFound {len(product_names)} product names in {n_inserts} INSERT blocks\n")

# Save
with open(os.path.join(OUT_DIR, 'product_names.json'), 'w', encoding='utf8') as f:
    json.dump(product_names, f, ensure_ascii=False)

# Print summary
products = {k: v for k, v in product_names.items() if isinstance(v, str) and v}
print(json.dumps(products, ensure_ascii=False))
