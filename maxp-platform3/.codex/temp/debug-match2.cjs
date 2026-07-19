const fs = require('fs');
const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
const raw = fs.readFileSync(file, 'utf8');
console.log('raw bytes around first tool button:');
const idx = raw.indexOf('<button key={tool.name}');
console.log('idx', idx);
if (idx >= 0) {
  const snippet = raw.slice(idx - 50, idx + 250);
  for (let i = 0; i < snippet.length; i++) {
    const c = snippet[i];
    if (c === '\r') process.stdout.write('\\r');
    else if (c === '\n') process.stdout.write('\\n\n');
    else process.stdout.write(c);
  }
}
