const fs = require('fs');
const path = require('path');
const {
  cloneImageCollection,
  cloneMetadataMedia,
  cloneStoredAssetUrl,
  normalizeStoredAssetUrl,
  resolveProductMediaState,
  sanitizeImageCollection,
  sanitizeMetadataMedia,
} = require('../../utils/productMediaUtils');

describe('productMediaUtils', () => {
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'products');
  const existingImageName = 'product-media-utils-existing.jpg';
  const duplicatedImageName =
    'product-media-utils-existing-copy-123e4567-e89b-12d3-a456-426614174000.jpg';
  const attributeImageName = 'product-media-utils-attribute.png';
  const existingImagePath = path.join(uploadsDir, existingImageName);
  const duplicatedImagePath = path.join(uploadsDir, duplicatedImageName);
  const attributeImagePath = path.join(uploadsDir, attributeImageName);

  beforeAll(() => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(existingImagePath, 'existing-image');
    fs.writeFileSync(duplicatedImagePath, 'duplicated-image');
    fs.writeFileSync(attributeImagePath, 'attribute-image');
  });

  afterAll(() => {
    [existingImagePath, duplicatedImagePath, attributeImagePath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    const clonedArtifacts = fs
      .readdirSync(uploadsDir)
      .filter((fileName) => fileName.includes('-copy-'));

    clonedArtifacts.forEach((fileName) => {
      const filePath = path.join(uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  test('normalizes absolute upload URLs to relative upload paths', () => {
    expect(
      normalizeStoredAssetUrl(`https://swan.maxp.online/uploads/products/${existingImageName}?v=1`),
    ).toBe(`/uploads/products/${existingImageName}?v=1`);
  });

  test('keeps valid images and drops missing local uploads', () => {
    expect(
      sanitizeImageCollection([
        `/uploads/products/${existingImageName}`,
        `https://swan.maxp.online/uploads/products/${existingImageName}`,
        '/uploads/products/product-media-utils-missing.jpg',
        'https://cdn.example.com/catalog/image.jpg',
      ]),
    ).toEqual([
      `/uploads/products/${existingImageName}`,
      'https://cdn.example.com/catalog/image.jpg',
    ]);
  });

  test('falls back mainImage to the first valid image after gallery replacement', () => {
    expect(
      resolveProductMediaState({
        currentImages: [`/uploads/products/${existingImageName}`],
        currentMainImage: `/uploads/products/${existingImageName}`,
        nextImages: ['https://cdn.example.com/new-image.jpg'],
      }),
    ).toEqual({
      images: ['https://cdn.example.com/new-image.jpg'],
      mainImage: 'https://cdn.example.com/new-image.jpg',
    });
  });

  test('sanitizes nested metadata attribute images and removes missing upload files', () => {
    expect(
      sanitizeMetadataMedia({
        variantSettings: {
          attributeImages: {
            Color: {
              Red: `https://swan.maxp.online/uploads/products/${attributeImageName}`,
              Blue: '/uploads/products/product-media-utils-missing.jpg',
            },
            Size: {
              XL: 'https://cdn.example.com/variant/green.jpg',
            },
          },
        },
      }),
    ).toEqual({
      variantSettings: {
        attributeImages: {
          Color: {
            Red: `/uploads/products/${attributeImageName}`,
          },
          Size: {
            XL: 'https://cdn.example.com/variant/green.jpg',
          },
        },
      },
    });
  });

  test('keeps supporting legacy flat metadata attribute images', () => {
    expect(
      sanitizeMetadataMedia({
        variantSettings: {
          attributeImages: {
            color1: `https://swan.maxp.online/uploads/products/${attributeImageName}`,
            color2: '/uploads/products/product-media-utils-missing.jpg',
          },
        },
      }),
    ).toEqual({
      variantSettings: {
        attributeImages: {
          color1: `/uploads/products/${attributeImageName}`,
        },
      },
    });
  });

  test('clones local upload assets into new files', () => {
    const clonedAssetUrl = cloneStoredAssetUrl(`/uploads/products/${existingImageName}`);

    expect(clonedAssetUrl).toMatch(/^\/uploads\/products\/.+-copy-.+\.jpg$/);
    expect(clonedAssetUrl).not.toBe(`/uploads/products/${existingImageName}`);

    const clonedPath = path.join(__dirname, '..', '..', clonedAssetUrl.replace(/^\/+/, ''));
    expect(fs.existsSync(clonedPath)).toBe(true);
  });

  test('replaces older duplicate suffixes instead of appending another copy chain', () => {
    const clonedAssetUrl = cloneStoredAssetUrl(`/uploads/products/${duplicatedImageName}`);

    expect(clonedAssetUrl).toMatch(
      /^\/uploads\/products\/product-media-utils-existing-copy-[0-9a-f-]+\.jpg$/i,
    );
    expect(clonedAssetUrl.split('-copy-')).toHaveLength(2);
  });

  test('reuses the same cloned local asset within one duplication context', () => {
    const cloneCache = new Map();
    const clonedImages = cloneImageCollection(
      [
        `/uploads/products/${existingImageName}`,
        `/uploads/products/${existingImageName}`,
      ],
      { cloneCache },
    );

    expect(clonedImages).toHaveLength(1);
    expect(clonedImages[0]).toMatch(/^\/uploads\/products\/.+-copy-.+\.jpg$/);
  });

  test('clones nested metadata media while keeping repeated references stable', () => {
    const cloneCache = new Map();
    const clonedMetadata = cloneMetadataMedia(
      {
        heroImage: `/uploads/products/${existingImageName}`,
        variantSettings: {
          attributeImages: {
            Color: {
              Red: `/uploads/products/${existingImageName}`,
            },
          },
        },
      },
      { cloneCache },
    );

    expect(clonedMetadata.heroImage).toMatch(/^\/uploads\/products\/.+-copy-.+\.jpg$/);
    expect(clonedMetadata.variantSettings.attributeImages.Color.Red).toBe(
      clonedMetadata.heroImage,
    );
  });
});
