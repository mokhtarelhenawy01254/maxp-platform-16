const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

const titleEffect = `  /* ── Update page title ── */
  useEffect(() => {
    if (selectedAgent?.name) {
      document.title = selectedAgent.name + " — " + t("agentProfiles.sidebar.title");
    }
  }, [selectedAgent?.name, t]);

`;

// Remove existing title effect.
src = src.replace(/  \/\* ── Update page title ── \*\/\n  useEffect\(\(\) =\u003e \{\n    if \(selectedAgent\?\.name\) \{\n      document\.title = selectedAgent\.name \+ " — " \+ t\("agentProfiles\.sidebar\.title"\);\n    \}\n  \}, \[selectedAgent\?\.name, t\]\);\n\n/, '');

const marker = '  const selectedAgent = agents.find((a) =\u003e a.id === selectedId);\n';
const idx = src.indexOf(marker);
if (idx === -1) {
  console.error('selectedAgent declaration not found');
  process.exit(1);
}

src = src.slice(0, idx + marker.length) + '\n' + titleEffect + src.slice(idx + marker.length);

fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Moved title effect.');
