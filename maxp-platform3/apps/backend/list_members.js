require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmmhkxobb0000vpk440j1n6ui';
  const members = await prisma.userCompany.findMany({
    where: { companyId },
    include: { user: true }
  });
  console.log("Company Members:");
  members.forEach(m => {
    console.log(`- ${m.user.firstName} ${m.user.lastName} (${m.role}) [${m.user.availability || 'N/A'}] ID: ${m.userId}`);
  });
}
main()
  .catch(console.error)
  .finally(() => process.exit(0));
