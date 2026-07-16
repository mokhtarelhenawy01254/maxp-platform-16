import gzip, re, sys, os

path = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = {2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376}
pat = re.compile(r"INSERT INTO `(wp_posts)` VALUES\s*(.*)", re.I)

print("Looking for first wp_posts INSERT...", file=sys.stderr)
with gzip.open(path, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line: continue
        m = pat.match(line)
        if m:
            rest = (m.group(2) or '').strip()
            if rest:
                print("Single-line INSERT with data!", file=sys.stderr)
                print(f"  Data length: {len(rest)}", file=sys.stderr)
                for oid in ORDER_IDS:
                    if f'({oid},' in rest:
                        print(f"  FOUND #{oid} in data!", file=sys.stderr)
            else:
                print("Multi-line INSERT, reading data lines...", file=sys.stderr)
                data_lines = []
                cnt = 0
                for nl in f:
                    nl = nl.strip()
                    if not nl: continue
                    cnt += 1
                    if cnt <= 3:
                        print(f"  Line {cnt}: {nl[:100]}...", file=sys.stderr)
                    if nl.endswith(');'):
                        data_lines.append(nl[:-1])
                        print(f"  Last line: {nl[:100]}...", file=sys.stderr)
                        print(f"  Total lines: {cnt}", file=sys.stderr)
                        break
                    data_lines.append(nl)
                data = ','.join(data_lines)
                print(f"  Data length: {len(data)}", file=sys.stderr)
                for oid in ORDER_IDS:
                    idx = data.find(f'({oid},')
                    if idx >= 0:
                        print(f"  FOUND #{oid} at position {idx}!", file=sys.stderr)
                        print(f"    Context: {data[max(0,idx-5):idx+50]}", file=sys.stderr)
                if not any(f'({oid},' in data for oid in ORDER_IDS):
                    print("  ERROR: No ORDER_IDS found in data!", file=sys.stderr)
                    print(f"  First 300 chars: {data[:300]}", file=sys.stderr)
                    print(f"  Searching for '(657,': {'(657,' in data}", file=sys.stderr)
                    # Look for 657 anywhere
                    for oid in list(ORDER_IDS)[:3]:
                        pos = data.find(str(oid))
                        if pos >= 0:
                            print(f"    Found '{oid}' at pos {pos}, context: {data[max(0,pos-10):pos+30]}", file=sys.stderr)
            break
