const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  const atts = await prisma.attendance.findMany({
    where: {
      userId: 'cmldwfc750017juj6gbg6m8t7',
      date: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T23:59:59.999Z')
      }
    }
  });

  console.log(`Found ${atts.length} attendance rows for Ali:`);
  for (const a of atts) {
    if ((a.overtimeHours || 0) > 0 || a.status === 'WEEKEND' || a.status === 'OVERTIME') {
      console.log('OT ROW:', {
        id: a.id,
        date: a.date,
        status: a.status,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        workHours: a.workHours,
        overtimeHours: a.overtimeHours
      });
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
