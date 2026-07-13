const sharp = require('sharp');
const path = require('path');

const svg = `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="1200" height="1200" fill="none"/>
  <path d="M0,0 L400,0 L0,400 Z" fill="#dc2626" opacity="0.95"/>
  <text x="45" y="155" fill="#fbbf24" font-size="60" font-weight="bold" font-family="Arial" transform="rotate(-45,70,100)">50%</text>
  <text x="30" y="205" fill="white" font-size="30" font-weight="bold" font-family="Arial" transform="rotate(-45,70,100)" textLength="80" lengthAdjust="spacing">OFF</text>
  <rect x="0" y="1080" width="1200" height="120" fill="#dc2626" opacity="0.92"/>
  <text x="600" y="1150" fill="white" font-size="30" font-weight="bold" font-family="Arial" text-anchor="middle">&#x639;&#x631;&#x636; &#x62E;&#x627;&#x635; - &#x644;&#x641;&#x62A;&#x631;&#x629; &#x645;&#x62D;&#x62F;&#x648;&#x62F;&#x629;</text>
  <rect x="0" y="0" width="1200" height="1200" fill="none" stroke="#dc2626" stroke-width="6"/>
</svg>`;

sharp(Buffer.from(svg))
  .resize(1200, 1200)
  .png()
  .toFile(path.join(__dirname, '..', '..', 'overlay-frame.png'))
  .then(() => console.log('OK'))
  .catch(e => console.error(e.message));
