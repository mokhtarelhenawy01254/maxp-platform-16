
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const fs = require('fs');
const path = require('path');

function resolveUploadAssetCandidates(assetPath) {
  const relativeUploadPath = assetPath.split('?')[0].replace(/^\/+/, '');
  return [
    path.join(__dirname, relativeUploadPath),
    path.join(__dirname, '..', relativeUploadPath),
  ];
}

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const products = await prisma.product.findMany({});
  console.log(`Auditing ${products.length} products for LOCAL images...`);

  for (const p of products) {
    const candidates = [];
    if (p.mainImage) candidates.push(p.mainImage);
    try {
      if (p.images) {
        const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        if (Array.isArray(parsed)) {
          parsed.forEach(img => {
            if (typeof img === 'string') candidates.push(img);
            else if (img && img.url) candidates.push(img.url);
          });
        }
      }
    } catch {}

    const localCandidates = candidates.filter(img => img && img.startsWith('/uploads/'));
    if (localCandidates.length > 0) {
      console.log(`- Product: ${p.name} (${p.id})`);
      for (const img of localCandidates) {
        const paths = resolveUploadAssetCandidates(img);
        const exists = paths.some(p => fs.existsSync(p));
        console.log(`  [LOCAL] ${img} - ${exists ? 'EXISTS' : 'MISSING'}`);
      }
    }
  }
}

main().catch(console.error);
