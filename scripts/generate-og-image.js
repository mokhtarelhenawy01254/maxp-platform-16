const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#080d11"/>
  <defs>
    <radialGradient id="bg-glow" cx="20%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#0d9488" stop-opacity="0.30"/>
      <stop offset="50%" stop-color="#0284c7" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#080d11" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="card-glow" cx="80%" cy="80%" r="60%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#080d11" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(45, 212, 191, 0.5)"/>
      <stop offset="100%" stop-color="rgba(56, 189, 248, 0.15)"/>
    </linearGradient>
  </defs>

  <!-- Background Layer -->
  <rect width="1200" height="630" fill="url(#bg-glow)"/>
  <rect width="1200" height="630" fill="url(#card-glow)"/>

  <!-- Top Brand Tag -->
  <rect x="80" y="70" width="160" height="38" rx="19" fill="rgba(13, 148, 136, 0.2)" stroke="rgba(45, 212, 191, 0.4)"/>
  <circle cx="102" cy="89" r="6" fill="#2dd4bf"/>
  <text x="118" y="95" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#2dd4bf">MAXP PLATFORM</text>

  <!-- Main Headline (Arabic) -->
  <text x="80" y="180" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="900" fill="#ffffff">منصة إدارة التواصل والتجارة الإلكترونية</text>
  
  <text x="80" y="245" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#94a3b8">منصة متكاملة لإدارة المحادثات، الذكاء الاصطناعي، والمتاجر الرقمية</text>

  <!-- Key Capability Badges -->
  <g transform="translate(80, 290)">
    <!-- Badge 1 -->
    <rect x="0" y="0" width="220" height="48" rx="14" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(45, 212, 191, 0.3)"/>
    <text x="20" y="30" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#38bdf8">⚡ AI Agents &amp; Automation</text>

    <!-- Badge 2 -->
    <rect x="235" y="0" width="220" height="48" rx="14" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(45, 212, 191, 0.3)"/>
    <text x="255" y="30" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#2dd4bf">💬 Unified Inbox</text>

    <!-- Badge 3 -->
    <rect x="470" y="0" width="220" height="48" rx="14" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(45, 212, 191, 0.3)"/>
    <text x="490" y="30" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#a855f7">🛍️ E-Commerce Stores</text>
  </g>

  <!-- Illustration Glass Card Container (Right Side) -->
  <g transform="translate(800, 70)">
    <rect x="0" y="0" width="320" height="485" rx="24" fill="rgba(15, 23, 42, 0.85)" stroke="url(#border-grad)" stroke-width="1.5"/>
    
    <!-- Mini UI Card Top Header -->
    <rect x="25" y="30" width="270" height="65" rx="14" fill="rgba(30, 41, 59, 0.8)"/>
    <circle cx="60" cy="62.5" r="18" fill="url(#brand-grad)"/>
    <rect x="95" y="52" width="130" height="9" rx="4.5" fill="#e2e8f0"/>
    <rect x="95" y="68" width="90" height="7" rx="3.5" fill="#64748b"/>

    <!-- Chat Bubbles Simulation -->
    <rect x="25" y="115" width="220" height="60" rx="14" fill="rgba(13, 148, 136, 0.25)" stroke="rgba(45, 212, 191, 0.3)"/>
    <rect x="42" y="134" width="150" height="8" rx="4" fill="#2dd4bf"/>
    <rect x="42" y="150" width="110" height="7" rx="3.5" fill="#94a3b8"/>

    <rect x="75" y="190" width="220" height="60" rx="14" fill="rgba(56, 189, 248, 0.25)" stroke="rgba(56, 189, 248, 0.3)"/>
    <rect x="92" y="209" width="160" height="8" rx="4" fill="#38bdf8"/>
    <rect x="92" y="225" width="100" height="7" rx="3.5" fill="#94a3b8"/>

    <!-- Metrics Card -->
    <rect x="25" y="268" width="270" height="190" rx="18" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(51, 65, 85, 0.8)"/>
    <text x="45" y="303" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#94a3b8">Live Platform Metrics</text>
    <text x="45" y="348" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="#2dd4bf">99.9%</text>
    <text x="45" y="375" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#cbd5e1">AI Customer Resolution &amp; Uptime</text>
    
    <!-- Status Bar -->
    <rect x="45" y="398" width="230" height="38" rx="12" fill="rgba(45, 212, 191, 0.12)"/>
    <circle cx="65" cy="417" r="5" fill="#2dd4bf"/>
    <text x="80" y="422" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#2dd4bf">System Active · maxp.online</text>
  </g>

  <!-- Bottom Platform Domain Badge -->
  <g transform="translate(80, 505)">
    <rect x="0" y="0" width="380" height="50" rx="25" fill="url(#brand-grad)"/>
    <text x="190" y="32" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="900" fill="#080d11" text-anchor="middle">https://maxp.online</text>
  </g>

</svg>`;

const svgPath = path.resolve(__dirname, "../apps/frontend/public/og-cover.svg");
const pngPath = path.resolve(__dirname, "../apps/frontend/public/og-cover.png");

fs.writeFileSync(svgPath, svg);
console.log("Saved SVG:", svgPath);

sharp(Buffer.from(svg))
  .png({ quality: 100 })
  .toFile(pngPath)
  .then(() => console.log("Successfully generated og-cover.png at:", pngPath))
  .catch((err) => console.error("Sharp error:", err));
