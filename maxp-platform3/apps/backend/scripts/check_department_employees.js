require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDepartmentEmployees() {
    try {
        console.log('🔍 Checking department employees...\n');

        // Find marketing department
        const dept = await prisma.department.findFirst({
            where: {
                name: {
                    contains: 'تسويق'
                }
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeNumber: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        employees: true
                    }
                }
            }
        });

        if (!dept) {
            console.log('❌ Department not found');
            return;
        }

        console.log('📊 Department:', dept.name);
        console.log('📊 Department ID:', dept.id);
        console.log('📊 User count (_count.users):', dept._count.users);
        console.log('📊 Employee count (_count.employees):', dept._count.employees);
        console.log('\n👥 Users in department:');
        dept.users.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Employee#: ${user.employeeNumber}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkDepartmentEmployees();
