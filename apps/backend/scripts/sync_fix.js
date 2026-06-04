const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function syncAll() {
    console.log('ðŸš€ Starting slave sync with scalar mapping...');

    try {
        const existingEmployees = await prisma.employee.findMany({
            select: { userId: true, employeeNumber: true, companyId: true, id: true }
        });

        const empByUserId = new Map();
        const usedInCompany = new Set();

        for (const emp of existingEmployees) {
            empByUserId.set(emp.userId, emp);
            usedInCompany.add(`${emp.companyId}:${emp.employeeNumber}`);
        }

        const users = await prisma.user.findMany({
            where: {
                companyId: { not: null }
            },
            orderBy: { createdAt: 'asc' }
        });

        console.log(`ðŸ‘¥ Found ${users.length} users. ${existingEmployees.length} employees already indexed.`);

        let syncedCount = 0;
        let failed = 0;

        for (const user of users) {
            try {
                let empNum;
                const existingEmp = empByUserId.get(user.id);

                if (existingEmp) {
                    empNum = existingEmp.employeeNumber;
                } else {
                    empNum = user.employeeNumber;
                    if (!empNum || usedInCompany.has(`${user.companyId}:${empNum}`)) {
                        let next = 1;
                        while (usedInCompany.has(`${user.companyId}:EMP${String(next).padStart(5, '0')}`)) {
                            next++;
                        }
                        empNum = `EMP${String(next).padStart(5, '0')}`;
                    }
                }

                usedInCompany.add(`${user.companyId}:${empNum}`);

                if (user.employeeNumber !== empNum) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { employeeNumber: empNum }
                    });
                }

                // Use SCALAR fields ONLY to avoid mixing relation/scalar modes
                const scalarData = {
                    employeeNumber: empNum,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    hireDate: user.hireDate || new Date(),
                    baseSalary: user.baseSalary,
                    status: user.isActive ? 'ACTIVE' : 'INACTIVE',
                    departmentId: user.departmentId || null,
                    positionId: user.positionId || null,
                    companyId: user.companyId
                };

                await prisma.employee.upsert({
                    where: { userId: user.id },
                    update: {
                        ...scalarData,
                        updatedAt: new Date()
                    },
                    create: {
                        ...scalarData,
                        userId: user.id
                    }
                });

                syncedCount++;
                console.log(`âœ… [${syncedCount}] Synced: ${user.email} (${empNum})`);
            } catch (err) {
                failed++;
                console.error(`âŒ [${failed}] Failed for ${user.email}:`, err.message);
            }
        }

        console.log(`ðŸŽ‰ Sync completed! Total synced: ${syncedCount}, Failed: ${failed}`);
    } catch (err) {
        console.error('âŒ Sync failed:', err);
    } finally {
        process.exit(0);
    }
}

syncAll();

