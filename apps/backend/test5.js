const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();
const attendance = require('./services/hr/attendanceService');

async function run() {
  const company = await prisma.company.findFirst();
  const res = await attendance.getAttendance(company.id, { startDate: '2026-04-02', endDate: '2026-04-02' });
  console.log('--- FOUND RECORDS ---');
  res.records.forEach(r => console.log(r.date));
  console.log('--- QUERY ---');
  console.log(JSON.stringify(res.debug_where, null, 2));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
