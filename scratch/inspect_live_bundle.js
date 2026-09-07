const https = require('https');

https.get('https://fiore.maxp.online/assets/index-Du5PiB3b.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Bundle length:', data.length);
    const matches = data.match(/دليل[^\s\"\'\`\<]{0,30}/g);
    console.log('Matches for دليل in live bundle:', matches ? Array.from(new Set(matches)).slice(0, 20) : 'None');
    
    // Check if canOpenSizeGuide or sizeGuideText logic is in bundle
    const hasSizeGuide = data.includes('hasCustomProductSizeGuide');
    console.log('Includes hasCustomProductSizeGuide in bundle code:', hasSizeGuide);
  });
});
