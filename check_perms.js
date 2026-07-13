const { PrismaClient } = require('./apps/backend/prisma/generated/postgresql_v2');
const p = new PrismaClient();
async function check() {
  const count = await p.permission.count({ where: { domain: 'ORDERS' } });
  console.log('ORDERS perms in DB:', count);
  const perms = await p.permission.findMany({ where: { domain: 'ORDERS' }, select: { key: true } });
  perms.forEach(x => console.log(' -', x.key));
}
check().finally(() => p.$disconnect());
