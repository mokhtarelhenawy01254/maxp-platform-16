import gzip, os, sys

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')

# Find the first wp_posts INSERT and show surrounding lines
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    found_insert = False
    lines_after = 0
    for raw_line in f:
        if 'INSERT INTO `wp_posts`' in raw_line and not found_insert:
            found_insert = True
            sys.stderr.write(f"LINE (len={len(raw_line)}): {repr(raw_line[:100])}\n")
            lines_after = 0
            continue
        
        if found_insert:
            sys.stderr.write(f"NEXT {lines_after} (len={len(raw_line)}): {repr(raw_line[:150])}\n")
            lines_after += 1
            if lines_after >= 5:
                break
    
    if not found_insert:
        sys.stderr.write("No INSERT INTO `wp_posts` found!\n")
        sys.stderr.write("Searching for any INSERT...\n")
        # Go back to start
        f.seek(0)
        for i, raw_line in enumerate(f):
            if 'INSERT INTO' in raw_line:
                sys.stderr.write(f"Line {i}: {repr(raw_line[:200])}\n")
                if i >= 10:
                    break
