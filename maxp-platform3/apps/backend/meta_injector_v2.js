const fs = require('fs');
const p = 'h:/max_p_new/backend/controller/storefrontSettingsController.js';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find the line that looks like the return statement in getPublicStorefrontSettings
// We know from grep it's around 1668 (original) or 1680 (new)
let targetIdx = -1;
for (let i = 1300; i < 1750; i++) {
  if (lines[i] && lines[i].includes('return res.status(200).json({')) {
    targetIdx = i;
    break;
  }
}

if (targetIdx !== -1 && !lines.slice(targetIdx - 20, targetIdx).some(l => l.includes('settings.storeName'))) {
  const injection = [
    '    // 🆕 حقن بيانات الشركة الأساسية في الإعدادات للمتجر (لأغراض SEO والـ Head)',
    '    try {',
    '      const companyInfo = await prisma.company.findUnique({',
    '        where: { id: companyId },',
    '        select: { name: true, description: true, logo: true }',
    '      });',
    '      if (companyInfo) {',
    '        settings.storeName = companyInfo.name;',
    '        settings.storeDescription = companyInfo.description;',
    '        settings.logo = companyInfo.logo;',
    '      }',
    '    } catch (e) { console.warn("MetaError:", e.message); }',
    ''
  ];
  lines.splice(targetIdx, 0, ...injection);
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log('✅ Injected at line ' + (targetIdx + 1));
} else {
  console.log('Skipping: Already done or target not found');
}
