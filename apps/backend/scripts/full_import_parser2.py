"""
Full Swan SQL Dump Parser - Stage 2: Extract postmeta, product_lookup, order_stats
"""
import gzip, re, json
from pathlib import Path
from collections import defaultdict

dump_dir = Path.home() / "Downloads"
dump_file = dump_dir / "u339372869_cv6D7.20260715113030 (1).sql.gz"
out_dir = dump_dir / "swan_export"
out_dir.mkdir(exist_ok=True)

ids_data = json.load(open(out_dir / "stage1_ids.json"))
order_ids = set(ids_data['order_ids'])
product_ids = set(ids_data['product_ids'])
variation_ids = set(ids_data['variation_ids'])
all_ids = order_ids | product_ids | variation_ids

print(f"Loaded: {len(order_ids):,} order IDs")

def parse_sql_values(text):
    """Parse SQL VALUES row tuple -> list of strings. Handles nested parens and escaped quotes."""
    text = text.strip().strip(',').strip(';')
    if text.startswith('(') and text.endswith(')'):
        text = text[1:-1]
    elif text.startswith('('):
        text = text[1:]
    values = []
    current = ''
    in_str = False
    escape = False
    depth = 0
    for ch in text:
        if escape:
            current += ch
            escape = False
            continue
        if ch == '\\' and in_str:
            escape = True
            continue
        if ch == "'" and in_str:
            in_str = False
            continue
        if ch == "'" and not in_str:
            in_str = True
            continue
        if in_str:
            current += ch
            continue
        if ch == '(':
            depth += 1
            current += ch
            continue
        if ch == ')':
            depth -= 1
            current += ch
            continue
        if ch == ',' and depth == 0:
            values.append(current.strip())
            current = ''
            continue
        current += ch
    if current.strip():
        values.append(current.strip())
    return values

product_lookup = []
order_stats = {}

print("=== Extracting product_lookup and order_stats ===")
with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        if line.startswith("INSERT INTO `wp_wc_order_product_lookup`"):
            full = line
            for nl in f:
                full += nl
                if nl.rstrip().endswith(';'):
                    break
            for m in re.finditer(r"\([^)]+\)", full):
                vals = parse_sql_values(m.group(0))
                if len(vals) >= 9 and vals[1] in order_ids:
                    product_lookup.append({
                        'order_item_id': vals[0], 'order_id': vals[1],
                        'product_id': vals[2], 'variation_id': vals[3],
                        'customer_id': vals[4], 'date_created': vals[5],
                        'qty': vals[6], 'net_revenue': vals[7], 'gross_revenue': vals[8],
                        'coupon_amount': vals[9] if len(vals) > 9 else '0',
                    })
            continue

        if line.startswith("INSERT INTO `wp_wc_order_stats`"):
            full = line
            for nl in f:
                full += nl
                if nl.rstrip().endswith(';'):
                    break
            for m in re.finditer(r"\([^)]+\)", full):
                vals = parse_sql_values(m.group(0))
                if len(vals) >= 13 and vals[0] in order_ids:
                    order_stats[vals[0]] = {
                        'total_sales': vals[7], 'tax_total': vals[8],
                        'shipping_total': vals[9], 'net_total': vals[10],
                        'num_items': vals[6], 'status': vals[12],
                        'customer_id': vals[13], 'returning_customer': vals[11],
                        'date_paid': vals[4], 'date_completed': vals[5],
                    }
            continue

        if line.startswith("INSERT INTO `wp_wc_order_tickets`"):
            continue

print(f"  product_lookup: {len(product_lookup):,}")
print(f"  order_stats: {len(order_stats):,}")

# Save intermediate
json.dump(product_lookup, open(out_dir / "product_lookup.json", 'w'))
json.dump(order_stats, open(out_dir / "order_stats.json", 'w'))
print("  Saved product_lookup.json, order_stats.json")

# ===== POSTMETA EXTRACTION =====
print("\n=== Extracting postmeta ===")
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
    '_cart_discount', '_cart_discount_tax',
}

postmeta = defaultdict(dict)
meta_count = 0
order_meta_count = 0

with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    in_postmeta = False
    for line in f:
        if line.startswith("INSERT INTO `wp_postmeta`"):
            full = line
            for nl in f:
                full += nl
                if nl.rstrip().endswith(';'):
                    break

            # Use regex to extract postmeta rows
            for m in re.finditer(r"\((\d+),(\d+),'(.*?)','(.*?)'\)", full):
                post_id = m.group(2)
                if post_id in all_ids and m.group(3) in RELEVANT_KEYS:
                    postmeta[post_id][m.group(3)] = m.group(4)
                    meta_count += 1

            order_meta_count = sum(1 for oid in order_ids if oid in postmeta)
            in_postmeta = False

print(f"  Meta rows extracted: {meta_count:,}")
print(f"  Orders with meta: {order_meta_count:,}")

json.dump(dict(postmeta), open(out_dir / "postmeta.json", 'w', encoding='utf8'), ensure_ascii=False)
print("  Saved postmeta.json")
print("\nDone! All data extracted.")
