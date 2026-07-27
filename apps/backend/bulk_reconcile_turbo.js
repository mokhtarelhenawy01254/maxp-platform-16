/**
 * Bulk Turbo Reconciliation Script
 * يصحح حالات الطلبات في MaxP بناءً على الحالة الفعلية من تربو (search-order)
 * Run: node bulk_reconcile_turbo.js
 */

const axios = require('./node_modules/axios');

const MAXP_BASE = 'https://maxp.online/api/v1';
const DELAY_MS = 800; // delay between requests to avoid rate limiting

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('🔄 [BULK-RECONCILE] Starting Turbo status reconciliation...\n');

  // Login
  const lr = await axios.default.post(`${MAXP_BASE}/auth/login`, {
    email: 'swan@h2m.com',
    password: '0165676135'
  });
  const token = lr.data.data?.token || lr.data.token;
  const headers = { Authorization: 'Bearer ' + token };
  console.log('✅ Logged in\n');

  // Get ALL turbo records
  let allRecords = [];
  let page = 1;
  while (true) {
    const r = await axios.default.get(`${MAXP_BASE}/turbo/records?limit=200&page=${page}`, { headers });
    const recs = r.data?.data || [];
    if (!Array.isArray(recs) || recs.length === 0) break;
    allRecords = allRecords.concat(recs);
    if (recs.length < 200) break;
    page++;
    if (page > 10) break;
  }
  console.log(`📦 Total turbo records loaded: ${allRecords.length}`);

  // Target: all RETURNED orders OR those with returned turboShipmentStatus
  const targets = allRecords.filter(r =>
    r.status === 'RETURNED' ||
    r.turboShipmentStatus === 'returned' ||
    r.turboShipmentStatus === 'returned_to_company'
  );
  console.log(`🎯 Target orders to reconcile: ${targets.length}\n`);

  const results = {
    updated_to_delivered: [],
    updated_to_other: [],
    confirmed_returned: [],
    failed: [],
    no_turbo_id: []
  };

  for (let i = 0; i < targets.length; i++) {
    const order = targets[i];
    const orderId = order.id;
    const orderNum = order.orderNumber;
    const turboId = order.turboShipmentId;

    if (!turboId) {
      results.no_turbo_id.push(orderNum);
      continue;
    }

    process.stdout.write(`[${i + 1}/${targets.length}] ${orderNum} (${turboId})... `);

    try {
      // Call sync-status which now uses search-order first
      const syncRes = await axios.default.post(
        `${MAXP_BASE}/turbo/orders/${orderId}/sync-status`,
        {},
        { headers, timeout: 15000 }
      );

      const newStatus = syncRes.data?.data?.orderStatus || syncRes.data?.data?.systemStatus;
      const turboStatus = syncRes.data?.data?.turboShipmentStatus || syncRes.data?.data?.status;
      const prevStatus = order.status;

      if (newStatus === 'DELIVERED' && prevStatus !== 'DELIVERED') {
        results.updated_to_delivered.push({ orderNum, turboId, from: prevStatus, turboStatus });
        console.log(`✅ FIXED: ${prevStatus} → DELIVERED (turbo: ${turboStatus})`);
      } else if (newStatus && newStatus !== prevStatus && newStatus !== 'RETURNED') {
        results.updated_to_other.push({ orderNum, turboId, from: prevStatus, to: newStatus, turboStatus });
        console.log(`🔄 CHANGED: ${prevStatus} → ${newStatus} (turbo: ${turboStatus})`);
      } else if (turboStatus?.includes('return') || newStatus === 'RETURNED') {
        results.confirmed_returned.push({ orderNum, turboId, turboStatus });
        console.log(`📌 CONFIRMED RETURNED (turbo: ${turboStatus})`);
      } else {
        console.log(`➡️  No change: MaxP=${prevStatus}, turbo=${turboStatus}, newStatus=${newStatus}`);
      }
    } catch (e) {
      const errMsg = e.response?.data?.message || e.response?.data?.error || e.message;
      results.failed.push({ orderNum, turboId, error: errMsg });
      console.log(`❌ ERROR: ${errMsg}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n\n========== RECONCILIATION SUMMARY ==========');
  console.log(`✅ Updated RETURNED → DELIVERED: ${results.updated_to_delivered.length}`);
  results.updated_to_delivered.forEach(r => console.log(`   - ${r.orderNum} (${r.turboId}): ${r.from} → DELIVERED`));

  console.log(`\n🔄 Updated to other status: ${results.updated_to_other.length}`);
  results.updated_to_other.forEach(r => console.log(`   - ${r.orderNum}: ${r.from} → ${r.to} (turbo: ${r.turboStatus})`));

  console.log(`\n📌 Confirmed still RETURNED (genuine): ${results.confirmed_returned.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  results.failed.forEach(r => console.log(`   - ${r.orderNum}: ${r.error}`));
  console.log(`⚠️  No Turbo ID: ${results.no_turbo_id.length}`);
  console.log('============================================\n');
}

main().catch(e => console.error('Fatal:', e.message));
