/**
 * Bulk sync for NON-FINAL orders to find delivered ones
 * Target: PROCESSING, CONFIRMED, READY, ON_HOLD, SHIPPED
 */
const axios = require('./node_modules/axios');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('≡ƒöä [BULK-SYNC] Finding DELIVERED orders hiding in PROCESSING/CONFIRMED...\n');

  const lr = await axios.default.post('https://maxp.online/api/v1/auth/login', {
    email: 'swan@h2m.com', password: '0165676135'
  });
  const token = lr.data.data?.token || lr.data.token;
  const headers = { Authorization: 'Bearer ' + token };

  // Get ALL records
  let allRecords = [];
  let page = 1;
  while (true) {
    const r = await axios.default.get(`https://maxp.online/api/v1/turbo/records?limit=200&page=${page}`, { headers });
    const recs = r.data?.data || [];
    if (!Array.isArray(recs) || recs.length === 0) break;
    allRecords = allRecords.concat(recs);
    if (recs.length < 200) break;
    page++;
    if (page > 10) break;
  }

  // Target non-final statuses
  const NON_FINAL = ['PROCESSING', 'CONFIRMED', 'READY', 'ON_HOLD', 'SHIPPED', 'PENDING'];
  const targets = allRecords.filter(r => NON_FINAL.includes(r.status) && r.turboShipmentId);

  console.log(`≡ƒôª Total records: ${allRecords.length}`);
  console.log(`≡ƒÄ» Targeting non-final orders: ${targets.length}`);
  
  const statusBreakdown = {};
  targets.forEach(r => { statusBreakdown[r.status] = (statusBreakdown[r.status]||0)+1; });
  console.log('Breakdown:', JSON.stringify(statusBreakdown), '\n');

  const results = { updated_to_delivered: [], updated_to_other: [], no_change: [], failed: [] };

  for (let i = 0; i < targets.length; i++) {
    const order = targets[i];
    process.stdout.write(`[${i+1}/${targets.length}] ${order.orderNumber || order.id} (${order.turboShipmentId}) [${order.status}]... `);

    try {
      const syncRes = await axios.default.post(
        `https://maxp.online/api/v1/turbo/orders/${order.id}/sync-status`,
        {},
        { headers, timeout: 15000 }
      );

      const newStatus = syncRes.data?.data?.orderStatus || syncRes.data?.data?.systemStatus;
      const turboStatus = syncRes.data?.data?.turboShipmentStatus || syncRes.data?.data?.status;

      if (newStatus === 'DELIVERED') {
        results.updated_to_delivered.push({ order: order.orderNumber, turboId: order.turboShipmentId, from: order.status });
        console.log(`Γ£à ΓåÆ DELIVERED! (turbo: ${turboStatus})`);
      } else if (newStatus && newStatus !== order.status) {
        results.updated_to_other.push({ order: order.orderNumber, from: order.status, to: newStatus, turboStatus });
        console.log(`≡ƒöä ΓåÆ ${newStatus} (turbo: ${turboStatus})`);
      } else {
        results.no_change.push(order.orderNumber);
        console.log(`Γ₧í∩╕Å  no change (turbo: ${turboStatus})`);
      }
    } catch(e) {
      const err = e.response?.data?.message || e.message;
      results.failed.push({ order: order.orderNumber, error: err });
      console.log(`Γ¥î ${err}`);
    }

    await sleep(600);
  }

  console.log('\n========== SUMMARY ==========');
  console.log(`Γ£à Updated ΓåÆ DELIVERED: ${results.updated_to_delivered.length}`);
  results.updated_to_delivered.forEach(r => console.log(`   - ${r.order} (${r.turboId}): ${r.from} ΓåÆ DELIVERED`));
  console.log(`\n≡ƒöä Updated ΓåÆ other: ${results.updated_to_other.length}`);
  results.updated_to_other.forEach(r => console.log(`   - ${r.order}: ${r.from} ΓåÆ ${r.to} (turbo: ${r.turboStatus})`));
  console.log(`\nΓ₧í∩╕Å  No change: ${results.no_change.length}`);
  console.log(`Γ¥î Failed: ${results.failed.length}`);
  console.log('==============================');
}

main().catch(e => console.error('Fatal:', e.message));
