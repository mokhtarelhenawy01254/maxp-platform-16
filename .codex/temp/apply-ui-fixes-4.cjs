const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8');

// Helper to build the restructured tool row.
function restructureToolRow(src, baseClass, isWrite = false) {
  const color = isWrite ? 'amber' : 'indigo';
  const regex = new RegExp(
    `<button key=\{tool\.name\} type="button" onClick=\{\(\) =\u003e toggleTool\(tool\.name\)\}\n` +
    `\s*className=\{cn\(\n` +
    `\s*"${baseClass.replace(/[\/\[\]\(\)\*\+\?\.\^\$\|]/g, '\\\\$&')}",\n` +
    `\s*enabled \? "border-${color}-400/40 bg-${color}-500/5" : "border-slate-200 dark:border-slate-700 hover:border-${color}-400/20 opacity-60",\n` +
    `\s*\)\}\n` +
    `\s*\>\n` +
    `\s*\<Switch checked=\{enabled\} className="pointer-events-none shrink-0" \/\>\n` +
    `\s*\<div className="min-w-0 flex-1"\>\n` +
    `\s*\<p className=\{cn\("text-xs font-semibold truncate", enabled \? "text-${color}-600 dark:text-${color}-400" : "text-slate-500"\)\}\>\{tool\.name\}\<\/p\>\n` +
    `\s*\{tool\.description \&\& \<p className="text-\[0\.65rem\] text-slate-500 truncate mt-0\.5"\>\{tool\.description\}\<\/p\>\}\n` +
    `\s*\<\/div\>\n` +
    `\s*\{enabled \&\& \<AutonomySelect toolName=\{tool\.name\} \/\>\}\n` +
    `\s*\<\/button\>`,
    'g'
  );

  const replacement = `<div
                        key={tool.name}
                        className={cn(
                          "flex items-center rounded-lg border text-sm transition-colors overflow-hidden",
                          enabled ? "border-${color}-400/40 bg-${color}-500/5" : "border-slate-200 dark:border-slate-700 hover:border-${color}-400/20 opacity-60",
                        )}
                      >
                        <button type="button" onClick={() => toggleTool(tool.name)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${color}-500"
                        >
                          <Switch checked={enabled} className="pointer-events-none shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs font-semibold truncate", enabled ? "text-${color}-600 dark:text-${color}-400" : "text-slate-500")}>{tool.name}</p>
                            {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                          </div>
                        </button>
                        {enabled && (
                          <div className="px-2">
                            <AutonomySelect toolName={tool.name} />
                          </div>
                        )}
                      </div>`;

  return src.replace(regex, replacement);
}

src = restructureToolRow(src, "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", false);
src = restructureToolRow(src, "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", true);

// For the Add Tool Dialog rows.
const dialogRegex = /\<button key=\{tool\.name\} type="button" onClick=\{\(\) =\u003e toggleTool\(tool\.name\)\}\n\s*className=\{cn\("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",\n\s*enabled \? "border-indigo-400\/40 bg-indigo-500\/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400\/20",\n\s*\)\}\n\s*\>\n\s*\<Switch checked=\{enabled\} className="pointer-events-none shrink-0" \/\>\n\s*\<div className="min-w-0 flex-1"\>\n\s*\<p className=\{cn\("text-xs font-semibold", enabled \? "text-indigo-700 dark:text-indigo-400" : "text-slate-500"\)\}\>\{tool\.name\}\<\/p\>\n\s*\{tool\.description \&\& \<p className="text-\[0\.65rem\] text-slate-500 truncate"\>\{tool\.description\}\<\/p\>\}\n\s*\<\/div\>\n\s*\{enabled \&\& \(\n\s*\<select value=\{draftToolAutonomy\[tool\.name\] \|\| "auto"\} onChange=\{\(e\) =\u003e \{ e\.stopPropagation\(\); setToolAutonomy\(tool\.name, e\.target\.value\); \}\}\n\s*onClick=\{\(e\) =\u003e e\.stopPropagation\(\)\}\n\s*className="h-6 rounded border bg-background px-1 text-\[0\.6rem\]"\n\s*\>\n\s*\{autonomyOptions\.map\(\(opt\) =\u003e \(\<option key=\{opt\.value\} value=\{opt\.value\}\>\{opt\.label\}\<\/option\>\)\)\}\n\s*\<\/select\>\n\s*\)\}\n\s*\<\/button\>/g;

const dialogReplacement = `<div
                  key={tool.name}
                  className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <button type="button" onClick={() => toggleTool(tool.name)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Switch checked={enabled} className="pointer-events-none shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                      {tool.description && <p className="text-[0.65rem] text-slate-500 truncate">{tool.description}</p>}
                    </div>
                  </button>
                  {enabled && (
                    <div className="px-2">
                      <select value={draftToolAutonomy[tool.name] || "auto"} onChange={(e) => { e.stopPropagation(); setToolAutonomy(tool.name, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 rounded border bg-background px-1 text-[0.6rem]"
                      >
                        {autonomyOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                  )}
                </div>`;

src = src.replace(dialogRegex, dialogReplacement);

fs.writeFileSync(file, src, 'utf8');
console.log('Applied UI fixes part 4.');
