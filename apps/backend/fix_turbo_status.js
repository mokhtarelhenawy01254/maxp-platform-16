/**
 * Fix turboShipmentStatus on PRODUCTION for DELIVERED orders
 * Calls sync-status after the FINAL STATUS PROTECTION is deployed,
 * which will correctly set turboShipmentStatus to 'delivered'
 */
const axios = require('./node_modules/axios');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'https://maxp.online/api/v1';

async function main() {
  const lr = await axios.default.post(`${BASE}/auth/login`, { email: 'swan@h2m.com', password: '0165676135' });
  const token = lr.data.data?.token || lr.data.token;
  const headers = { Authorization: 'Bearer ' + token };
  console.log('✅ Logged in\n');

  // Load all records
  let all = [];
  for (let p = 1; p <= 5; p++) {
    const r = await axios.default.get(`${BASE}/turbo/records?limit=200&page=${p}`, { headers });
    const recs = r.data?.data || [];
    if (!recs.length) break;
    all = all.concat(recs);
    if (recs.length < 200) break;
  }

  // Target: DELIVERED orders with wrong turboShipmentStatus
  const targets = all.filter(o => o.status === 'DELIVERED' && o.turboShipmentStatus !== 'delivered');
  console.log(`Found ${targets.length} DELIVERED orders with wrong turboShipmentStatus:`);
  targets.forEach(o => console.log(`  ${o.orderNumber} | turboStatus: ${o.turboShipmentStatus}`));

  if (!targets.length) {
    console.log('\n✅ All DELIVERED orders already have correct turboShipmentStatus!');
    return;
  }

  console.log('\nFixing via sync-status (with FINAL STATUS PROTECTION)...');
  let fixed = 0, failed = 0;

  for (const order of targets) {
    process.stdout.write(`${order.orderNumber}... `);
    try {
      const r = await axios.default.post(
        `${BASE}/turbo/orders/${order.id}/sync-status`,
        {},
        { headers, timeout: 15000 }
      );
      const newTurboStatus = r.data?.data?.turboShipmentStatus || r.data?.data?.status;
      if (newTurboStatus === 'delivered') {
        console.log('✅ → delivered');
        fixed++;
      } else {
        console.log(`⚠️  → ${newTurboStatus} (checking DB state...)`);
        // Re-fetch to confirm DB state
        const check = await axios.default.get(`${BASE}/turbo/records?limit=1&search=${order.orderNumber}`, { headers });
        const updated = check.data?.data?.[0];
        console.log(`   DB turboShipmentStatus: ${updated?.turboShipmentStatus}`);
        if (updated?.turboShipmentStatus === 'delivered') fixed++;
        else failed++;
      }
    } catch (e) {
      console.log(`❌ ${e.response?.data?.message || e.message}`);
      failed++;
    }
    await sleep(400);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`✅ Fixed: ${fixed} | ❌ Failed: ${failed}`);

  // Final verification
  let allAfter = [];
  for (let p = 1; p <= 5; p++) {
    const r = await axios.default.get(`${BASE}/turbo/records?limit=200&page=${p}`, { headers });
    const recs = r.data?.data || [];
    if (!recs.length) break;
    allAfter = allAfter.concat(recs);
    if (recs.length < 200) break;
  }

  const tsCounts = {};
  allAfter.forEach(o => { tsCounts[o.turboShipmentStatus || 'null'] = (tsCounts[o.turboShipmentStatus || 'null'] || 0) + 1; });
  const osCounts = {};
  allAfter.forEach(o => { osCounts[o.status] = (osCounts[o.status] || 0) + 1; });

  console.log('\nFinal Order Status counts:');
  Object.entries(osCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nFinal Turbo Status counts:');
  Object.entries(tsCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main().catch(e => console.error('Fatal:', e.message));
