import gzip, re
from pathlib import Path

dump = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"
target_orders = {'657', '661', '2373', '2374', '2375', '2376', '3011', '3040', '3081', '3121'}

with gzip.open(dump, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        # Check for order items table
        if "INSERT INTO `wp_woocommerce_order_items`" in line:
            print("=== wp_woocommerce_order_items found ===")
            # Read the full block
            buf = line
            for next_line in f:
                buf += next_line
                if next_line.rstrip().endswith(';'):
                    break
            print(buf[:2000])
            
        # Also check postmeta for our orders' line item names  
        if "INSERT INTO `wp_postmeta`" in line:
            buf = line
            for next_line in f:
                buf += next_line
                if next_line.rstrip().endswith(';'):
                    break
            # Only show meta for our target orders with item names
            for m in re.finditer(r"\((\d+),'(\d+)','(.*?)','(.*?)'\)", buf):
                pid = m.group(2)
                if pid in target_orders:
                    key = m.group(3)
                    if any(x in key.lower() for x in ['item', 'product', 'name', 'order_item']):
                        print(f"  post_id={pid} meta_key={key} meta_value={m.group(4)[:100]}")
