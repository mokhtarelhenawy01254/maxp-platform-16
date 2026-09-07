const fs = require('fs');

(async () => {
  try {
    const htmlRes = await fetch('https://maxp.online/?t=' + Date.now(), { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } });
    const html = await htmlRes.text();

    const matches = Array.from(html.matchAll(/src="([^"]+\.js)"/g));
    console.log('Fresh JS script src tags found:', matches.map(m => m[1]));

    for (const match of matches) {
      const scriptPath = match[1];
      const jsUrl = (scriptPath.startsWith('http') ? scriptPath : 'https://maxp.online' + scriptPath) + '?t=' + Date.now();
      const jsRes = await fetch(jsUrl);
      const js = await jsRes.text();

      const chunkMatches = Array.from(js.matchAll(/assets\/[a-zA-Z0-9_\-]+\.js/g));
      const chunkPaths = Array.from(new Set(chunkMatches.map(m => m[0])));

      for (const chunkPath of chunkPaths) {
        const chunkUrl = 'https://maxp.online/' + chunkPath + '?t=' + Date.now();
        const cRes = await fetch(chunkUrl);
        const cJs = await cRes.text();

        if (cJs.includes('maxp_defaultPage')) {
          console.log(`✅ [CONFIRMED LIVE] maxp_defaultPage in chunk: ${chunkUrl}`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
