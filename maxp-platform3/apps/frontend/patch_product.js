import fs from 'fs';

const file = 'h:/max_p_new/frontend/src/pages/products/ProductNewFinal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace interface
content = content.replace(
  /allowAffiliateMarkup: boolean;\r?\n  mainImage\?: string;\r?\n}/,
  'allowAffiliateMarkup: boolean;\n  mainImage?: string;\n  shortDescription?: string;\n  seoTitle?: string;\n  seoDescription?: string;\n  allowBackorders?: boolean;\n}'
);

content = content.replace(
  /allowAffiliateMarkup: false,\r?\n    mainImage: "",\r?\n  }\);/,
  'allowAffiliateMarkup: false,\n    mainImage: "",\n    shortDescription: "",\n    seoTitle: "",\n    seoDescription: "",\n    allowBackorders: false,\n  });'
);

fs.writeFileSync(file, content);
console.log('Update successful');
