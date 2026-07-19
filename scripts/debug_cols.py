import gzip, re, json, os, sys

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')

n_inserts = 0
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line or 'INSERT INTO `wp_posts`' not in line:
            continue
        
        idx = line.find('VALUES')
        rest = line[idx + 6:].strip().lstrip()
        if rest.endswith(';'):
            rest = rest[:-1]
        
        n_inserts += 1
        
        # Parse first row only of each block for debugging
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
        
        if n_inserts <= 3:
            first_row = rows[0] if rows else 'NO ROWS'
            r = first_row[:200] if isinstance(first_row, str) else first_row
            sys.stderr.write(f"\nBlock {n_inserts}: {len(rows)} rows\n  First: {r}\n")

        # Show first few rows' post_type and title
        for ri, rr in enumerate(rows[:3]):
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
            
            if len(vals) >= 22:
                def clean(val):
                    val = val.strip()
                    if val == 'NULL': return None
                    if val.startswith("'") and val.endswith("'"):
                        s = val[1:-1]
                        s = s.replace("\\'", "'").replace("\\n", "\n").replace("\\\\", "\\")
                        return s
                    try: return int(val)
                    except: pass
                    try: return float(val)
                    except: return val
                
                pid = vals[0].lstrip('(')
                post_type = str(clean(vals[20]) or '')
                title = str(clean(vals[5]) or '')
                status = str(clean(vals[7]) or '')
                sys.stderr.write(f"  Row {ri}: ID={pid}, cols={len(vals)}, post_type='{post_type}', title='{title[:50]}', status='{status}'\n")
        
        if n_inserts >= 5:
            break

sys.stderr.write(f"\nTotal: {n_inserts} INSERT blocks scanned\n")
