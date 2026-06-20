const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

src = src.replace(
  '  }, [selectedAgent, t]);\n\n  /* ── Load profile ── */',
  '  }, [selectedAgent?.name, t]);\n\n  /* ── Load profile ── */'
);

fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed title deps.');
