const { PrismaClient } = require("./apps/backend/generated/postgresql_v2");
const prisma = new PrismaClient();

async function main() {
  const companyId = "cmr24nias0000vbf0q4g511uk";

  const app = await prisma.marketplaceApp.findUnique({ where: { slug: "order-core" } });
  console.log("MarketplaceApp:", app ? { id: app.id, name: app.name, slug: app.slug } : "NOT FOUND");

  if (!app) {
    console.log("order-core app not found in marketplace_apps. Skipping.");
    await prisma.$disconnect();
    return;
  }

  const existing = await prisma.companyApp.findUnique({
    where: { companyId_appId: { companyId, appId: app.id } },
  });
  console.log("Existing CompanyApp:", existing ? { id: existing.id, status: existing.status } : "no");

  if (!existing) {
    const created = await prisma.companyApp.create({
      data: { companyId, appId: app.id, status: "ACTIVE" },
    });
    console.log("Created CompanyApp:", created.id, "status:", created.status);
  } else if (existing.status !== "ACTIVE") {
    await prisma.companyApp.update({
      where: { id: existing.id },
      data: { status: "ACTIVE" },
    });
    console.log("Updated status to ACTIVE");
  } else {
    console.log("Already ACTIVE");
  }

  const allApps = await prisma.companyApp.findMany({ where: { companyId } });
  console.log("All company apps:", allApps.length);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
