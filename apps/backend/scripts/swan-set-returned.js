const axios = require('axios');
const fs = require('fs');
const path = require('path');

const MAXP_BASE = 'https://maxp.online/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxleWJwZzIwMDJianVvMm00NHk0a2lwIiwiZW1haWwiOiJzd2FuQGgybS5jb20iLCJyb2xlIjoiT1dORVIiLCJjb21wYW55SWQiOiJjbWxleWJwZjcwMDI4anVvMnd3cG1wOHJ0IiwiaWF0IjoxNzgzNTg3MDU1LCJleHAiOjE3ODM2MTU4NTV9.6ANYUx0uUpRs4lk_T8XWWtB1L9H1RBVmA7zZscymSOg';
const LOG_FILE = path.join(__dirname, 'swan-import-log.csv');
const BATCH_SIZE = 200;
const DELAY_MS = 300;

const api = axios.create({
  baseURL: MAXP_BASE,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 120000
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const data = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').slice(1);
  const entries = data.map(line => {
    const [page, wooId, orderNumber, action, result, details] = line.split(',');
    return { page, wooId, orderNumber, action, result, returnId: details?.replace(/"/g, '') };
  }).filter(e => e.action === 'return_created');

  const orderNumbers = [...new Set(entries.map(e => e.orderNumber))];
  console.log(`Total orders to update: ${orderNumbers.length}`);

  for (let i = 0; i < orderNumbers.length; i += BATCH_SIZE) {
    const batch = orderNumbers.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(orderNumbers.length / BATCH_SIZE);
    process.stdout.write(`\rBatch ${batchNum}/${totalBatches} (${batch.length} orders)...`);

    try {
      const res = await api.post('/orders-new/bulk/status', {
        orderIds: batch,
        status: 'RETURNED',
        notes: 'مرتجع من متجر Swan'
      });
      if (res.data?.data?.failed?.length) {
        process.stdout.write(` [${res.data.data.failed.length} failed]`);
      }
    } catch (err) {
      process.stdout.write(` [ERROR: ${err.response?.data?.message?.slice(0, 60) || err.message}]`);
    }

    await delay(DELAY_MS);
  }

  console.log('\nOrders done! Now approving return requests...');

  const returnIds = [...new Set(entries.map(e => e.returnId).filter(Boolean))];
  let approved = 0, failed = 0;
  for (const id of returnIds) {
    try {
      await api.put(`/returns/requests/${id}`, { status: 'APPROVED', isReviewed: true });
      approved++;
    } catch (err) {
      failed++;
    }
    if ((approved + failed) % 500 === 0 || approved + failed === returnIds.length) {
      console.log(`  Approved: ${approved}/${returnIds.length}, Failed: ${failed}`);
    }
    await delay(200);
  }

  console.log(`\nDone! Orders: RETURNED, Return requests: APPROVED (${approved}/${returnIds.length})`);
}

main().catch(console.error);
