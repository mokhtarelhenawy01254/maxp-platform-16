const sharp = require('sharp');
const path = require('path');

const line1 = '\u0627\u0634\u062A\u0631 \u0648\u0627\u062D\u062F \u0648\u062E\u062F \u0627\u0644\u062B\u0627\u0646\u064A \u0628\u0646\u0635 \u0627\u0644\u0633\u0639\u0631';
const line2 = '\u0627\u0634\u062A\u0631 \u0627\u062A\u0646\u064A\u0646 \u0648\u062E\u062F \u0627\u0644\u062B\u0627\u0644\u062B\u0629 \u0645\u062C\u0627\u0646\u0627\u064B';
const line3 = '\u0644\u0641\u062A\u0631\u0629 \u0645\u062D\u062F\u0648\u062F\u0629 - \u0627\u0633\u062A\u0641\u0632 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0622\u0646';

const svg = `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e11d48"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="1180" height="1180" rx="16" fill="none" stroke="#e11d48" stroke-width="6"/>
  <rect x="10" y="10" width="1180" height="190" rx="16" fill="url(#g1)"/>
  <rect x="10" y="170" width="1180" height="30" fill="url(#g1)"/>
  <text x="600" y="85" fill="#fbbf24" font-size="32" text-anchor="middle" font-family="Arial">&#x2B50; &#x639;&#x631;&#x636; &#x62E;&#x627;&#x635; &#x2B50;</text>
  <text x="600" y="140" fill="white" font-size="38" font-weight="bold" text-anchor="middle" font-family="Arial">${line1}</text>
  <rect x="10" y="990" width="1180" height="200" rx="16" fill="url(#g2)"/>
  <text x="600" y="1055" fill="#881337" font-size="36" font-weight="bold" text-anchor="middle" font-family="Arial">${line2}</text>
  <text x="600" y="1115" fill="#881337" font-size="26" font-weight="bold" text-anchor="middle" font-family="Arial">${line3}</text>
  <circle cx="100" cy="600" r="50" fill="none" stroke="#e11d48" stroke-width="3" opacity="0.3"/>
  <circle cx="1100" cy="600" r="50" fill="none" stroke="#e11d48" stroke-width="3" opacity="0.3"/>
</svg>`;

sharp(Buffer.from(svg))
  .resize(1200, 1200)
  .png()
  .toFile(path.join(__dirname, '..', '..', 'offer-overlay.png'))
  .then(() => console.log('Done'))
  .catch(e => console.error(e.message));
