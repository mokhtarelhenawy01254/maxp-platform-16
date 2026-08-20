const fs = require('fs');
const p = 'h:/max_p_new/backend/controller/storefrontSettingsController.js';
let c = fs.readFileSync(p, 'utf8');
const m = 'return res.status(200).json({';
if (c.includes(m) && !c.includes('settings.storeName')) {
  const i = `
    try {
      const companyInfo = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, description: true, logo: true }
      });
      if (companyInfo) {
        settings.storeName = companyInfo.name;
        settings.storeDescription = companyInfo.description;
        settings.logo = companyInfo.logo;
      }
    } catch (e) { console.warn('MetaError:', e.message); }
  `;
  const idx = c.lastIndexOf(m);
  c = c.slice(0, idx) + i + c.slice(idx);
  fs.writeFileSync(p, c, 'utf8');
  console.log('✅ Injected');
} else {
  console.log('Already done or missing marker');
}
