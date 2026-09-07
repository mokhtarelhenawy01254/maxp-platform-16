const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const mainJs = await fetchUrl('https://fiore.maxp.online/assets/index-Ch5wXrt_.js');
  console.log('Main JS length:', mainJs.length);

  // Find chunk names like "assets/ProductInfo-..." or "assets/..."
  const chunkMatches = mainJs.match(/assets\/[a-zA-Z0-9_\-]+\.js/g) || [];
  console.log('Chunk matches found in main JS:', Array.from(new Set(chunkMatches)));

  // Let's also search for all .js files in the assets directory by parsing imports
  const importMatches = mainJs.match(/"([^"]+\.js)"/g) || [];
  console.log('Imports found:', importMatches);
})();
