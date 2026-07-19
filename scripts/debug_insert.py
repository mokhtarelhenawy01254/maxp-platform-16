import gzip, re, sys, os

path = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = {2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376}
pat = re.compile(r"INSERT INTO `(wp_posts|wp_postmeta)` VALUES\s*(.*)", re.I)

with gzip.open(path, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        m = pat.match(line)
        if m:
            tbl = m.group(1)
            rest = (m.group(2) or '').strip()
            print(f"INSERT {tbl}: rest_present={bool(rest)}", file=sys.stderr)
            if tbl == 'wp_posts' and not rest:
                # Multi-line: skip to end and collect data
                data_lines = []
                for nl in f:
                    nl = nl.strip()
                    if not nl: continue
                    data_lines.append(nl)
                    if nl.endswith(');'):
                        break
                combined = ','.join(data_lines)
                for oid in ORDER_IDS:
                    if str(oid) in combined:
                        print(f"  MULTI FOUND #{oid}", file=sys.stderr)
                print(f"  First 100: {data_lines[0][:100]}", file=sys.stderr)
                print(f"  Last 100: {data_lines[-1][:100]}", file=sys.stderr)
                break
