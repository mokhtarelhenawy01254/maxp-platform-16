const https = require('https');

https.get('https://fiore.maxp.online/product/mlabs-nsaeyh-1788425645', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTML length:', data.length);
    console.log('Full HTML:', data);
  });
});
