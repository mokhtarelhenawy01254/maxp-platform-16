import gzip, os, sys

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')

n = 0
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        if 'INSERT INTO `wp_posts`' in raw_line:
            # Show first 300 chars
            sys.stderr.write(f"\nINSERT block: {raw_line[:300]}\n")
            sys.stderr.write(f"Full length: {len(raw_line)}\n")
            # Show last 100 chars
            sys.stderr.write(f"Ends: ...{raw_line[-100:]}\n")
            n += 1
            if n >= 3:
                break
