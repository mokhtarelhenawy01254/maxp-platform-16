const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmldvhqkx0000juj6sdbx2jw0';

  console.log('=== SHROUK MAGDI ===');
  const shroukLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId: 'cmlrssie9019kjuivk3odrzli',
      startDate: { lte: new Date('2026-09-30') },
      endDate: { gte: new Date('2026-09-01') }
    }
  });
  console.log('Shrouk Leaves in Sept:', shroukLeaves);

  const shroukAdvances = await prisma.advanceRequest.findMany({
    where: {
      userId: 'cmlrssie9019kjuivk3odrzli'
    }
  });
  console.log('Shrouk Advance Requests:', shroukAdvances);

  console.log('\n=== HABIBA SOBHY ===');
  const habibaLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId: 'cmldw8ivl000jjuj6jhtjuxn2',
      startDate: { lte: new Date('2026-09-30') },
      endDate: { gte: new Date('2026-09-01') }
    }
  });
  console.log('Habiba Leaves in Sept:', habibaLeaves);

  const habibaUser = await prisma.user.findUnique({
    where: { id: 'cmldw8ivl000jjuj6jhtjuxn2' },
    select: { id: true, firstName: true, salary: true, customSalary: true }
  });
  console.log('Habiba User:', habibaUser);

  const habibaEmployee = await prisma.employee.findFirst({
    where: { userId: 'cmldw8ivl000jjuj6jhtjuxn2' },
    select: { id: true, firstName: true, salary: true, basicSalary: true }
  });
  console.log('Habiba Employee:', habibaEmployee);
}

main().catch(console.error).finally(() => process.exit(0));
