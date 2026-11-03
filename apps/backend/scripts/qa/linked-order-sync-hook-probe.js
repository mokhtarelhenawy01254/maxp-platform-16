/**
 * Probe: does the sharedDatabase query extension actually schedule the linked-status
 * mirror when an order status is updated through the REAL extended Prisma client?
 * Runs against maxp_qa. Cleans up everything.
 */
const path = require('path');
const fs = require('fs');

const QA = 'C:/Users/ali wazery/maxp-qa';
const BE = path.resolve(__dirname, '../..').replace(/\\/g, '/');
const TAG = 'QA-HOOK-PROBE-' + Date.now();

const pwd = fs.readFileSync(QA + '/pg/pgpass.conf', 'utf8').trim().split(':')[4];
process.env.DATABASE_URL = `postgresql://postgres:${pwd}@127.0.0.1:5433/maxp_qa?schema=public`;
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'qa-probe-secret';

const { getSharedPrismaClient } = require(path.join(BE, 'services/sharedDatabase.js'));
const tenantContext = require(path.join(BE, 'services/tenantContext.js'));
const linked = require(path.join(BE, 'services/linkedOrderSyncService.js'));

const prisma = getSharedPrismaClient();
const created = { companies: [], orders: [], products: [], connections: [] };
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; failures.push(name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); console.log('  FAIL  ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function cleanup() {
  if (created.orders.length) {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: created.orders } } }).catch(() => {});
    await prisma.orderStatusHistory.deleteMany({ where: { guestOrderId: { in: created.orders } } }).catch(() => {});
    await prisma.guestOrder.deleteMany({ where: { id: { in: created.orders } } }).catch(() => {});
    await prisma.order.deleteMany({ where: { id: { in: created.orders } } }).catch(() => {});
  }
  if (created.connections.length) await prisma.companyConnection.deleteMany({ where: { id: { in: created.connections } } }).catch(() => {});
  if (created.products.length) await prisma.product.deleteMany({ where: { id: { in: created.products } } }).catch(() => {});
  if (created.companies.length) await prisma.company.deleteMany({ where: { id: { in: created.companies } } }).catch(() => {});
}

(async () => {
  console.log('=== hook probe (real extended client) ===');
  const provider = await prisma.company.create({ data: { name: TAG + '-P', email: TAG.toLowerCase() + '-p@maxp.local' } });
  created.companies.push(provider.id);
  const consumer = await prisma.company.create({ data: { name: TAG + '-C', email: TAG.toLowerCase() + '-c@maxp.local' } });
  created.companies.push(consumer.id);

  const conn = await prisma.companyConnection.create({
    data: { providerId: provider.id, consumerId: consumer.id, allowOrderPull: true, allowProductPull: true, status: 'ACTIVE' }
  });
  created.connections.push(conn.id);

  const product = await prisma.product.create({ data: { name: TAG + ' product', price: 100, stock: 10, companyId: provider.id } });
  created.products.push(product.id);

  const customer = await prisma.customer.create({
    data: { firstName: 'QA', lastName: 'Hook', phone: '011' + Date.now().toString().slice(-8), whatsappId: '011' + Date.now().toString().slice(-8), companyId: consumer.id, status: 'ACTIVE' }
  });

  const consumerOrder = await prisma.order.create({
    data: {
      orderNumber: TAG + '-C1', customerId: customer.id, companyId: consumer.id,
      status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'CASH',
      subtotal: 100, total: 100,
      orderItems: { create: [{ productId: product.id, productName: 'x', quantity: 1, price: 100, total: 100 }] }
    }
  });
  created.orders.push(consumerOrder.id);

  const providerOrder = await prisma.order.create({
    data: {
      orderNumber: TAG + '-P1', customerId: customer.id, companyId: provider.id,
      status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'CASH',
      subtotal: 100, total: 100, sourceType: 'internal_push', externalId: consumerOrder.id,
      orderItems: { create: [{ productId: product.id, productName: 'x', quantity: 1, price: 100, total: 100 }] }
    }
  });
  created.orders.push(providerOrder.id);

  linked.__clearConnectionCache();

  // 1) provider update -> consumer mirrored by the extension
  await tenantContext.run(provider.id, async () => {
    await prisma.order.update({ where: { id: providerOrder.id }, data: { status: 'CONFIRMED' } });
  });
  await sleep(2500);
  let c = await prisma.order.findUnique({ where: { id: consumerOrder.id } });
  check('extension: provider update CONFIRMED mirrors to consumer', c.status === 'CONFIRMED', { status: c.status });

  // 2) consumer update -> provider mirrored by the extension
  await tenantContext.run(consumer.id, async () => {
    await prisma.order.update({ where: { id: consumerOrder.id }, data: { status: 'CANCELLED' } });
  });
  await sleep(2500);
  let p = await prisma.order.findUnique({ where: { id: providerOrder.id } });
  check('extension: consumer update CANCELLED mirrors to provider copy', p.status === 'CANCELLED', { status: p.status });

  // 3) idempotency: setting the same status twice in a row creates no extra history row
  await tenantContext.run(provider.id, async () => {
    await prisma.order.update({ where: { id: providerOrder.id }, data: { status: 'CONFIRMED' } });
  });
  await sleep(2000);
  const before = await prisma.orderStatusHistory.count({ where: { orderId: consumerOrder.id, status: 'CONFIRMED' } });
  await tenantContext.run(provider.id, async () => {
    await prisma.order.update({ where: { id: providerOrder.id }, data: { status: 'CONFIRMED' } });
  });
  await sleep(2000);
  const after = await prisma.orderStatusHistory.count({ where: { orderId: consumerOrder.id, status: 'CONFIRMED' } });
  check('extension: repeated CONFIRMED does not duplicate consumer history', after === before, { before, after });

  // 4) GuestOrder consumer <- provider copy (storefront guest order path)
  const guestOrder = await prisma.guestOrder.create({
    data: {
      orderNumber: TAG + '-G1', guestEmail: 'qa-hook@maxp.local', guestPhone: '012' + Date.now().toString().slice(-8),
      guestName: 'QA Guest', items: JSON.stringify([{ productId: product.id, name: 'x', quantity: 1, price: 100 }]),
      total: 100, finalTotal: 100, shippingAddress: '{}', paymentMethod: 'cash',
      status: 'pending', companyId: consumer.id
    }
  });
  created.orders.push(guestOrder.id);

  const providerGuestCopy = await prisma.order.create({
    data: {
      orderNumber: TAG + '-PG1', customerId: customer.id, companyId: provider.id,
      status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'CASH',
      subtotal: 100, total: 100, sourceType: 'internal_push', externalId: guestOrder.id,
      orderItems: { create: [{ productId: product.id, productName: 'x', quantity: 1, price: 100, total: 100 }] }
    }
  });
  created.orders.push(providerGuestCopy.id);

  await tenantContext.run(provider.id, async () => {
    await prisma.order.update({ where: { id: providerGuestCopy.id }, data: { status: 'SHIPPED' } });
  });
  await sleep(2500);
  const g = await prisma.guestOrder.findUnique({ where: { id: guestOrder.id } });
  const gHist = await prisma.orderStatusHistory.count({ where: { guestOrderId: guestOrder.id, status: 'SHIPPED' } });
  check('extension: provider SHIPPED mirrors to consumer GuestOrder (+history)', g.status === 'SHIPPED' && gHist === 1, { status: g.status, gHist });

  await prisma.customer.deleteMany({ where: { id: customer.id } }).catch(() => {});
})().catch(e => {
  console.error('CRASH', e && e.stack ? e.stack : e);
  fail++;
  failures.push('crash: ' + (e && e.message));
}).finally(async () => {
  await cleanup();
  console.log('---------------------------------------------');
  console.log(`RESULT: PASS ${pass} / FAIL ${fail}`);
  if (failures.length) console.log('FAILURES:\n - ' + failures.join('\n - '));
  process.exit(fail > 0 ? 1 : 0);
});
