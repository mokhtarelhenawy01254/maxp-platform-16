
const fs = require('fs');
const path = require('path');

function resolveUploadAssetCandidates(assetPath) {
  const relativeUploadPath = assetPath.split('?')[0].replace(/^\/+/, '');
  console.log(`Relative Path: ${relativeUploadPath}`);
  
  // __dirname should be backend/scratch for this test, so we adjust to match backend/routes
  const mockRoutesDir = path.join(__dirname, 'routes');
  
  const candidates = [
    path.join(mockRoutesDir, '..', relativeUploadPath),
    path.join(mockRoutesDir, '..', '..', relativeUploadPath),
  ];
  
  console.log(`Candidates:`);
  candidates.forEach(c => console.log(`- ${c}`));
  return candidates;
}

const testAsset = '/uploads/products/product-010531bd-95bd-4e9e-aaa7-c10f36894da0.png';
const candidates = resolveUploadAssetCandidates(testAsset);
const exists = candidates.some(c => fs.existsSync(c));
console.log(`Result: ${exists ? 'EXISTS' : 'MISSING'}`);
