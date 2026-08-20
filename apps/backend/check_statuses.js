const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.orderStatusDefinition.findMany({ take: 10, select: { id: true, code: true, name: true, companyId: true } })
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error(e.message))
  .finally(() => p.$disconnect());
