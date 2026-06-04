const fs = require('fs');
const path = require('path');

const filePath = 'H:/max_p_new/frontend/src/services/storefrontSettingsService.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update StorefrontSettings interface
content = content.replace(
  /export interface StorefrontSettings \{([\s\S]*?)id: string;([\s\S]*?)companyId: string;/,
  'export interface StorefrontSettings {\n  id: string;\n  companyId: string;\n  storeName?: string;\n  storeDescription?: string;\n  logo?: string;\n  designTokens?: AnyRecord | null;'
);

// 2. Fix readRuntimeDemoWorkspaceDraft lint errors
content = content.replace(
  /if \(isRecord\(parsed.settings\)\) \{\s*return parsed.settings as StorefrontSettings;\s*\}/,
  'if (isRecord(parsed["settings"])) {\n      return parsed["settings"] as unknown as StorefrontSettings;\n    }'
);
content = content.replace(
  /return isRecord\(parsed\) \? \(parsed as StorefrontSettings\) : null;/,
  'return isRecord(parsed) ? (parsed as unknown as StorefrontSettings) : null;'
);

// 3. Fix resolveRuntimeStudioPageId lint errors (assignments, productAssignment, pdpStudio, etc.)
content = content.replace(/designTokens\.storefrontPageAssignments/g, 'designTokens["storefrontPageAssignments"]');
content = content.replace(/assignments\.product/g, 'assignments["product"]');
content = content.replace(/productAssignment\.mode/g, 'productAssignment["mode"]');
content = content.replace(/designTokens\.pdpStudio/g, 'designTokens["pdpStudio"]');
content = content.replace(/pdpStudio\.productDisplayAssignments/g, 'pdpStudio["productDisplayAssignments"]');
content = content.replace(/displayAssignments\.mobileStudioPageId/g, 'displayAssignments["mobileStudioPageId"]');
content = content.replace(/displayAssignments\.desktopStudioPageId/g, 'displayAssignments["desktopStudioPageId"]');
content = content.replace(/productAssignment\.studioPageId/g, 'productAssignment["studioPageId"]');

// 4. Fix applyRuntimeStudioPageOverrides lint errors
content = content.replace(/pdpStudio\.productPages/g, 'pdpStudio["productPages"]');
content = content.replace(/selectedPage\.settingsMode/g, 'selectedPage["settingsMode"]');
content = content.replace(/selectedPage\.settingsOverrides/g, 'selectedPage["settingsOverrides"]');

// 5. Fix mergeRuntimeSettings
content = content.replace(/baseSettings\.designTokens/g, 'baseSettings["designTokens"]');
content = content.replace(/draftSettings\.designTokens/g, 'draftSettings["designTokens"]');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated storefrontSettingsService.ts successfully');
