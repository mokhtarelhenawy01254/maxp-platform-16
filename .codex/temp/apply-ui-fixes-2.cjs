const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8');

// 1. Template icon picker button: replace transition-all with transition-colors (it has shadow-sm).
src = src.replace(
  /className=\{\`size-7 flex items-center justify-center rounded-lg text-sm border transition-all \$\{/,
  'className={`size-7 flex items-center justify-center rounded-lg text-sm border transition-colors shadow-sm ${'
);

// Remove the shadow-sm from the active branch since we added it globally.
src = src.replace(
  /"border-indigo-400 bg-indigo-50 dark:bg-indigo-950\/30 dark:border-indigo-600 shadow-sm"/,
  '"border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600"'
);

// 2. Convert role=button divs in ToolsAndSkillsTab and dialogs to actual buttons.
// Pattern: <div key="..." role="button" tabIndex={0} onClick={() => toggleTool(tool.name)}
src = src.replace(
  /<div key=\{tool\.name\} role="button" tabIndex=\{0\} onClick=\{\(\) => toggleTool\(tool\.name\)\}/g,
  '<button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}'
);
src = src.replace(
  /<div key=\{tool\.name\} role="button" tabIndex=\{0\} onClick=\{\(\) => toggleTool\(tool\.name\)\}\n\s*onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter" \|\| e\.key === " "\) \{ e\.preventDefault\(\); toggleTool\(tool\.name\); \} \}\}/g,
  '<button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}'
);
src = src.replace(
  /<div key=\{skill\.id\} role="button" tabIndex=\{0\} onClick=\{\(\) => toggleSkill\(skill\.id\)\}/g,
  '<button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}'
);
src = src.replace(
  /<div key=\{skill\.id\} role="button" tabIndex=\{0\} onClick=\{\(\) => toggleSkill\(skill\.id\)\}\n\s*onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter" \|\| e\.key === " "\) \{ e\.preventDefault\(\); toggleSkill\(skill\.id\); \} \}\}/g,
  '<button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}'
);

// 3. Remove cursor-pointer from buttons (not needed), remove tabIndex/onKeyDown.
src = src.replace(/cursor-pointer transition-all/g, 'transition-colors');
src = src.replace(/cursor-pointer transition-colors/g, 'transition-colors');

// 4. Closing tags for role=button divs -> /button.
src = src.replace(/onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter" \|\| e\.key === " "\) \{ e\.preventDefault\(\); toggleTool\(tool\.name\); \} \}\}\n\s*className=/g, 'className=');
src = src.replace(/onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter" \|\| e\.key === " "\) \{ e\.preventDefault\(\); toggleSkill\(skill\.id\); \} \}\}\n\s*className=/g, 'className=');

fs.writeFileSync(file, src, 'utf8');
console.log('Applied UI fixes part 2.');
