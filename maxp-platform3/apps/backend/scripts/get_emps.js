const { PrismaClient } = require('../prisma/generated/postgresql_v2');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const p = new PrismaClient({ datasources: { db: { url: process.env.POSTGRES_URL } } });
const cid = process.argv[2] || 'cmqm7l1fi0000vbrossbnn4qw';

(async () => {
  const emps = await p.employee.findMany({ where: { companyId: cid }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } });
  console.log(JSON.stringify(emps.map(e => ({ id: e.id, userId: e.userId, name: e.firstName + ' ' + e.lastName, num: e.employeeNumber, deptId: e.departmentId, baseSal: Number(e.baseSalary) })), null, 2));
  const depts = await p.department.findMany({ where: { companyId: cid } });
  console.log('DEPARTMENTS:', JSON.stringify(depts.map(d => ({ id: d.id, name: d.name }))));
  await p.$disconnect();
})().catch(e => { console.error(e); p.$disconnect(); });
