const fs = require('fs');
const path = require('path');

const fileConfigs = [
  {
    relPath: 'apps/frontend/src/pages/settings/OrderInvoiceSettings.tsx',
    ns: 'orderInvoiceSettings',
    componentSignature: 'const OrderInvoiceSettings: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded = false }) => {'
  },
  {
    relPath: 'apps/frontend/src/pages/admin/OrderInvoices.tsx',
    ns: 'orderInvoices',
    componentSignature: 'const OrderInvoices: React.FC = () => {'
  },
  {
    relPath: 'apps/frontend/src/pages/pos/PosPage.tsx',
    ns: 'pos',
    componentSignature: 'const PosPage = () => {'
  },
  {
    relPath: 'apps/frontend/src/pages/orders/PreparationQueue.tsx',
    ns: 'preparation',
    componentSignature: 'const PreparationQueue: React.FC = () => {'
  },
  {
    relPath: 'apps/frontend/src/pages/admin/ManualOrder/ManualOrderPage.tsx',
    ns: 'manualOrder',
    componentSignature: 'const ManualOrderPage = () => {'
  },
  {
    relPath: 'apps/frontend/src/pages/admin/ManualOrder/components/CartColumn.tsx',
    ns: 'manualOrder',
    componentSignature: null
  },
  {
    relPath: 'apps/frontend/src/pages/admin/ManualOrder/components/ProductSearchColumn.tsx',
    ns: 'manualOrder',
    componentSignature: null
  },
  {
    relPath: 'apps/frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx',
    ns: 'manualOrder',
    componentSignature: null
  }
];

const projectRoot = path.join(__dirname, '..');
const localesDir = path.join(projectRoot, 'apps/frontend/src/locales');

// Load or initialize section translation files
const arSections = {};
const enSections = {};

function getSection(lang, ns) {
  const filePath = path.join(localesDir, lang, 'sections', `${ns}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveSection(lang, ns, data) {
  const dirPath = path.join(localesDir, lang, 'sections');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, `${ns}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Generate key slug based on Arabic value or sequential index
function getTranslationKey(ns, text, existingData) {
  for (const [k, val] of Object.entries(existingData)) {
    if (val === text) return k;
  }
  
  let index = 1;
  while (existingData[`k_${index}`] !== undefined) {
    index++;
  }
  const key = `k_${index}`;
  existingData[key] = text;
  return key;
}

fileConfigs.forEach(config => {
  const filePath = path.join(projectRoot, config.relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${config.relPath}`);
    return;
  }

  console.log(`Processing: ${config.relPath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Clear existing auto-generated keys from our previous run in these specific files' namespaces 
  // so we don't leak the broken keys.
  arSections[config.ns] = {};
  enSections[config.ns] = {};

  const arData = arSections[config.ns];
  const enData = enSections[config.ns];

  const registerTranslation = (text) => {
    const key = getTranslationKey(config.ns, text, arData);
    if (!enData[key]) {
      enData[key] = `__TODO_TRANSLATE__:${text}`;
    }
    return key;
  };

  // 1. Replace attributes, e.g. placeholder="العربية" -> placeholder={t('ns.key')}
  const attrDoubleRegex = /=(\s*)"([^"'{}\n\r]*[\u0600-\u06FF][^"'{}\n\r]*)"/g;
  content = content.replace(attrDoubleRegex, (match, space, text) => {
    const key = registerTranslation(text.trim());
    return `={t('${config.ns}.${key}')}`;
  });

  const attrSingleRegex = /=(\s*)'([^"'{}\n\r]*[\u0600-\u06FF][^"'{}\n\r]*)'/g;
  content = content.replace(attrSingleRegex, (match, space, text) => {
    const key = registerTranslation(text.trim());
    return `={t('${config.ns}.${key}')}`;
  });

  // 2. Replace JSX text nodes, e.g. >العربية< -> >{t('ns.key')}<
  // We exclude { and } to prevent matching javascript expressions inside JSX
  const jsxRegex = />([^<>{}\n\r]*[\u0600-\u06FF][^<>{}\n\r]*)</g;
  content = content.replace(jsxRegex, (match, text) => {
    const trimmed = text.trim();
    const key = registerTranslation(trimmed);
    return `>${text.replace(trimmed, `{t('${config.ns}.${key}')}`)}<`;
  });

  // 3. Replace general quotes in JS/TS code, e.g. "العربية" -> t('ns.key')
  const generalDoubleRegex = /"([^"'{}\n\r]*[\u0600-\u06FF][^"'{}\n\r]*)"/g;
  content = content.replace(generalDoubleRegex, (match, text) => {
    if (text.startsWith('t(') || text.includes('{t(')) return match;
    const key = registerTranslation(text.trim());
    return `t('${config.ns}.${key}')`;
  });

  const generalSingleRegex = /'([^"'{}\n\r]*[\u0600-\u06FF][^"'{}\n\r]*)'/g;
  content = content.replace(generalSingleRegex, (match, text) => {
    if (text.startsWith('t(') || text.includes('{t(')) return match;
    const key = registerTranslation(text.trim());
    return `t('${config.ns}.${key}')`;
  });

  // If componentSignature is defined, add useTranslation and import
  if (config.componentSignature && content !== originalContent) {
    if (!content.includes('useTranslation') && !content.includes('react-i18next')) {
      const importRegex = /import React/g;
      if (content.match(importRegex)) {
        content = content.replace('import React', 'import { useTranslation } from "react-i18next";\nimport React');
      } else {
        content = 'import { useTranslation } from "react-i18next";\n' + content;
      }
    }

    if (!content.includes('const { t } = useTranslation()') && !content.includes('const { t } = useTranslation(')) {
      content = content.replace(config.componentSignature, `${config.componentSignature}\n  const { t } = useTranslation();`);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated code file: ${config.relPath}`);
  } else {
    console.log(`No changes needed for: ${config.relPath}`);
  }
});

// Save all updated sections
for (const ns of Object.keys(arSections)) {
  saveSection('ar', ns, arSections[ns]);
  saveSection('en', ns, enSections[ns]);
}
console.log('Done!');
