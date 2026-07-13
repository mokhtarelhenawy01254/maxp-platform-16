const fs = require('fs');
const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const search = '                      <button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}\n\n                        className={cn(';
const idx = src.indexOf(search);
console.log('index:', idx);
if (idx >= 0) {
  console.log('Found snippet:', JSON.stringify(src.slice(idx, idx + 200)));
}
