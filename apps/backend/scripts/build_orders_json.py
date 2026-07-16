"""
Build WooCommerce-order-format JSON batches from extracted data
"""
import json, os
from pathlib import Path
from collections import defaultdict

out_dir = Path.home() / "Downloads" / "swan_export"
batch_dir = out_dir / "order_batches"
batch_dir.mkdir(exist_ok=True)

print("Loading data...")
orders_data = json.load(open(out_dir / "stage1_ids.json"))
order_ids = orders_data['order_ids']
product_list = orders_data['product_ids']
variation_list = orders_data['variation_ids']

# Products from wp_posts
products = json.load(open(out_dir / "products.json")) if (out_dir / "products.json").exists() else {}
variations = json.load(open(out_dir / "variations.json")) if (out_dir / "variations.json").exists() else {}

# Create product lookup: id -> {title}
all_products = {}
for pid in product_list:
    all_products[pid] = products.get(pid, {'title': f'Product #{pid}'})
for vid, data in variations.items():
    all_products[vid] = data

order_stats = json.load(open(out_dir / "order_stats.json"))
product_lookup_list = json.load(open(out_dir / "product_lookup.json"))

# Group line items by order
line_items_by_order = defaultdict(list)
for item in product_lookup_list:
    line_items_by_order[item['order_id']].append(item)

print(f"Loading postmeta (streaming)...")
import ijson

postmeta = {}
with open(out_dir / "postmeta.json", 'rb') as f:
    parser = ijson.kvitems(f, '')
    for k, v in parser:
        postmeta[k] = v

print(f"  Loaded {len(postmeta)} order meta entries")

WOO_STATUS_MAP = {
    'wc-completed': 'completed',
    'wc-refunded': 'refunded',
    'wc-return-completed': 'refunded',
    'wc-cancelled': 'cancelled',
    'wc-failed': 'failed',
    'wc-pending': 'pending',
    'wc-processing': 'processing',
    'wc-on-hold': 'on-hold',
    'wc-partial-returned': 'refunded',
    'wc-review-on-hold': 'on-hold',
    'wc-cancel-requested': 'pending',
    'wc-turbo_status_3': 'on-hold',
    'wc-turbo_status_4': 'on-hold',
    'wc-turbo_status_5': 'on-hold',
    'wc-turbo_status_7': 'on-hold',
    'wc-turbo_status_12': 'on-hold',
    'wc-turbo_status_13': 'on-hold',
    'wc-confirm-moaagal': 'on-hold',
    'wc-ljug': 'pending',
    'wc-jhhj': 'pending',
    'wc-kjnh': 'pending',
    'wc-jt': 'pending',
    'wc-m2': 'pending',
    'wc-m3': 'pending',
    'wc-deficit-stage-1': 'pending',
    'wc-poor-review': 'pending',
    'wc-review-the-return': 'pending',
    'wc-print': 'pending',
    'wc-review': 'pending',
    'wc-return-order': 'pending',
    'wc-duplicate-order': 'cancelled',
    'wc--': 'pending',
}

def build_order_json(order_id, order_data, meta, stats, line_items):
    billing_name = meta.get('_billing_first_name', '') or ''
    billing_last = meta.get('_billing_last_name', '') or ''
    full_name = f"{billing_name} {billing_last}".strip()

    wc_status = order_data.get('status', 'wc-pending')
    local_status = WOO_STATUS_MAP.get(wc_status, 'pending')
    total = stats.get('total_sales', '0') if stats else meta.get('_order_total', '0')
    subtotal = stats.get('net_total', '0') if stats else meta.get('_order_subtotal', '0')
    shipping = stats.get('shipping_total', '0') if stats else meta.get('_order_shipping', '0')
    discount = meta.get('_cart_discount', '0')
    date = order_data.get('date', '')

    order_json = {
        "id": int(order_id),
        "wooCommerceId": order_id,
        "orderNumber": order_id,
        "status": wc_status,
        "currency": meta.get('_order_currency', 'EGP'),
        "payment_method": meta.get('_payment_method', 'cod'),
        "payment_method_title": meta.get('_payment_method_title', ''),
        "total": str(total),
        "subtotal": str(subtotal),
        "shipping_total": str(shipping),
        "discount_total": str(discount),
        "date_created": date,
        "customer_note": "",
        "billing": {
            "first_name": billing_name,
            "last_name": billing_last,
            "email": meta.get('_billing_email', ''),
            "phone": meta.get('_billing_phone', ''),
            "address_1": meta.get('_billing_address_1', ''),
            "address_2": meta.get('_billing_address_2', ''),
            "city": meta.get('_billing_city', ''),
            "state": meta.get('_billing_state', ''),
            "postcode": meta.get('_billing_postcode', ''),
            "country": meta.get('_billing_country', 'EG'),
        },
        "shipping": {
            "first_name": meta.get('_shipping_first_name', billing_name),
            "last_name": meta.get('_shipping_last_name', billing_last),
            "address_1": meta.get('_shipping_address_1', meta.get('_billing_address_1', '')),
            "address_2": meta.get('_shipping_address_2', ''),
            "city": meta.get('_shipping_city', meta.get('_billing_city', '')),
            "state": meta.get('_shipping_state', meta.get('_billing_state', '')),
            "postcode": meta.get('_shipping_postcode', ''),
            "country": meta.get('_shipping_country', 'EG'),
        },
        "line_items": [],
        "meta_data": []
    }

    # WCFM meta
    for mk in ('_billing_source', '_billing_name_of_facebook', '_billing_like',
               '_billing_promo_code', '_customer_rating', '_customer_success_rate',
               '_customer_total_orders', '_customer_type'):
        if mk in meta:
            order_json["meta_data"].append({"key": mk, "value": meta[mk]})

    # Line items from product_lookup
    for item in line_items:
        pid = item['product_id']
        vid = item['variation_id']
        qty = item.get('qty', '1')
        price = item.get('net_revenue', '0')
        gross = item.get('gross_revenue', '0')
        name = all_products.get(pid, {}).get('title', f'Product #{pid}')
        if vid and vid != '0' and vid in all_products:
            vname = all_products[vid].get('title', '')
            if vname:
                name = vname

        li = {
            "product_id": int(pid) if pid != '0' else 0,
            "variation_id": int(vid) if vid and vid != '0' else 0,
            "name": name,
            "sku": "",
            "quantity": int(qty),
            "price": str(gross),
            "total": str(gross),
        }
        order_json["line_items"].append(li)

    return order_json

print("\nBuilding order JSON batches...")
batch_size = 200
total = 0
current_batch = []
batch_num = 0

for oid in sorted(order_ids):
    order_data = orders_data
    meta = postmeta.get(oid, {})
    stats = order_stats.get(oid, {})
    items = line_items_by_order.get(oid, [])

    # Skip orders with no line items
    if not items:
        continue

    try:
        order_json = build_order_json(oid, order_data, meta, stats, items)
    except Exception as e:
        print(f"  Error building order {oid}: {e}")
        continue

    current_batch.append(order_json)
    total += 1

    if len(current_batch) >= batch_size:
        batch_num += 1
        fname = batch_dir / f"orders_batch_{batch_num:04d}.json"
        json.dump({"orders": current_batch}, open(fname, 'w', encoding='utf8'), ensure_ascii=False)
        print(f"  Batch {batch_num}: {len(current_batch)} orders -> {fname.name}")
        current_batch = []

# Last batch
if current_batch:
    batch_num += 1
    fname = batch_dir / f"orders_batch_{batch_num:04d}.json"
    json.dump({"orders": current_batch}, open(fname, 'w', encoding='utf8'), ensure_ascii=False)
    print(f"  Batch {batch_num}: {len(current_batch)} orders -> {fname.name}")

print(f"\nTotal: {total:,} orders in {batch_num} batches")
