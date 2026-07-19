"""
Fast postmeta extraction - two phase:
1. Extract all postmeta INSERT blocks to temp SQL file
2. Regex-parse the temp file, filter by target IDs + relevant keys
"""
import gzip, re, json, time
from pathlib import Path
from collections import defaultdict

dump_file = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"
out_dir = Path.home() / "Downloads" / "swan_export"
out_dir.mkdir(exist_ok=True)
temp_file = out_dir / "postmeta_raw.sql"

ids_data = json.load(open(out_dir / "stage1_ids.json"))
target_ids = set(ids_data['order_ids']) | set(ids_data['product_ids']) | set(ids_data['variation_ids'])
print(f"Target IDs: {len(target_ids):,}")

RELEVANT_KEYS = frozenset({
    '_billing_first_name', '_billing_last_name', '_billing_email', '_billing_phone',
    '_billing_address_1', '_billing_address_2', '_billing_city', '_billing_state',
    '_billing_postcode', '_billing_country', '_billing_company',
    '_shipping_first_name', '_shipping_last_name', '_shipping_address_1',
    '_shipping_address_2', '_shipping_city', '_shipping_state', '_shipping_postcode',
    '_shipping_country', '_shipping_company',
    '_order_total', '_order_subtotal', '_order_shipping', '_order_discount',
    '_order_tax', '_order_shipping_tax', '_order_currency', '_order_key',
    '_payment_method', '_payment_method_title', '_transaction_id',
    '_customer_user', '_customer_ip_address',
    '_created_via', '_version',
    '_billing_source', '_billing_name_of_facebook', '_billing_like',
    '_billing_promo_code', '_customer_rating', '_customer_success_rate',
    '_customer_total_orders', '_customer_type',
    '_shipping_method',
    '_wcfmmp_commission', '_wcfmmp_vendor_id', '_wcfmmp_order_commission_status',
    '_wcfmmp_commission_type', '_wcfmmp_vendor_commission_amount',
    '_wcfmmp_order_discount', '_wcfmmp_commission_rule',
    '_wcfmmp_order_processed_by', '_wcfmmp_order_sync',
    'is_vat_exempt', '_recorded_sales', '_order_stock_reduced',
    '_download_permissions_granted', '_prices_include_tax',
    '_cart_discount', '_cart_discount_tax', '_shipping_method_id',
})

# Phase 1: Extract all postmeta blocks
print("Phase 1: Extracting postmeta blocks...")
t0 = time.time()
blocks = 0
with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as fin:
    with open(temp_file, 'w', encoding='utf8') as fout:
        for line in fin:
            if line.startswith("INSERT INTO `wp_postmeta`"):
                blocks += 1
                fout.write(line)
                for nl in fin:
                    fout.write(nl)
                    if nl.rstrip().endswith(';'):
                        break
t1 = time.time()
size_mb = temp_file.stat().st_size / 1e6
print(f"  {blocks} blocks -> {temp_file} ({size_mb:.0f}MB) in {t1-t0:.0f}s")

# Phase 2: Parse temp file - ALL matches, filter at Python level
print("Phase 2: Regex parsing...")
postmeta = defaultdict(dict)
total = 0
kept = 0

with open(temp_file, 'r', encoding='utf8', errors='replace') as f:
    content = f.read()

t2 = time.time()
for m in re.finditer(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", content):
    total += 1
    pid = m.group(2)
    if pid in target_ids:
        key = m.group(3)
        if key in RELEVANT_KEYS:
            postmeta[pid][key] = m.group(4)
            kept += 1

t3 = time.time()
print(f"  {total:,} total rows, {kept:,} kept in {t3-t2:.1f}s")

# Save
json.dump(dict(postmeta), open(out_dir / "postmeta.json", 'w', encoding='utf8'), ensure_ascii=False)
orders_with_meta = sum(1 for oid in ids_data['order_ids'] if oid in postmeta)
print(f"  Orders with meta: {orders_with_meta:,}")
print(f"  Total meta rows: {kept:,}")

# Cleanup
temp_file.unlink()
print("  Temp file deleted")
print(f"\nTotal time: {t3-t0:.0f}s")
