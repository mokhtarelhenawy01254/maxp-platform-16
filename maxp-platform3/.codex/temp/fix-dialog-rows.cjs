const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

// Fix Add Tool Dialog tool row: move select outside button.
const dialogToolBlock = `                <button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                    {tool.description && <p className="text-[0.65rem] text-slate-500 truncate">{tool.description}</p>}
                  </div>
                  {enabled && (
                    <select value={draftToolAutonomy[tool.name] || "auto"} onChange={(e) => { e.stopPropagation(); setToolAutonomy(tool.name, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 rounded border bg-background px-1 text-[0.6rem]"
                    >
                      {autonomyOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  )}
                </button>`;

const dialogToolReplacement = `                <div key={tool.name} className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20")}
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

console.log('dialogToolBlock found:', src.includes(dialogToolBlock));
if (!src.includes(dialogToolBlock)) process.exit(1);
src = src.replace(dialogToolBlock, dialogToolReplacement);

// Fix Add Skill Dialog row: button opens but closes with </div>.
const dialogSkillBlock = `                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{skill.displayName || skill.id}</p>
                    {skill.description && <p className="text-[0.65rem] text-slate-500 truncate">{skill.description}</p>}
                  </div>
                </div>`;

const dialogSkillReplacement = `                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                  className={cn("w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{skill.displayName || skill.id}</p>
                    {skill.description && <p className="text-[0.65rem] text-slate-500 truncate">{skill.description}</p>}
                  </div>
                </button>`;

console.log('dialogSkillBlock found:', src.includes(dialogSkillBlock));
if (!src.includes(dialogSkillBlock)) process.exit(1);
src = src.replace(dialogSkillBlock, dialogSkillReplacement);

fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed dialog rows.');
