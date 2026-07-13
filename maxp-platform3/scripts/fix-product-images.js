const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = '/var/www/backend2/uploads/products';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://appuser:mokhtar1234@localhost:5432/maxp',
});

async function main() {
  const { rows: products } = await pool.query(`
    SELECT id, "companyId", name, "mainImage", images
    FROM products
    WHERE "mainImage" ~ '/uploads/products/' OR images ~ '/uploads/products/'
    ORDER BY "companyId"
  `);

  console.log(`Found ${products.length} products with local image references`);

  let fixed = 0;

  for (const product of products) {
    const mainImage = product.mainImage;
    const imagesRaw = product.images;

    let validMainImage = null;
    let validImages = [];

    // Check mainImage
    if (mainImage && mainImage.startsWith('/uploads/products/')) {
      const filename = path.basename(mainImage);
      if (fs.existsSync(path.join(UPLOADS_DIR, filename))) {
        validMainImage = mainImage;
      } else {
        console.log(`  MISSING mainImage: ${filename} (product: ${product.name})`);
      }
    }

    // Check images array
    if (imagesRaw) {
      let parsed;
      try {
        parsed = JSON.parse(imagesRaw);
      } catch {
        parsed = [imagesRaw];
      }
      if (!Array.isArray(parsed)) parsed = [parsed];

      for (const img of parsed) {
        if (typeof img === 'string' && img.startsWith('/uploads/products/')) {
          const filename = path.basename(img);
          if (fs.existsSync(path.join(UPLOADS_DIR, filename))) {
            validImages.push(img);
          } else {
            console.log(`  MISSING image: ${filename} (product: ${product.name})`);
          }
        } else {
          validImages.push(img);
        }
      }
    }

    const changed =
      (validMainImage !== mainImage || mainImage === null) ||
      JSON.stringify(validImages) !== imagesRaw;

    if (changed) {
      await pool.query(
        `UPDATE products SET "mainImage" = $1, images = $2 WHERE id = $3`,
        [validMainImage, JSON.stringify(validImages), product.id]
      );
      fixed++;
      console.log(`  FIXED product ${product.id}: mainImage ${mainImage ? 'removed' : 'unchanged'}, ${imagesRaw ? (imagesRaw.match(/\/uploads\/products\/[^,"]+/g) || []).length : 0} images → ${validImages.length} valid`);
    }
  }

  console.log(`\nFixed ${fixed}/${products.length} products`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
