const { getSharedPrismaClient, initializeSharedDatabase } = require("../services/sharedDatabase");
const { getCompanyFollowUp, saveFollowUpToDb } = require("../utils/companyFollowUp");

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();
  if (!prisma) throw new Error("Failed to get prisma client");

  const companies = await prisma.company.findMany({
    where: { settings: { not: null } },
    select: { id: true, settings: true },
  });

  let count = 0;
  for (const company of companies) {
    const followUp = getCompanyFollowUp(company);
    if (followUp.status === "unassigned" && !followUp.lastNote && !followUp.assignedOwner?.id) continue;
    await saveFollowUpToDb(prisma, company.id, followUp);
    count++;
  }

  console.log(`Migrated ${count} / ${companies.length} companies with follow-up data.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { const p = getSharedPrismaClient(); if (p) await p.$disconnect(); });
