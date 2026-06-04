
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
  console.log(`Auditing ${products.length} products...`);

  for (const p of products) {
    console.log(`- Product: ${p.name} (${p.id})`);
    
    const candidates = [p.mainImage];
    try {
      if (p.images) {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed)) {
          parsed.forEach(img => {
            if (typeof img === 'string') candidates.push(img);
            else if (img && img.url) candidates.push(img.url);
          });
        }
      }
    } catch {}

    for (const img of candidates) {
      if (!img) continue;
      if (img.startsWith('http')) {
        console.log(`  [REMOTE] ${img}`);
      } else if (img.startsWith('/uploads/')) {
        const paths = resolveUploadAssetCandidates(img);
        const exists = paths.some(p => fs.existsSync(p));
        console.log(`  [LOCAL] ${img} - ${exists ? 'EXISTS' : 'MISSING'}`);
      } else {
        console.log(`  [UNKNOWN] ${img}`);
      }
    }
  }
}

main().catch(console.error);
