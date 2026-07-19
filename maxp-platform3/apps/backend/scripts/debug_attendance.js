
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const employees = await prisma.employee.findMany({
        where: {
            employeeNumber: {
                in: ['EMP00004', 'EMP00002', 'EMP00006', 'EMP00008']
            }
        },
        include: {
            user: true,
            shiftAssignments: {
                where: {
                    date: new Date('2026-02-18')
                },
                include: {
                    shift: true
                }
            },
            attendances: {
                where: {
                    date: new Date('2026-02-18')
                }
            }
        }
    });

    console.log(JSON.stringify(employees, null, 2));

    const settings = await prisma.hRSettings.findFirst({
        where: {
            companyId: employees[0]?.companyId
        }
    });
    console.log('--- SETTINGS ---');
    console.log(JSON.stringify(settings, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
