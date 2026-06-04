
const fs = require('fs');
const path = require('path');

function resolveUploadAssetCandidates(assetPath) {
  const relativeUploadPath = assetPath.split('?')[0].replace(/^\/+/, '');
  console.log(`Relative Path: ${relativeUploadPath}`);
  
  // Immitating backend/routes directory structure
  // Since this script is in backend, __dirname is backend.
  // We want to simulate what happens in backend/routes/publicProductsRoutes.js
  const mockRoutesDir = path.join(__dirname, 'routes');
  
  const candidates = [
    path.join(mockRoutesDir, '..', relativeUploadPath),
    path.join(mockRoutesDir, '..', '..', relativeUploadPath),
  ];
  
  console.log(`Candidates:`);
  candidates.forEach(c => console.log(`- ${c}`));
  return candidates;
}

const testAsset = '/uploads/products/product-0869c606-9e2e-46da-a2b9-6afea510d739.webp';
const candidates = resolveUploadAssetCandidates(testAsset);
const exists = candidates.some(c => fs.existsSync(c));
console.log(`Result: ${exists ? 'EXISTS' : 'MISSING'}`);
