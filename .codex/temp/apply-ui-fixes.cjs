const fs = require('fs');

const file = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
let src = fs.readFileSync(file, 'utf8');

// 1. Add dynamic document.title effect.
const profileLoadEffect = `sandboxApi.getAgentProfile(selectedId)
      .then((data) => {`;
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
if (!src.includes('/* ── Update page title ── */')) {
  src = src.replace(profileLoadEffect, titleEffect + profileLoadEffect);
}

// 2. Replace transition-all conservatively.
// We'll only replace inside className strings that do not also contain transform/shadow/duration.
src = src.replace(/className="([^"]*)transition-all([^"]*)"/g, (match, before, after) => {
  const cls = before + 'transition-all' + after;
  if (/transform|shadow|duration-/.test(cls)) return match;
  return `className="${before}transition-colors${after}"`;
});
src = src.replace(/className=\{\`([^\`]*)transition-all([^\`]*)\`\}/g, (match, before, after) => {
  const cls = before + 'transition-all' + after;
  if (/transform|shadow|duration-/.test(cls)) return match;
  return `className={\`${before}transition-colors${after}\`}`;
});

// 3. Decorative icons: aria-hidden.
src = src.replace(/<Bot className="size-4 text-indigo-600" \/>/g, '<Bot className="size-4 text-indigo-600" aria-hidden="true" />');
src = src.replace(/<Bot className="size-4 text-indigo-500" \/>/g, '<Bot className="size-4 text-indigo-500" aria-hidden="true" />');
src = src.replace(/<Shield className="size-4 text-slate-500" \/>/g, '<Shield className="size-4 text-slate-500" aria-hidden="true" />');
src = src.replace(/<Wrench className="size-4 text-slate-500" \/>/g, '<Wrench className="size-4 text-slate-500" aria-hidden="true" />');
src = src.replace(/<Shield className="size-4" \/>/g, '<Shield className="size-4" aria-hidden="true" />');
src = src.replace(/<FileCode className="size-4" \/>/g, '<FileCode className="size-4" aria-hidden="true" />');
src = src.replace(/<BookOpen className="size-4" \/>/g, '<BookOpen className="size-4" aria-hidden="true" />');
src = src.replace(/<Brain className="size-4" \/>/g, '<Brain className="size-4" aria-hidden="true" />');
src = src.replace(/<Users className="size-4" \/>/g, '<Users className="size-4" aria-hidden="true" />');
src = src.replace(/<Zap className="size-4" \/>/g, '<Zap className="size-4" aria-hidden="true" />');

// 4. aria-label for icon-only add button.
src = src.replace(
  /title=\{t\("agentProfiles\.sidebar\.addTitle"\)\}\n\s*\>\n\s*<Plus className="size-4" \/>/,
  'aria-label={t("agentProfiles.sidebar.addTitle")}\n          title={t("agentProfiles.sidebar.addTitle")}\n          className="flex items-center justify-center size-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500"\n        >\n          <Plus className="size-4" aria-hidden="true" />'
);

// 5. aria-label for delete button.
src = src.replace(
  /title=\{t\("agentProfiles\.header\.deleteTitle"\)\}\n\s*className="flex items-center justify-center size-8 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950\/20 text-slate-400 hover:text-red-600 transition-colors"\n\s*\>\n\s*<Trash2 className="size-3\.5" \/>/,
  'aria-label={t("agentProfiles.header.deleteTitle")}\n          title={t("agentProfiles.header.deleteTitle")}\n          className="flex items-center justify-center size-8 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 transition-colors focus-visible:ring-2 focus-visible:ring-red-500"\n        >\n          <Trash2 className="size-3.5" aria-hidden="true" />'
);

// 6. aria-live for error bar.
src = src.replace(
  /<div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950\/20 border border-red-200 dark:border-red-800 rounded-xl max-w-lg mb-4">/,
  '<div role="alert" aria-live="polite" className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl max-w-lg mb-4">'
);

// 7. aria-label for error close button.
src = src.replace(
  /<button onClick=\{\(\) => setProfileError\(null\)\} className="text-red-500 hover:text-red-700 font-bold">&times;<\/button>/,
  '<button onClick={() => setProfileError(null)} className="text-red-500 hover:text-red-700 font-bold" aria-label={t("agentProfiles.header.discard")}>&times;</button>'
);

// 8. Add focus-visible ring to tabs.
src = src.replace(
  /className=\{\`flex items-center gap-1\.5 lg:gap-2 px-3 lg:px-4 py-3 text-xs lg:text-sm font-medium border-b-2 transition-colors whitespace-nowrap \$\{/g,
  'className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-3 text-xs lg:text-sm font-medium border-b-2 transition-colors whitespace-nowrap rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${'
);

// 9. Add focus-visible to sidebar agent buttons.
src = src.replace(
  /className=\{\`w-full flex items-center gap-2\.5 px-3 py-2\.5 rounded-lg text-left transition-colors \$\{/g,
  'className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${'
);

fs.writeFileSync(file, src, 'utf8');
console.log('Applied UI fixes.');
