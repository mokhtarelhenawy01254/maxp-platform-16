const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

let prisma;

async function main() {
  console.log("🚀 Updating product properties for Aura Chic...");
  prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    console.error('❌ CRITICAL: Could not initialize Prisma client.');
    process.exit(1);
  }

  const products = [
    {
      slug: "pleated-chiffon-gown",
      metadata: JSON.stringify([
        { label: "Fabric", value: "Premium Chiffon" },
        { label: "Detail", value: "Hand-pleated textures" },
        { label: "Lining", value: "100% Silk" },
        { label: "Care", value: "Dry clean only" }
      ])
    },
    {
      slug: "embroidered-tulle-gown",
      metadata: JSON.stringify([
        { label: "Fabric", value: "Italian Tulle" },
        { label: "Embroidery", value: "Hand-stitched floral" },
        { label: "Weight", value: "Lightweight" },
        { label: "Origin", value: "Made in Egypt" }
      ])
    },
    {
        slug: "silk-slip-midi-dress",
        metadata: JSON.stringify([
          { label: "Material", value: "100% Mulberry Silk" },
          { label: "Finish", value: "Satin lustre" },
          { label: "Straps", value: "Adjustable spaghetti" },
          { label: "Length", value: "Midi" }
        ])
    }
  ];

  for (const p of products) {
    const updated = await prisma.product.updateMany({
      where: { slug: p.slug },
      data: { metadata: p.metadata }
    });
    console.log(`✅ Updated ${updated.count} product(s) with slug: ${p.slug}`);
  }

  console.log("✨ Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
