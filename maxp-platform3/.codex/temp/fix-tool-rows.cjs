const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

const readBlock = `                      <button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60",
                        )}
                      >
                        <Switch checked={enabled} className="pointer-events-none shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                          {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                        </div>
                        {enabled && <AutonomySelect toolName={tool.name} />}
                      </button>`;

const readReplacement = `                      <div key={tool.name} className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60")}>
                        <button type="button" onClick={() => toggleTool(tool.name)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Switch checked={enabled} className="pointer-events-none shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs font-semibold truncate", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                            {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                          </div>
                        </button>
                        {enabled && (
                          <div className="px-2">
                            <AutonomySelect toolName={tool.name} />
                          </div>
                        )}
                      </div>`;

console.log('readBlock found:', src.includes(readBlock));
if (!src.includes(readBlock)) process.exit(1);
src = src.replace(readBlock, readReplacement);

const writeBlock = `                      <button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          enabled ? "border-amber-400/40 bg-amber-500/5" : "border-slate-200 dark:border-slate-700 hover:border-amber-400/20 opacity-60",
                        )}
                      >
                        <Switch checked={enabled} className="pointer-events-none shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", enabled ? "text-amber-600 dark:text-amber-400" : "text-slate-500")}>{tool.name}</p>
                          {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                        </div>
                        {enabled && <AutonomySelect toolName={tool.name} />}
                      </button>`;

const writeReplacement = `                      <div key={tool.name} className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "border-amber-400/40 bg-amber-500/5" : "border-slate-200 dark:border-slate-700 hover:border-amber-400/20 opacity-60")}>
                        <button type="button" onClick={() => toggleTool(tool.name)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          <Switch checked={enabled} className="pointer-events-none shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs font-semibold truncate", enabled ? "text-amber-600 dark:text-amber-400" : "text-slate-500")}>{tool.name}</p>
                            {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                          </div>
                        </button>
                        {enabled && (
                          <div className="px-2">
                            <AutonomySelect toolName={tool.name} />
                          </div>
                        )}
                      </div>`;

console.log('writeBlock found:', src.includes(writeBlock));
if (!src.includes(writeBlock)) process.exit(1);
src = src.replace(writeBlock, writeReplacement);

fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed tool rows.');
