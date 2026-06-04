
const registry = require('../src/templates/registry');

async function main() {
  await registry.initialize();
  const auraChic = registry.getTemplate('aura-chic');
  if (auraChic) {
    console.log('--- Aura Chic Manifest Keys ---');
    console.log(Object.keys(auraChic.manifest));
    console.log('--- Aura Chic Design Tokens (exists) ---');
    console.log(!!auraChic.manifest.designTokens);
    if (auraChic.manifest.designTokens) {
        console.log('--- Aura Chic Design Tokens (colors) ---');
        console.log(auraChic.manifest.designTokens.colors);
    }
  } else {
    console.error('Aura Chic not found');
  }
}

main().catch(console.error);
