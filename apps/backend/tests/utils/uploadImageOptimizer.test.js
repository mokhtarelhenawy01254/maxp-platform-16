const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const {
  COMMON_PREGEN_VARIANTS,
  buildOptimizedVariantPath,
  isOptimizableUploadImage,
  parseUploadOptimizationQuery,
  pregenerateCommonUploadVariants,
  resolveOptimizedUploadVariant,
} = require('../../utils/uploadImageOptimizer');

describe('uploadImageOptimizer', () => {
  it('parses and clamps optimization query parameters safely', () => {
    expect(parseUploadOptimizationQuery({})).toBeNull();

    expect(
      parseUploadOptimizationQuery({
        width: '99999',
        quality: '10',
        format: 'jpeg',
      }),
    ).toEqual({
      width: 2400,
      quality: 40,
      format: 'webp',
    });
  });

  it('keeps variant paths unique per source extension and skips gif optimization', () => {
    const jpgVariantPath = buildOptimizedVariantPath('/tmp/catalog/photo.jpg', {
      width: 800,
      quality: 75,
      format: 'webp',
    });
    const pngVariantPath = buildOptimizedVariantPath('/tmp/catalog/photo.png', {
      width: 800,
      quality: 75,
      format: 'webp',
    });

    expect(jpgVariantPath).not.toBe(pngVariantPath);
    expect(jpgVariantPath).toContain('photo__src-jpg_w800_q75.webp');
    expect(pngVariantPath).toContain('photo__src-png_w800_q75.webp');
    expect(isOptimizableUploadImage('/tmp/catalog/animated-banner.gif')).toBe(false);
  });

  it('creates a cached webp variant with the requested width', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-image-optimizer-'));
    const sourceFilePath = path.join(tempDir, 'product.JPG');

    await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: '#d0a770',
      },
    })
      .jpeg({ quality: 92 })
      .toFile(sourceFilePath);

    const result = await resolveOptimizedUploadVariant({
      sourceFilePath,
      query: { w: '800', q: '75', format: 'webp' },
    });

    expect(result).toBeTruthy();
    expect(result.filePath).toBe(buildOptimizedVariantPath(sourceFilePath, {
      width: 800,
      quality: 75,
      format: 'webp',
    }));
    expect(fs.existsSync(result.filePath)).toBe(true);

    const metadata = await sharp(result.filePath).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(800);
    expect(metadata.height).toBeGreaterThan(0);
  });

  it('pregenerates all standard variants on upload', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-pregen-test-'));
    const sourceFilePath = path.join(tempDir, 'sample-item.png');

    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toFile(sourceFilePath);

    const generated = await pregenerateCommonUploadVariants(sourceFilePath);
    expect(generated.length).toBe(COMMON_PREGEN_VARIANTS.length);

    for (const variantPath of generated) {
      expect(fs.existsSync(variantPath)).toBe(true);
      const meta = await sharp(variantPath).metadata();
      expect(meta.format).toBe('webp');
    }
  });
});
