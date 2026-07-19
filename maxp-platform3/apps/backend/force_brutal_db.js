const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceBrutal() {
  const company = await prisma.company.findFirst();
  let settings = company.settings || {};
  settings.designTokens = settings.designTokens || {};
  settings.designTokens.shopStudio = {
      layout: { type: "grid", desktopColumns: 4, mobileColumns: 1, sidebarPosition: "top", paginationType: "numbers" },
      filters: { showSearch: true, showCategories: true, showPriceFilter: true, showSort: true, categoryStyle: "dropdown", priceStyle: "range-inputs" },
      productCard: { showRating: true, showAddToCart: true, showComparePrice: true, showBadges: true, imageHoverAction: "none", buttonStyle: "solid", variant: "brutal" }
  };
  
  await prisma.company.update({
    where: { id: company.id },
    data: { settings }
  });
  console.log("Forced brutal settings in DB");
}

forceBrutal().catch(console.error).finally(() => prisma.$disconnect());
