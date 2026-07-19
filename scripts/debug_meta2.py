import gzip, re, sys, os

path = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = {2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376}
pat = re.compile(r"INSERT INTO `wp_postmeta` VALUES\s*(.*)", re.I)

found_blocks = []
block_num = 0
block_data = ''
in_block = False

with gzip.open(path, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        m = pat.match(line)
        if m:
            if block_data:
                found = [oid for oid in ORDER_IDS if f'({oid},' in block_data]
                if found: found_blocks.append((block_num, found, len(block_data)))
            in_block = True
            block_num += 1
            block_data = ''
            rest = (m.group(1) or '').strip()
            if rest:
                if rest.endswith(';'): rest = rest[:-1]
                if rest.endswith(')'):
                    found = [oid for oid in ORDER_IDS if f'({oid},' in rest]
                    if found: found_blocks.append((block_num, found, len(rest)))
                    in_block = False
                else:
                    block_data = rest
            continue
        if in_block:
            if line.endswith(');'):
                block_data += line[:-1]
                found = [oid for oid in ORDER_IDS if f'({oid},' in block_data]
                if found: found_blocks.append((block_num, found, len(block_data)))
                in_block = False
                block_data = ''
            else:
                block_data += line

for bn, ids, sz in found_blocks:
    print(f"Block {bn}: IDs={sorted(ids)}, size={sz}", file=sys.stderr)
print(f"Total matched blocks: {len(found_blocks)}", file=sys.stderr)
