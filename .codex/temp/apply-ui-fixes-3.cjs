const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8');

// Remove redundant onKeyDown handlers from tool/skill buttons.
src = src.replace(/\n\s*onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter" \|\| e\.key === " "\) \{ e\.preventDefault\(\); toggleTool\(tool\.name\); \} \}\}/g, '');
src = src.replace(/\n\s*onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter" \|\| e\.key === " "\) \{ e\.preventDefault\(\); toggleSkill\(skill\.id\); \} \}\}/g, '');

// Add focus-visible ring to tool/skill buttons that are now real buttons.
src = src.replace(
  /"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",/g,
  '"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",'
);
src = src.replace(
  /"flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors",/g,
  '"flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",'
);
src = src.replace(
  /"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"/g,
  '"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"'
);

// For the write tools, the ring should be amber (matches their border color).
src = src.replace(
  /"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",\n\s*enabled \? "border-amber-400\/40/g,
  '"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",\n                          enabled ? "border-amber-400/40'
);

// Fix closing tags: tool rows in lists and dialogs that still close with </div> but open with <button>.
// We target patterns where </div> follows AutonomySelect or Switch content inside a button block.
// We'll use a regex that finds <button ...>...\n\s*\u003c\/div\u003e\n\s*\);\n\s*\}\)\}/ and replaces with </button>.
src = src.replace(
  /(\u003cbutton key=\{tool\.name\} type="button" onClick=\{\(\) => toggleTool\(tool\.name\)\}[\s\S]*?)(\u003c\/div\u003e\n\s*\);\n\s*\}\}\n\s*\u003c\/div\u003e)/g,
  '$1</button>\n                      );\n                  })}\n                </div>'
);
src = src.replace(
  /(\u003cbutton key=\{tool\.name\} type="button" onClick=\{\(\) => toggleTool\(tool\.name\)\}[\s\S]*?\{enabled && \(\n\s*\u003cselect[\s\S]*?\u003c\/select\u003e\n\s*\)\}\n\s*)\u003c\/div\u003e(\n\s*\);\n\s*\}\}\n\s*\u003c\/div\u003e)/g,
  '$1</button>$2'
);

fs.writeFileSync(file, src, 'utf8');
console.log('Applied UI fixes part 3.');
