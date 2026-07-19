const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

const marker = '  /* ── Load profile ── */';
const titleEffect = `  /* ── Update page title ── */
  useEffect(() => {
    if (selectedAgent?.name) {
      document.title = selectedAgent.name + " — " + t("agentProfiles.sidebar.title");
    }
    return () => {
      document.title = "منصة إدارة التواصل والتجارة الإلكترونية";
    };
  }, [selectedAgent, t]);

`;

const idx = src.indexOf(marker);
if (idx === -1) {
  console.error('marker not found');
  process.exit(1);
}

if (src.includes('/* ── Update page title ── */')) {
  console.log('Title effect already exists');
} else {
  src = src.slice(0, idx) + titleEffect + src.slice(idx);
  fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Added title effect');
}
