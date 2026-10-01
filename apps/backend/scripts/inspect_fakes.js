const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();

  const fakePerms = await prisma.hrPermissionRequest.findMany({
    where: {
      notes: { contains: '2026-10-01' }
    }
  });
  console.log('Fake permissions created today:', fakePerms.map(p => ({ id: p.id, emp: p.employeeId, reason: p.reason, notes: p.notes })));

  const fakeLeaves = await prisma.leaveRequest.findMany({
    where: {
      reason: { contains: '2026-10-01' }
    }
  });
  console.log('Fake leaves created today:', fakeLeaves.map(l => ({ id: l.id, user: l.userId, reason: l.reason })));

  const advances = await prisma.advanceRequest.findMany({
    where: {
      userId: 'cmlrssie9019kjuivk3odrzli'
    }
  });
  console.log('Shrouk advances:', advances);
}

main().catch(console.error).finally(() => process.exit(0));
