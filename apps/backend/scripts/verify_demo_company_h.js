const path = require('path');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
});

async function main() {
  const company = await prisma.company.findFirst({ where: { email: 'h@gmail.com' } });
  console.log('Company:', company?.id, '|', company?.name);
  if (!company) { process.exit(1); }

  console.log('Users:', (await prisma.user.findMany({ where: { companyId: company.id } })).map(u => u.email + ':' + (u.role || 'null')).join(', '));
  console.log('UserCompany links:', (await prisma.userCompany.findMany({ where: { companyId: company.id } })).map(uc => uc.role).join(', '));
  console.log('Categories:', (await prisma.category.findMany({ where: { companyId: company.id } })).length);
  console.log('Products:', (await prisma.product.findMany({ where: { companyId: company.id } })).length);
  console.log('Customer:', (await prisma.customer.findMany({ where: { companyId: company.id } })).length);
  console.log('Orders:', (await prisma.order.findMany({ where: { companyId: company.id } })).length);
  console.log('OrderItems:', (await prisma.orderItem.findMany({ where: { order: { companyId: company.id } } })).length);
  console.log('Tasks:', (await prisma.task.findMany({ where: { companyId: company.id } })).length);
  console.log('Departments:', (await prisma.department.findMany({ where: { companyId: company.id } })).length);
  console.log('Employees:', (await prisma.employee.findMany({ where: { companyId: company.id } })).length);
}

main()
  .catch(e => { console.error('Γ¥î Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
