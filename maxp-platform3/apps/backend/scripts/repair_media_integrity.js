const { PrismaClient } = require('@prisma/client');
const {
  isAvailableStoredAsset,
  isLocalUploadAssetPath,
  normalizeImageCollection,
  normalizeStoredAssetUrl,
  resolveProductMediaState,
  serializeJsonField,
} = require('../utils/productMediaUtils');

const prisma = new PrismaClient();

function countMissingLocalAssets(values) {
  return values.filter((value) =>
    isLocalUploadAssetPath(value) && !isAvailableStoredAsset(value),
  ).length;
}

async function repairProducts() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: true,
      mainImage: true,
    },
  });

  let updatedProducts = 0;
  let removedMissingProductRefs = 0;
  let normalizedProductRecords = 0;
  let clearedBrokenMainImages = 0;

  for (const product of products) {
    const normalizedImagesBefore = normalizeImageCollection(product.images);
    const missingImagesBefore = countMissingLocalAssets(normalizedImagesBefore);
    const normalizedMainImageBefore = normalizeStoredAssetUrl(product.mainImage);
    const mainImageWasMissing = Boolean(
      normalizedMainImageBefore
        && isLocalUploadAssetPath(normalizedMainImageBefore)
        && !isAvailableStoredAsset(normalizedMainImageBefore),
    );

    const nextMediaState = resolveProductMediaState({
      currentImages: product.images,
      currentMainImage: product.mainImage,
    });

    const nextImagesField = serializeJsonField(nextMediaState.images);
    const nextMainImageField = nextMediaState.mainImage;
    const currentImagesField = product.images ?? null;
    const currentMainImageField = product.mainImage ?? null;

    const changed =
      currentImagesField !== nextImagesField
      || currentMainImageField !== nextMainImageField;

    if (!changed) {
      continue;
    }

    updatedProducts += 1;
    removedMissingProductRefs += missingImagesBefore;
    if (mainImageWasMissing && !nextMainImageField) {
      clearedBrokenMainImages += 1;
    }

    const normalizedChanged =
      normalizeStoredAssetUrl(currentMainImageField) !== nextMainImageField
      || serializeJsonField(normalizedImagesBefore) !== nextImagesField;

    if (normalizedChanged) {
      normalizedProductRecords += 1;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        images: nextImagesField,
        mainImage: nextMainImageField,
      },
    });
  }

  return {
    scannedProducts: products.length,
    updatedProducts,
    removedMissingProductRefs,
    normalizedProductRecords,
    clearedBrokenMainImages,
  };
}

async function repairImageGallery() {
  const galleryImages = await prisma.imageGallery.findMany({
    select: {
      id: true,
      filename: true,
      fileUrl: true,
    },
  });

  let updatedGalleryRows = 0;
  let deletedGalleryRows = 0;
  let normalizedGalleryRows = 0;

  for (const image of galleryImages) {
    const normalizedFileUrl = normalizeStoredAssetUrl(image.fileUrl);
    if (!normalizedFileUrl) {
      continue;
    }

    if (isLocalUploadAssetPath(normalizedFileUrl) && !isAvailableStoredAsset(normalizedFileUrl)) {
      await prisma.imageGallery.delete({
        where: { id: image.id },
      });
      deletedGalleryRows += 1;
      continue;
    }

    if (normalizedFileUrl === image.fileUrl) {
      continue;
    }

    await prisma.imageGallery.update({
      where: { id: image.id },
      data: {
        fileUrl: normalizedFileUrl,
      },
    });

    updatedGalleryRows += 1;
    normalizedGalleryRows += 1;
  }

  return {
    scannedGalleryRows: galleryImages.length,
    updatedGalleryRows,
    deletedGalleryRows,
    normalizedGalleryRows,
  };
}

async function main() {
  try {
    console.log('[media-repair] Starting repair...');

    const productSummary = await repairProducts();
    const gallerySummary = await repairImageGallery();

    const summary = {
      productSummary,
      gallerySummary,
    };

    console.log('[media-repair] Completed successfully');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('[media-repair] Failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
