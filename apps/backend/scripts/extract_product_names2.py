import gzip, re
from pathlib import Path

dump = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"

variation_ids = {'500', '510', '505', '560', '565', '581', '635', '640', '450', '487', '425', '282'}

# Search for these in wp_posts
with gzip.open(dump, 'rt', encoding='utf8', errors='replace') as f:
    in_posts = False
    for line in f:
        if line.startswith("INSERT INTO `wp_posts`"):
            in_posts = True
            continue
        if in_posts:
            if line.rstrip().endswith(';'):
                break
            for m in re.finditer(r"\((\d+),(\d+),'(.*?)','(.*?)','(.*?)','(.*?)'", line):
                pid = m.group(1)
                ptitle = m.group(6)
                if pid in variation_ids:
                    print(f"ID={pid}: title='{ptitle}'")
                    variation_ids.remove(pid)

if variation_ids:
    print(f"\nNot found in wp_posts: {variation_ids}")
