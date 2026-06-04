
const registry = require('../src/templates/registry');
const path = require('path');

async function main() {
  console.log('--- Registry Debugger ---');
  await registry.initialize();
  
  const allTemplates = registry.getAllManifests();
  console.log('Total templates loaded:', allTemplates.length);
  
  const auraChic = registry.getTemplate('aura-chic');
  if (auraChic) {
    console.log('✅ Aura Chic found!');
    console.log('Manifest:', JSON.stringify(auraChic.manifest, null, 2));
  } else {
    console.error('❌ Aura Chic NOT found in registry.');
    
    // Check if files exist at the path the registry expects
    const systemPath = path.join(__dirname, '..', 'src', 'templates', 'system');
    const auraPath = path.join(systemPath, 'aura-chic');
    const manifestPath = path.join(auraPath, 'manifest.json');
    const fs = require('fs');
    console.log('Checking path:', auraPath);
    console.log('Manifest exists:', fs.existsSync(manifestPath));
    if (fs.existsSync(manifestPath)) {
        try {
            const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            console.log('Manifest slug:', m.slug);
            const { validateManifest } = require('../src/templates/schemas');
            validateManifest(m);
            console.log('Manifest validation passed.');
        } catch (e) {
            console.error('Manifest error:', e.message);
        }
    }
  }
}

main().catch(console.error);
