const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r+/g, '');

const brokenSkillBlock = `                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold text-sm", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>
                      {skill.displayName || skill.id}
                    </p>
                    {skill.description && <p className="text-xs text-slate-500 mt-0.5">{skill.description}</p>}
                    {skill.allowedTools && skill.allowedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {skill.allowedTools.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[0.6rem] h-4 px-1.5">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>`;

const fixedSkillBlock = `                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-left",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold text-sm", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>
                      {skill.displayName || skill.id}
                    </p>
                    {skill.description && <p className="text-xs text-slate-500 mt-0.5">{skill.description}</p>}
                    {skill.allowedTools && skill.allowedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {skill.allowedTools.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[0.6rem] h-4 px-1.5">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </button>`;

console.log('found:', src.includes(brokenSkillBlock));
if (!src.includes(brokenSkillBlock)) process.exit(1);
src = src.replace(brokenSkillBlock, fixedSkillBlock);

fs.writeFileSync(file, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed skill row.');
