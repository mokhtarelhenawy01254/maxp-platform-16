const fs = require('fs');
const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

const start = '                      <button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}';
const idx = src.indexOf(start);
console.log('start idx:', idx);
if (idx >= 0) {
  const end = src.indexOf('                      </button>', idx);
  console.log('end idx:', end);
  console.log('block length:', end - idx + 25);
  console.log('---');
  console.log(src.slice(idx, end + 25));
  console.log('---');
}
