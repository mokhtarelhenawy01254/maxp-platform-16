"""
Extract postmeta for our order/product IDs - processes ALL 455 blocks
"""
import gzip, re, json, time
from pathlib import Path
from collections import defaultdict

dump_file = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"
out_dir = Path.home() / "Downloads" / "swan_export"
out_dir.mkdir(exist_ok=True)

ids_data = json.load(open(out_dir / "stage1_ids.json"))
all_ids = set(ids_data['order_ids']) | set(ids_data['product_ids']) | set(ids_data['variation_ids'])
print(f"Target IDs: {len(all_ids):,}")

RELEVANT_KEYS = {
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
}

postmeta = defaultdict(dict)
meta_count = 0
block_count = 0

print("Scanning all postmeta blocks...")
t0 = time.time()

with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        if not line.startswith("INSERT INTO `wp_postmeta`"):
            continue

        block_count += 1
        full = line
        for nl in f:
            full += nl
            if nl.rstrip().endswith(';'):
                break

        # Use [^']* for meta_key and meta_value - faster and sufficient for most data
        # Split the block into individual rows
        rows = re.findall(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", full)
        for meta_id, post_id, meta_key, meta_value in rows:
            if post_id in all_ids and meta_key in RELEVANT_KEYS:
                postmeta[post_id][meta_key] = meta_value
                meta_count += 1

        if block_count % 50 == 0:
            t = time.time() - t0
            print(f"  Block {block_count}/455: {meta_count:,} kept in {t:.0f}s")

t1 = time.time()
print(f"\nDone in {t1-t0:.0f}s")
print(f"Blocks processed: {block_count}")
print(f"Meta rows kept: {meta_count:,}")
print(f"Orders with meta: {sum(1 for oid in ids_data['order_ids'] if oid in postmeta):,}")

json.dump(dict(postmeta), open(out_dir / "postmeta.json", 'w', encoding='utf8'), ensure_ascii=False)
print("Saved postmeta.json")
