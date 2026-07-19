const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

const startMarker = '        {/* Header */}\n        <div className="px-4 lg:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">';
const endMarker = '        </div>\n\n        {/* Metadata Grid */}';

const startIdx = src.indexOf(startMarker);
const endIdx = src.indexOf(endMarker);

console.log('startIdx', startIdx, 'endIdx', endIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error('Header markers not found');
  process.exit(1);
}

const newHeader = fs.readFileSync('H:/maxp-platform/.codex/temp/new-header.txt', 'utf8').replace(/\r+/g, '').replace(/\n$/, '');

src = src.slice(0, startIdx) + newHeader + src.slice(endIdx + endMarker.length);

fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed header.');
