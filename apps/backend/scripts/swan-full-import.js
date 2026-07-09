const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MAXP_BASE = 'https://maxp.online/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxleWJwZzIwMDJianVvMm00NHk0a2lwIiwiZW1haWwiOiJzd2FuQGgybS5jb20iLCJyb2xlIjoiT1dORVIiLCJjb21wYW55SWQiOiJjbWxleWJwZjcwMDI4anVvMnd3cG1wOHJ0IiwiaWF0IjoxNzgzNTg3MDU1LCJleHAiOjE3ODM2MTU4NTV9.6ANYUx0uUpRs4lk_T8XWWtB1L9H1RBVmA7zZscymSOg';
const WC_SETTINGS_ID = '8ba129cd-b7c8-4900-85bd-b502d04bddb5';
const WC_API = 'https://swan.futureairgroup.com/wp-json/wc/v3';
const WC_KEY = 'ck_76a31d08f15f96de3af2de227e17b3c64093bbd7';
const WC_SECRET = 'cs_815f35745ff8a55c23377d8f126dc512759b5f28';
const PER_PAGE = 100;
const DELAY_MS = 100;

const SCRIPT_DIR = __dirname;
const MAPPING_FILE = path.join(SCRIPT_DIR, 'swan-reasons-mapping.json');
const CHECKPOINT_FILE = path.join(SCRIPT_DIR, 'swan-import-checkpoint.json');
const LOG_FILE = path.join(SCRIPT_DIR, 'swan-import-log.csv');

const responsibleMap = {
  customer: 'CUSTOMER',
  store: 'STORE',
  shipping: 'SHIPPING',
  supplier: 'OTHER'
};

const wcApi = axios.create({
  baseURL: WC_API,
  auth: { username: WC_KEY, password: WC_SECRET },
  timeout: 30000
});

const maxpApi = axios.create({
  baseURL: MAXP_BASE,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 60000
});

function getMeta(order, key) {
  const meta = order.meta_data?.find(m => m.key === key);
  return meta ? meta.value : null;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildCompletedFromLog() {
  const completed = {};
  if (!fs.existsSync(LOG_FILE)) return completed;

  const rl = readline.createInterface({
    input: fs.createReadStream(LOG_FILE),
    crlfDelay: Infinity
  });

  let maxPage = 0;
  for await (const line of rl) {
    if (line.startsWith('page,')) continue;
    const parts = line.split(',');
    const page = parseInt(parts[0]);
    const wooId = parts[1];
    const action = parts[3];
    if (action === 'return_created' && wooId) {
      completed[wooId] = true;
    }
    if (page > maxPage) maxPage = page;
  }

  console.log(`Recovered ${Object.keys(completed).length} completed orders from log, last page: ${maxPage}`);
  return completed;
}

async function main() {
  console.log('=== Swan → MaxP Full Import ===\n');

  const reasonsMap = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
  console.log(`Loaded ${Object.keys(reasonsMap).length} reason mappings`);

  const countRes = await wcApi.get('/orders', {
    params: { status: 'return-completed', per_page: PER_PAGE, page: 1 }
  });
  const totalOrders = parseInt(countRes.headers['x-wp-total'] || 0);
  const totalPages = Math.ceil(totalOrders / PER_PAGE);
  console.log(`WooCommerce: ${totalOrders} orders, ${totalPages} pages\n`);

  let checkpoint = { lastPage: 0, completed: {} };
  if (fs.existsSync(CHECKPOINT_FILE)) {
    checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
  }
  checkpoint.completed = { ...checkpoint.completed, ...await buildCompletedFromLog() };
  console.log(`Checkpoint: page ${checkpoint.lastPage}, ${Object.keys(checkpoint.completed).length} orders completed\n`);

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, 'page,wooId,orderNumber,action,result,details\n');
  }

  let stats = { imported: 0, skipped: 0, importFailed: 0, returnsCreated: 0, returnsFailed: 0 };

  for (let page = checkpoint.lastPage + 1; page <= totalPages; page++) {
    console.log(`--- Page ${page}/${totalPages} ---`);

    let orders;
    try {
      const res = await wcApi.get('/orders', {
        params: { status: 'return-completed', per_page: PER_PAGE, page, orderby: 'date', order: 'desc' }
      });
      orders = res.data;
    } catch (err) {
      console.error(`  Fetch failed: ${err.message} - retry in 5s`);
      await delay(5000);
      try {
        const res = await wcApi.get('/orders', {
          params: { status: 'return-completed', per_page: PER_PAGE, page, orderby: 'date', order: 'desc' }
        });
        orders = res.data;
      } catch (err2) {
        console.error(`  Retry failed: ${err2.message} - skip page ${page}`);
        stats.importFailed += PER_PAGE;
        continue;
      }
    }

    if (!orders || orders.length === 0) {
      console.log(`  Empty, stopping`);
      break;
    }

    try {
      const importRes = await maxpApi.post('/woocommerce/orders/import', {
        id: WC_SETTINGS_ID,
        orders,
        duplicateAction: 'skip'
      });
      const d = importRes.data?.data || {};
      console.log(`  Import: ${d.imported || 0} new, ${d.skipped || 0} dup, ${d.failed || 0} fail`);
      stats.imported += d.imported || 0;
      stats.skipped += d.skipped || 0;
      stats.importFailed += d.failed || 0;

      for (const order of orders) {
        const wooId = String(order.id);
        const orderNumber = String(order.number);

        if (checkpoint.completed[wooId]) continue;

        const returnReason = getMeta(order, 'return_reason');
        if (!returnReason) {
          checkpoint.completed[wooId] = true;
          continue;
        }

        const reasonId = reasonsMap[returnReason];
        if (!reasonId) {
          log(page, wooId, orderNumber, 'skip', 'unknown_reason', returnReason);
          checkpoint.completed[wooId] = true;
          continue;
        }

        const note = getMeta(order, 'return_reason_note') || '';
        const responsibleRaw = getMeta(order, 'return_responsible_person');
        const responsibleParty = responsibleMap[responsibleRaw?.toLowerCase()] || 'OTHER';

        try {
          await maxpApi.post('/returns/requests', {
            orderNumber,
            reasonId,
            adminNotes: note,
            responsibleParty
          });
          stats.returnsCreated++;
          log(page, wooId, orderNumber, 'return_created', responsibleParty, reasonId);
        } catch (err) {
          const errMsg = err.response?.data?.error || err.message;
          stats.returnsFailed++;
          log(page, wooId, orderNumber, 'return_failed', 'error', errMsg);
        }

        checkpoint.completed[wooId] = true;
        await delay(DELAY_MS);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error(`  Import failed: ${errMsg} - will retry page later`);
      stats.importFailed += orders.length;
      break; // don't checkpoint this page, retry it
    }

    checkpoint.lastPage = page;
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));

    const total = stats.returnsCreated + stats.returnsFailed;
    console.log(`  → ${stats.returnsCreated} returns created, ${stats.returnsFailed} failed`);
  }

  console.log('\n=== DONE ===');
  console.log(JSON.stringify(stats, null, 2));
}

function log(page, wooId, orderNumber, action, result, details) {
  const safeDetails = (details || '').replace(/"/g, '""');
  fs.appendFileSync(LOG_FILE, `${page},${wooId},${orderNumber},${action},${result},"${safeDetails}"\n`, 'utf-8');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
