
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const { isAvailableStoredAsset, normalizeImageCollection } = require('./utils/productMediaUtils');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const products = await prisma.product.findMany({
    include: {
      productVariants: true
    }
  });

  console.log(`Checking ${products.length} products for missing images...`);
  
  let missingCount = 0;
  
  products.forEach(p => {
    const rawImages = p.images;
    const rawMainImage = p.mainImage;
    
    // Check main image
    if (rawMainImage && !isAvailableStoredAsset(rawMainImage)) {
        console.log(`[PRODUCT MISSING MAIN IMAGE] ${p.name} (${p.id}): ${rawMainImage}`);
        missingCount++;
    }
    
    // Check images collection
    const allImages = normalizeImageCollection(rawImages, { dropUnavailableLocalUploads: false });
    allImages.forEach(img => {
        if (!isAvailableStoredAsset(img)) {
            console.log(`[PRODUCT MISSING GALLERY IMAGE] ${p.name} (${p.id}): ${img}`);
            missingCount++;
        }
    });
    
    // Check variants
    p.productVariants.forEach(v => {
        if (v.images && !isAvailableStoredAsset(v.images)) {
             console.log(`[VARIANT MISSING IMAGE] ${p.name} -> ${v.name} (${v.id}): ${v.images}`);
             missingCount++;
        }
    });
  });

  console.log(`Done. Total missing image references found: ${missingCount}`);
}

main().catch(console.error);
