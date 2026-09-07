const https = require('https');

https.get('https://fiore.maxp.online/assets/storefront-sections-DZzETSoU.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Sections Chunk length:', data.length);
    const hasCustomProductSizeGuide = data.includes('hasCustomProductSizeGuide');
    console.log('Includes hasCustomProductSizeGuide:', hasCustomProductSizeGuide);
    
    // Find occurrence of sizeGuideText or ruler icon or size guide text
    const sizeGuideMatches = data.match(/sizeGuide[a-zA-Z0-9_]*/g) || [];
    console.log('sizeGuide tokens in live chunk:', Array.from(new Set(sizeGuideMatches)));

    // Let's check how showSizeGuide is defined in this chunk!
    const idx = data.indexOf('hasCustomProductSizeGuide');
    if (idx !== -1) {
      console.log('Context around hasCustomProductSizeGuide:');
      console.log(data.slice(Math.max(0, idx - 200), Math.min(data.length, idx + 300)));
    }
  });
});
