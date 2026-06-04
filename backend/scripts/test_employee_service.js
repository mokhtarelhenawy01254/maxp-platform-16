
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();
const employeeService = require('../services/hr/employeeService');

// Mock sharedDatabase to return our prisma client
const sharedDb = require('../services/sharedDatabase');
const originalGetSharedPrismaClient = sharedDb.getSharedPrismaClient;
sharedDb.getSharedPrismaClient = () => prisma;

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const query = { limit: '100', status: 'active' };

    console.log('Testing employeeService.getEmployees with query:', query);
    const result = await employeeService.getEmployees(companyId, query);

    console.log(`\nResult success! Total employees: ${result.employees.length}`);
    result.employees.forEach(e => {
        console.log(`- ${e.firstName} ${e.lastName} (ID: ${e.id}), Emp#: ${e.employeeNumber}, Status: ${e.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        sharedDb.getSharedPrismaClient = originalGetSharedPrismaClient;
        await prisma.$disconnect();
    });
