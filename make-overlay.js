const sharp = require('sharp');

const svg = `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
  </defs>
  <path d="M0,0 L360,0 L0,360 Z" fill="url(#g)" opacity="0.95"/>
  <text x="40" y="140" fill="#fbbf24" font-size="52" font-weight="bold" font-family="Arial" transform="rotate(-45,70,100)">50%</text>
  <text x="25" y="180" fill="white" font-size="28" font-weight="bold" font-family="Arial" transform="rotate(-45,70,100)">خصم</text>
  <rect x="0" y="1090" width="1200" height="110" fill="#dc2626" opacity="0.92"/>
  <text x="600" y="1155" fill="white" font-size="34" font-weight="bold" font-family="Arial" text-anchor="middle">🔥 عرض خاص - لفترة محدودة 🔥</text>
  <rect x="0" y="0" width="1200" height="1200" fill="none" stroke="#dc2626" stroke-width="8" rx="0"/>
</svg>`;

sharp(Buffer.from(svg)).resize(1200, 1200).png().toFile('overlay-frame.png')
  .then(() => console.log('Created overlay-frame.png'))
  .catch(e => console.error(e));
