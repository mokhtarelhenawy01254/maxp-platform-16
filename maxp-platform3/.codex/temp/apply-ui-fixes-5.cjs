const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8');

function restructureBlock(src, keyExpr, itemName, isDialog = false, color = 'indigo') {
  const regex = new RegExp(
    `(<button key=\{${keyExpr}\} type="button" onClick=\{\(\) =\u003e toggle(?:Tool|Skill)\(${itemName}\)\}\n` +
    `\s*className=\{cn\(\n` +
    `\s*"([^"]*)",\n` +
    `\s*enabled \? "([^"]*)" : "([^"]*)",\n` +
    `\s*\)\}\n` +
    `\s*\>\n` +
    `\s*\<Switch checked=\{enabled\} className="pointer-events-none shrink-0" \/\>\n` +
    `\s*\<div className="min-w-0 flex-1"\>[\s\S]*?\{enabled \&\& \u003c(?:AutonomySelect|select)[\s\S]*?\u003e[\s\S]*?\}\n` +
    `\s*\<\/button\>)`,
    'g'
  );

  return src.replace(regex, (match, block) => {
    // Extract className cn args from block.
    const classMatch = block.match(/className=\{cn\(\n\s*"([^"]+)",\n\s*enabled \? "([^"]+)" : "([^"]+)",\n\s*\)\}/);
    if (!classMatch) return match;
    const [_, baseCls, activeCls, inactiveCls] = classMatch;

    // Extract the Switch and inner content.
    const innerMatch = block.match(/\<Switch checked=\{enabled\} className="pointer-events-none shrink-0" \/\>\n\s*(\<div className="min-w-0 flex-1"\>[\s\S]*?\<\/div\>)\n\s*\{enabled \&\& ([\s\S]*?)\n\s*\<\/button\>/);
    if (!innerMatch) return match;
    const content = innerMatch[1];
    const selectBlock = innerMatch[2].trim();

    return `<div
                        key={${keyExpr}}
                        className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "${activeCls}" : "${inactiveCls}")}
                      >
                        <button type="button" onClick={() => toggleTool(${itemName})}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${color}-500"
                        >
                          <Switch checked={enabled} className="pointer-events-none shrink-0" />
                          ${content.replace(/^\s*/gm, '                          ')}
                        </button>
                        {enabled && (
                          <div className="px-2">${selectBlock}</div>
                        )}
                      </div>`;
  });
}

// For read tools (indigo).
src = restructureBlock(src, 'tool.name', 'tool.name', false, 'indigo');
// For write tools (amber).
src = restructureBlock(src, 'tool.name', 'tool.name', false, 'amber');
// For dialog tools (indigo).
src = restructureBlock(src, 'tool.name', 'tool.name', true, 'indigo');

fs.writeFileSync(file, src, 'utf8');
console.log('Applied UI fixes part 5.');
