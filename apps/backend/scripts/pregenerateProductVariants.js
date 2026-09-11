/**
 * Backfill script to pregenerate standard responsive variants (160w, 480w, 560w, 960w)
 * for all existing uploaded images on the server.
 *
 * Usage:
 *   node scripts/pregenerateProductVariants.js
 */

const fs = require('fs');
const path = require('path');
const {
  isOptimizableUploadImage,
  pregenerateCommonUploadVariants,
  COMMON_PREGEN_VARIANTS,
} = require('../utils/uploadImageOptimizer');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');
const TARGET_DIRS = ['products', 'media'].map((sub) => path.join(UPLOADS_ROOT, sub));

async function run() {
  console.log('🚀 [BACKFILL] Starting pregeneration of image variants...');
  console.log(`📁 Target widths: ${COMMON_PREGEN_VARIANTS.map((v) => `${v.width}w`).join(', ')}`);

  let totalFiles = 0;
  let processedFiles = 0;
  let skippedFiles = 0;
  let errorFiles = 0;

  for (const targetDir of TARGET_DIRS) {
    if (!fs.existsSync(targetDir)) {
      console.log(`ℹ️  Directory does not exist, skipping: ${targetDir}`);
      continue;
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const imageFiles = entries
      .filter((entry) => entry.isFile() && isOptimizableUploadImage(entry.name))
      .map((entry) => path.join(targetDir, entry.name));

    console.log(`\n📂 Scanning ${path.basename(targetDir)}: found ${imageFiles.length} optimizable images.`);
    totalFiles += imageFiles.length;

    for (let i = 0; i < imageFiles.length; i++) {
      const filePath = imageFiles[i];
      try {
        const generated = await pregenerateCommonUploadVariants(filePath);
        if (generated.length > 0) {
          processedFiles++;
        } else {
          skippedFiles++;
        }
        if ((i + 1) % 10 === 0 || i + 1 === imageFiles.length) {
          process.stdout.write(`  Processed ${i + 1}/${imageFiles.length} (${Math.round(((i + 1) / imageFiles.length) * 100)}%)\r`);
        }
      } catch (err) {
        errorFiles++;
        console.error(`\n❌ Error processing ${path.basename(filePath)}: ${err.message}`);
      }
    }
    console.log('');
  }

  console.log('\n========================================');
  console.log(`✅ [BACKFILL COMPLETE]`);
  console.log(`   Total images scanned:   ${totalFiles}`);
  console.log(`   Processed/Updated:      ${processedFiles}`);
  console.log(`   Skipped (already fresh): ${skippedFiles}`);
  console.log(`   Errors:                 ${errorFiles}`);
  console.log('========================================\n');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Fatal backfill error:', err);
    process.exit(1);
  });
}

module.exports = { run };
