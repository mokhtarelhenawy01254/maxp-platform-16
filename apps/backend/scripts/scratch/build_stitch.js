const fs = require('fs');
const path = require('path');

const srcPath = 'h:/max_p_new/frontend/src/pages/storefront/ProductDetailsStitchParity.tsx';
const destPath = 'h:/max_p_new/frontend/src/pages/storefront/ProductDetailsStitch.tsx';

let content = fs.readFileSync(srcPath, 'utf8');

// Inject the Variant and Theme Dictionary
const themeDict = `
interface StitchTheme {
  bg: string;
  text: string;
  card: string;
  primaryBg: string;
  primaryText: string;
  border: string;
  accent: string;
}

const THEMES: Record<string, StitchTheme> = {
  parity: {
    bg: 'bg-[#f7f8f5]', text: 'text-[#0f172a]', card: 'bg-white', primaryBg: 'bg-[#6cf20d]', primaryText: 'text-[#172210]', border: 'border-[#d6dfc8]', accent: 'text-[#6cf20d]'
  },
  luxe: {
    bg: 'bg-[#f8f2ea]', text: 'text-[#2c3e50]', card: 'bg-white/80', primaryBg: 'bg-[#cfa45d]', primaryText: 'text-white', border: 'border-[#eaddcd]', accent: 'text-[#cfa45d]'
  },
  elite: {
    bg: 'bg-[#1a1a2e]', text: 'text-slate-100', card: 'bg-[#22213d]', primaryBg: 'bg-[#d4a954]', primaryText: 'text-[#1a1a2e]', border: 'border-[#d4a954]/20', accent: 'text-[#d4a954]'
  },
  'dark-mineral': {
    bg: 'bg-[#121212]', text: 'text-[#e0e0e0]', card: 'bg-[#1e1e1e]', primaryBg: 'bg-[#5c5c5c]', primaryText: 'text-white', border: 'border-[#333]', accent: 'text-[#a0a0a0]'
  },
  monochrome: {
    bg: 'bg-white', text: 'text-black', card: 'bg-gray-50', primaryBg: 'bg-black', primaryText: 'text-white', border: 'border-gray-200', accent: 'text-gray-600'
  },
  modern: {
    bg: 'bg-gray-50', text: 'text-gray-900', card: 'bg-white', primaryBg: 'bg-indigo-600', primaryText: 'text-white', border: 'border-indigo-100', accent: 'text-indigo-600'
  }
};

interface ProductDetailsStitchProps {
  variant?: 'parity' | 'luxe' | 'elite' | 'dark-mineral' | 'monochrome' | 'modern';
}
`;

content = content.replace('const ProductDetailsStitchParity: React.FC = () => {', themeDict + '\nconst ProductDetailsStitch: React.FC<ProductDetailsStitchProps> = ({ variant = "parity" }) => {\n  const theme = THEMES[variant] || THEMES.parity;\n');

// Replace hardcoded "bg-[#f7f8f5]" with "\${theme.bg}"
content = content.replace(/className="min-h-screen bg-\[\#f7f8f5\] text-\[\#0f172a\]"/g, 'className={`min-h-screen ${theme.bg} ${theme.text}`}');
content = content.replace(/className="min-h-screen bg-\[\#f7f8f5\]"/g, 'className={`min-h-screen ${theme.bg}`}');

content = content.replace(/bg-white border-\[\#d6dfc8\]/g, '${theme.card} border ${theme.border}');
content = content.replace(/bg-white border-\[\#d6dfc8\] p-4/g, '${theme.card} border ${theme.border} p-4');

content = content.replace(/bg-\[\#6cf20d\]/g, '${theme.primaryBg}');
content = content.replace(/text-\[\#6cf20d\]/g, '${theme.accent}');
content = content.replace(/text-\[\#172210\]/g, '${theme.primaryText}');
content = content.replace(/border-\[\#d6dfc8\]/g, '${theme.border}');

// Convert simple class strings to template literals where replaced
content = content.replace(/className="([^"]*\$\{theme\..*?}[^"]*)"/g, 'className={`$1`}');

// A catch all for replacing classes in the main view
content = content.replace(/export default ProductDetailsStitchParity;/g, 'export default ProductDetailsStitch;');

fs.writeFileSync(destPath, content);
console.log('Created ' + destPath);
