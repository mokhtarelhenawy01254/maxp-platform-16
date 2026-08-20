const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceBrutal() {
  const comp = await prisma.company.findFirst();
  if(!comp) { console.log("No company found"); return; }
  
  let currentSettings = comp.settings ? (typeof comp.settings === 'string' ? JSON.parse(comp.settings) : comp.settings) : {};
  if (!currentSettings.designTokens) currentSettings.designTokens = {};
  
  const brutalConfig = {
      layout: { type: "grid", desktopColumns: 4, mobileColumns: 1, sidebarPosition: "top", paginationType: "numbers" },
      filters: { showSearch: true, showCategories: true, showPriceFilter: true, showSort: true, categoryStyle: "dropdown", priceStyle: "range-inputs" },
      productCard: { showRating: true, showAddToCart: true, showComparePrice: true, showBadges: true, imageHoverAction: "none", buttonStyle: "solid", variant: "brutal" }
  };
  
  currentSettings.designTokens.shopStudio = brutalConfig;
  
  await prisma.company.update({
    where: { id: comp.id },
    data: { settings: currentSettings }
  });
  console.log("forced brutal settings updated");
}

forceBrutal().catch(console.error).finally(()=>prisma.$disconnect());
