const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmldvhqkx0000juj6sdbx2jw0';

  console.log('=== 1. MENNA AYMAN (cmlrswe4701a4juivgtz25ovf) LEAVES & ATTENDANCE ===');
  const mennaLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId: 'cmlrswe4701a4juivgtz25ovf'
    }
  });
  console.log('Menna leaves count:', mennaLeaves.length);
  mennaLeaves.forEach(l => console.log('Leave:', { id: l.id, status: l.status, type: l.type, start: l.startDate, end: l.endDate }));

  const mennaAtt17 = await prisma.attendance.findFirst({
    where: {
      userId: 'cmlrswe4701a4juivgtz25ovf',
      date: {
        gte: new Date('2026-09-17T00:00:00.000Z'),
        lte: new Date('2026-09-17T23:59:59.999Z')
      }
    }
  });
  console.log('Menna 17/9 attendance:', mennaAtt17);

  console.log('\n=== 2. DEMO USER SWAN (cmleybpg2002bjuo2m44y4kip) ===');
  const demoUser = await prisma.user.findUnique({
    where: { id: 'cmleybpg2002bjuo2m44y4kip' },
    include: { company: true }
  });
  console.log('Demo user:', { id: demoUser?.id, email: demoUser?.email, name: demoUser?.firstName, isActive: demoUser?.isActive, company: demoUser?.company?.name });
  
  const demoAttAug = await prisma.attendance.findMany({
    where: {
      userId: 'cmleybpg2002bjuo2m44y4kip',
      date: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      }
    }
  });
  console.log('Demo user August attendances count:', demoAttAug.length);

  const demoAttSept = await prisma.attendance.findMany({
    where: {
      userId: 'cmleybpg2002bjuo2m44y4kip',
      date: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T23:59:59.999Z')
      }
    }
  });
  console.log('Demo user September attendances count:', demoAttSept.length);

  console.log('\n=== 3. DUPLICATE EMPLOYEES AUDIT ===');
  const allEmps = await prisma.employee.findMany({
    where: { companyId },
    select: { id: true, userId: true, firstName: true, lastName: true, employeeNumber: true, status: true, hireDate: true }
  });
  console.log(`Total employees in H2M: ${allEmps.length}`);
  const byName = {};
  for (const e of allEmps) {
    const key = `${e.firstName} ${e.lastName}`.trim();
    if (!byName[key]) byName[key] = [];
    byName[key].push(e);
  }
  for (const [name, list] of Object.entries(byName)) {
    if (list.length > 1) {
      console.log(`Duplicate found for "${name}":`, list);
    }
  }

  console.log('\n=== 4. PENDING AUTO_DEDUCTIONS IN H2M ===');
  const pendingAutoDeds = await prisma.manualDeduction.findMany({
    where: {
      companyId,
      category: 'AUTO_DEDUCTION',
      status: 'PENDING'
    }
  });
  console.log(`Total PENDING AUTO_DEDUCTION rows in H2M: ${pendingAutoDeds.length}`);
  const totalPendingAmt = pendingAutoDeds.reduce((sum, d) => sum + Number(d.amount), 0);
  console.log(`Total PENDING AUTO_DEDUCTION amount: ${totalPendingAmt.toFixed(2)} EGP`);

  console.log('\n=== 5. ALI WAZIRY 4/9 RECORD ===');
  const ali4 = await prisma.attendance.findFirst({
    where: {
      userId: 'cmldwfc750017juj6gbg6m8t7',
      date: {
        gte: new Date('2026-09-04T00:00:00.000Z'),
        lte: new Date('2026-09-04T23:59:59.999Z')
      }
    }
  });
  console.log('Ali 4/9 attendance:', ali4);

  console.log('\n=== 6. SHADY PERMISSION 24/9 ===');
  const shadyEmp = allEmps.find(e => e.userId === 'cmtv72ghb2alqjux6wh02yak6');
  if (shadyEmp) {
    const shadyPerms = await prisma.hrPermissionRequest.findMany({
      where: {
        employeeId: shadyEmp.id,
        date: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T23:59:59.999Z')
        }
      }
    });
    console.log('Shady September permissions:', shadyPerms);
  }
}

main().catch(console.error).finally(() => process.exit(0));
