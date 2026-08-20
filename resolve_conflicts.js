const fs = require('fs');

function resolveReturnsJSON(file) {
  let content = fs.readFileSync(file, 'utf8');
  const match = content.match(/<<<<<<< Updated upstream\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> Stashed changes/);
  if (!match) return;

  const upstream = match[1].trim();
  const stashed = match[2].trim();

  // upstream has keys up to k_260
  // stashed has k_221, k_222, k_223. We want to re-key them to k_261, k_262, k_263.
  let newStashed = stashed.replace(/"k_221":/g, '"k_261":')
                          .replace(/"k_222":/g, '"k_262":')
                          .replace(/"k_223":/g, '"k_263":');

  let replacement = upstream + ',\n' + newStashed;
  
  content = content.replace(/<<<<<<< Updated upstream\n[\s\S]*?>>>>>>> Stashed changes/, replacement);
  fs.writeFileSync(file, content);
}

resolveReturnsJSON('apps/frontend/src/locales/ar/sections/orders/returns.json');
resolveReturnsJSON('apps/frontend/src/locales/en/sections/orders/returns.json');

function resolveTranslationJSON(file) {
  let content = fs.readFileSync(file, 'utf8');
  // keep upstream, discard stashed or just accept upstream for translation since it's generated?
  // Actually, we can just replace the markers and let the user re-generate translations if needed.
  // Wait, let's look at translation.json manually or just run `git checkout --ours` or something.
}

console.log("returns.json fixed");
