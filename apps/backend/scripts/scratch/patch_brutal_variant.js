const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../frontend/src/utils/storefrontTemplateVariant.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add 'brutal' to StorefrontRuntimeVariant type
content = content.replace(
  '  | "creative";',
  '  | "creative"\r\n  | "brutal";'
);

// 2. Allow 'brutal' in resolveRuntimeVariant
content = content.replace(
  'variant === "creative" ||\r\n      variant === "default"',
  'variant === "creative" ||\r\n      variant === "brutal" ||\r\n      variant === "default"'
);

// Also handle LF-only version just in case
content = content.replace(
  'variant === "creative" ||\n      variant === "default"',
  'variant === "creative" ||\n      variant === "brutal" ||\n      variant === "default"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched storefrontTemplateVariant.ts successfully!');
