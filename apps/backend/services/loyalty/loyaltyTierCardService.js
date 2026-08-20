/**
 * ≡ƒÆÄ Loyalty Tier Card Service
 * ╪¬┘ê┘ä┘è╪» ┘â╪º╪▒╪¬ ╪╣╪╢┘ê┘è╪⌐ ┘ü╪º╪«╪▒ (PNG) ┘ä┘â┘ä ╪╣┘à┘è┘ä ┘è╪╡┘ä ┘ä┘à╪│╪¬┘ê┘ë ┘ê┘ä╪º╪í╪î
 * ┘ê╪╣╪▒╪╢┘ç ┘ü┘è ╪¡╪│╪º╪¿ ╪º┘ä╪╣┘à┘è┘ä ┘ê╪Ñ╪▒╪│╪º┘ä┘ç ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣╪¿╪▒ WhatsApp ╪╣┘å╪» ╪º┘ä╪¬╪▒┘é┘è╪⌐.
 *
 * ╪º┘ä╪▒┘å╪»╪▒ ┘è╪¬┘à ╪╣╪¿╪▒ @napi-rs/canvas (Skia) ΓÇö ┘è╪»╪╣┘à ╪¬╪┤┘â┘è┘ä ╪º┘ä╪╣╪▒╪¿┘è╪⌐ (HarfBuzz)
 * ┘ê╪º┘ä╪¬╪»╪▒╪¼╪º╪¬ ┘ê╪º┘ä╪Ñ╪╢╪º╪í╪⌐╪î ╪¿╪╡┘ü╪▒ ╪¬╪¿╪╣┘è╪º╪¬ ┘å╪╕╪º┘à╪î ┘ê┘è╪╣┘à┘ä ╪╣┘ä┘ë Windows.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { getSharedPrismaClient } = require('../sharedDatabase');
const { formatPhoneNumber } = require('../../utils/phoneFormat');

const CARD_W = 1000;
const CARD_H = 630;
const PAD = 56;

const FONT_DIR = path.join(__dirname, '..', '..', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'NotoSansArabic-Regular.ttf');
const FONT_FAMILY = 'NotoArabic';
const CARD_DIR_REL = 'uploads/tier-cards';

function requireCanvas() {
  return require('@napi-rs/canvas');
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒÄ¿ ╪ú╪»┘ê╪º╪¬ ╪º┘ä╪ú┘ä┘ê╪º┘å
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function parseColor(hex, fallback = '#6366f1') {
  let h = String(hex || '').trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    const n = parseInt(h, 16);
    return {
      r: ((n >> 8) & 15) * 17,
      g: ((n >> 4) & 15) * 17,
      b: (n & 15) * 17,
      a: 1
    };
  }
  return parseColor(fallback);
}

function rgba(color, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function mixColor(color, targetHex, t) {
  const target = parseColor(targetHex);
  const r = Math.round(color.r + (target.r - color.r) * t);
  const g = Math.round(color.g + (target.g - color.g) * t);
  const b = Math.round(color.b + (target.b - color.b) * t);
  return { r, g, b, a: 1 };
}

function shade(color, t) {
  // t ┘ü┘è [0,1] ┘å╪¡┘ê ╪º┘ä╪ú╪│┘ê╪»
  return mixColor(color, '#000000', t);
}

function tint(color, t) {
  // t ┘ü┘è [0,1] ┘å╪¡┘ê ╪º┘ä╪ú╪¿┘è╪╢
  return mixColor(color, '#ffffff', t);
}

function luminance(color) {
  return (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
}

function contrastTextColor(color) {
  return luminance(color) > 0.5 ? '#111827' : '#ffffff';
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒôÉ ┘à╪│╪º╪╣╪»╪º╪¬ ╪º┘ä╪▒╪│┘à
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function starPoints(cx, cy, outer, inner, points = 5, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function tracePoints(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/**
 * ╪┤╪╣╪º╪▒ ╪º┘ä┘à╪│╪¬┘ê┘ë (╪¬╪º╪¼ / ┘à┘è╪»╪º┘ä┘è╪⌐ / ╪¼┘ê┘ç╪▒╪⌐ / ┘â╪ú╪│ / ┘å╪¼┘à╪⌐) ┘à╪▒╪│┘ê┘à ┘ç┘å╪»╪│┘è╪º┘ï
 * ╪¿╪¬╪»╪▒╪¼ ┘à┘å ┘ä┘ê┘å ╪º┘ä┘à╪│╪¬┘ê┘ë ΓÇö ┘è╪¿┘é┘ë ┘à┘à┘è╪▓╪º┘ï ┘ä┘â┘ä ┘à╪│╪¬┘ê┘ë.
 */
function drawEmblem(ctx, icon, cx, cy, s, color) {
  const grad = ctx.createLinearGradient(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2);
  grad.addColorStop(0, rgba(tint(color, 0.55), 1));
  grad.addColorStop(0.5, rgba(tint(color, 0.15), 1));
  grad.addColorStop(1, rgba(shade(color, 0.35), 1));
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 3;

  const key = String(icon || 'crown').toLowerCase();

  if (key === 'crown') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy + s * 0.42);
    ctx.lineTo(cx - s * 0.5, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.34, cy - s * 0.32);
    ctx.lineTo(cx - s * 0.16, cy - s * 0.02);
    ctx.lineTo(cx, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.16, cy - s * 0.02);
    ctx.lineTo(cx + s * 0.34, cy - s * 0.32);
    ctx.lineTo(cx + s * 0.5, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.5, cy + s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ┘â╪▒╪º╪¬ ┘ü┘ê┘é ╪º┘ä┘é┘à┘à
    ctx.fillStyle = rgba(tint(color, 0.7), 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    const peaks = [
      [cx - s * 0.34, cy - s * 0.42],
      [cx, cy - s * 0.6],
      [cx + s * 0.34, cy - s * 0.42]
    ];
    for (const [px, py] of peaks) {
      ctx.beginPath();
      ctx.arc(px, py, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (key === 'medal') {
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.08, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy + s * 0.26);
    ctx.lineTo(cx, cy + s * 0.5);
    ctx.lineTo(cx + s * 0.2, cy + s * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ┘å╪¼┘à╪⌐ ╪»╪º╪«┘ä
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    tracePoints(ctx, starPoints(cx, cy - s * 0.08, s * 0.2, s * 0.09, 5));
    ctx.fill();
  } else if (key === 'gem') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.45, cy - s * 0.05);
    ctx.lineTo(cx, cy + s * 0.5);
    ctx.lineTo(cx - s * 0.45, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ┘ä┘à╪╣╪º┘å ╪ú╪╣┘ä┘ë
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.45, cy - s * 0.05);
    ctx.lineTo(cx, cy - s * 0.12);
    ctx.lineTo(cx - s * 0.45, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'trophy') {
    // ┘â╪ú╪│: ┘é╪º╪╣╪»╪⌐ + ╪¼╪│┘à ┘à┘é┘ê╪│ + ┘à┘é╪¿╪╢╪º┘å
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.42, cy + s * 0.18);
    ctx.lineTo(cx + s * 0.42, cy + s * 0.18);
    ctx.lineTo(cx + s * 0.28, cy + s * 0.4);
    ctx.lineTo(cx - s * 0.28, cy + s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.06, s * 0.34, Math.PI, 0);
    ctx.lineTo(cx + s * 0.34, cy + s * 0.22);
    ctx.arc(cx, cy + s * 0.22, s * 0.34, 0, Math.PI, true);
    ctx.lineTo(cx - s * 0.34, cy - s * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ┘à┘é╪¿╪╢╪º┘å
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - s * 0.34, cy - s * 0.06, s * 0.16, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 0.34, cy - s * 0.06, s * 0.16, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();
  } else {
    // award / ┘å╪¼┘à╪⌐
    tracePoints(ctx, starPoints(cx, cy, s * 0.5, s * 0.22, 5));
    ctx.fill();
    ctx.stroke();
  }
}

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(String(text || ''));
}

// ┘è╪╢╪¿╪╖ ╪¡╪¼┘à ╪º┘ä╪«╪╖ ┘ä┘è┘ä╪º╪ª┘à ╪º┘ä╪╣╪▒╪╢ ╪º┘ä┘à╪¬╪º╪¡ (╪╣╪┤╪º┘å ╪º┘ä╪ú╪│┘à╪º╪í ╪º┘ä╪╖┘ê┘è┘ä╪⌐ ┘à╪º ╪¬┘ü┘è╪╢╪┤)
function fitFontSize(ctx, text, baseSize, maxWidth) {
  let size = baseSize;
  ctx.font = `${size}px ${FONT_FAMILY}`;
  while (size > 18 && ctx.measureText(String(text || '')).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${FONT_FAMILY}`;
  }
  return size;
}

function drawFancyText(ctx, text, x, y, opts = {}) {
  const {
    size = 32,
    color = '#ffffff',
    align = 'right',
    baseline = 'alphabetic',
    alpha = 1,
    letterSpacing = 0,
    weight = '400'
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  try {
    ctx.direction = 'rtl';
  } catch (e) { /* ╪║┘è╪▒ ┘à╪»╪╣┘ê┘à ΓÇö ┘å╪▒╪│┘à ┘è┘à┘è┘å╪º┘ï ╪╣╪¿╪▒ textAlign */ }
  const str = String(text);
  // ╪º┘ä╪¬╪¿╪º╪╣╪» ┘è┘Å╪╖╪¿┘Ä┘æ┘é ┘ü┘é╪╖ ╪╣┘ä┘ë ╪º┘ä┘å╪╡ ╪║┘è╪▒ ╪º┘ä╪╣╪▒╪¿┘è (╪ú╪▒┘é╪º┘à/╪Ñ┘å╪¼┘ä┘è╪▓┘è) ΓÇö ╪▒╪│┘à ┘â┘ä ╪¡╪▒┘ü ┘ä┘ê╪¡╪»┘ç
  // ╪¿┘è┘â╪│╪▒ ╪º╪¬╪╡╪º┘ä ╪º┘ä╪¡╪▒┘ê┘ü ╪º┘ä╪╣╪▒╪¿┘è╪⌐ (╪¬╪┤┘â┘è┘ä Skia).
  if (letterSpacing > 0 && !isArabicText(str)) {
    const chars = str.split('');
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * (chars.length - 1);
    let startX = x;
    if (align === 'right') startX = x - total;
    if (align === 'center') startX = x - total / 2;
    chars.forEach((ch, i) => {
      ctx.fillText(ch, startX, y);
      startX += widths[i] + letterSpacing;
    });
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.restore();
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒùä∩╕Å ╪¬╪«╪▓┘è┘å / ╪¿┘è╪º┘å╪º╪¬
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function cardFileName(customerId, tierId) {
  const safeCustomer = String(customerId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeTier = String(tierId).replace(/[^a-zA-Z0-9_-]/g, '');
  return `${safeCustomer}_${safeTier}.png`;
}

function cardPublicPath(companyId, customerId, tierId) {
  return `/${CARD_DIR_REL}/${companyId}/${cardFileName(customerId, tierId)}`;
}

function cardFilePath(companyId, customerId, tierId) {
  return path.join(__dirname, '..', '..', CARD_DIR_REL, String(companyId), cardFileName(customerId, tierId));
}

/**
 * ╪▒┘é┘à ╪╣╪╢┘ê┘è╪⌐ ╪½╪º╪¿╪¬ ┘ê┘à╪│╪¬┘é╪▒ ┘à╪┤╪¬┘é ┘à┘å ┘à╪╣╪▒┘æ┘ü ╪│╪¼┘ä ╪º┘ä┘ê┘ä╪º╪í (┘à╪«╪¬╪╡╪▒ ┘ê╪│┘ç┘ä ╪º┘ä╪¬╪░┘â╪▒).
 */
function membershipNumberFromId(recordId) {
  const hash = crypto.createHash('sha1').update(String(recordId || '')).digest();
  const num = hash.readUInt32BE(0) % 100000000;
  const padded = String(num).padStart(8, '0');
  return `MP-${padded.slice(0, 4)}-${padded.slice(4)}`;
}

function formatArabicDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

function parseBenefits(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.map(String).filter((b) => b.trim() !== '');
    if (parsed && typeof parsed === 'object') {
      const out = [];
      if (parsed.freeShipping) out.push('╪┤╪¡┘å ┘à╪¼╪º┘å┘è');
      if (Number(parsed.discountPercent) > 0) out.push(`╪«╪╡┘à ${parsed.discountPercent}%`);
      if (parsed.customText) out.push(String(parsed.customText));
      return out;
    }
    return [];
  } catch (e) {
    return [];
  }
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒû╝∩╕Å ╪▒╪│┘à ╪º┘ä┘â╪º╪▒╪¬
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * ┘è╪▒╪│┘à ┘â╪º╪▒╪¬ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ┘ê┘è╪╣┘è╪» Buffer PNG.
 * @param {Object} data { customer, tier, record, company, points, metricLabel }
 */
// ╪┤╪▒┘è╪¡╪⌐ EMV (┘à╪½┘ä ┘â╪▒┘ê╪¬ ╪º┘ä╪¿┘å┘ê┘â) ΓÇö ┘ä┘à╪│╪⌐ "┘â╪º╪▒╪¬ ╪¡┘é┘è┘é┘è ┘ü╪«┘à"
function drawChip(ctx, cx, cy, w, h, color) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  const g = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  g.addColorStop(0, rgba(tint(color, 0.55), 1));
  g.addColorStop(0.5, rgba(color, 1));
  g.addColorStop(1, rgba(shade(color, 0.45), 1));
  ctx.fillStyle = g;
  roundedRectPath(ctx, cx - w / 2, cy - h / 2, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, cx - w / 2, cy - h / 2, w, h, 7);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.2, cy - h / 2);
  ctx.lineTo(cx - w * 0.2, cy + h / 2);
  ctx.moveTo(cx + w * 0.2, cy - h / 2);
  ctx.lineTo(cx + w * 0.2, cy + h / 2);
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx + w / 2, cy);
  ctx.stroke();
  ctx.restore();
}

function renderTierCard(data) {
  const { createCanvas, GlobalFonts } = requireCanvas();
  if (!GlobalFonts.families.some((f) => f.family === FONT_FAMILY) && fs.existsSync(FONT_REGULAR)) {
    try {
      GlobalFonts.registerFromPath(FONT_REGULAR, FONT_FAMILY);
    } catch (e) {
      console.warn('ΓÜá∩╕Å [TIER-CARD] Font registration failed:', e.message);
    }
  }

  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  const tierColor = parseColor(data.tier?.color);
  const main = tierColor;
  const deep = shade(main, 0.55);
  const light = tint(main, 0.28);
  const gold = '#d8b45a'; // ┘ä┘à╪│╪⌐ ╪░┘ç╪¿┘è╪⌐ ┘â┘ä╪º╪│┘è┘â┘è╪⌐ ┘ä┘ä╪Ñ╪╖╪º╪▒

  // 1) ┘é╪º╪╣╪»╪⌐ ╪»╪º┘â┘å╪⌐ ╪╣┘à┘è┘é╪⌐ (┘â╪▒┘ê╪¬ ╪¿┘ä╪º╪│╪¬┘è┘å┘ê┘à/╪¿┘ä╪º╪¬┘è┘å┘è╪⌐)
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#0b0d12');
  bg.addColorStop(0.5, '#12161f');
  bg.addColorStop(1, '#171e2b');
  ctx.fillStyle = bg;
  roundedRectPath(ctx, 0, 0, CARD_W, CARD_H, 40);
  ctx.fill();

  // 2) ╪¬┘ê┘ç╪¼ ┘ä┘ê┘å┘è ┘à┘å ┘ä┘ê┘å ╪º┘ä┘à╪│╪¬┘ê┘ë (╪ú╪│┘ü┘ä ┘è┘à┘è┘å + ╪ú╪╣┘ä┘ë ┘è╪│╪º╪▒)
  const glow = ctx.createRadialGradient(CARD_W * 0.92, CARD_H * 1.05, 20, CARD_W * 0.92, CARD_H * 1.05, CARD_W * 0.9);
  glow.addColorStop(0, rgba(main, 0.55));
  glow.addColorStop(0.45, rgba(main, 0.16));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow2 = ctx.createRadialGradient(CARD_W * 0.05, -CARD_H * 0.1, 10, CARD_W * 0.05, -CARD_H * 0.1, CARD_W * 0.55);
  glow2.addColorStop(0, rgba(light, 0.18));
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 3) ┘å╪│┘è╪¼ ╪«╪╖┘ê╪╖ ┘é╪╖╪▒┘è╪⌐ ╪«┘ü┘è┘ü╪⌐ ╪¼╪»╪º┘ï (╪╣┘à┘é ╪«┘ü┘è)
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.translate(CARD_W / 2, CARD_H / 2);
  ctx.rotate(-0.28);
  ctx.fillStyle = '#ffffff';
  for (let i = -60; i <= 60; i += 22) {
    ctx.fillRect(-CARD_W * 1.6, i - 1, CARD_W * 3.2, 2);
  }
  ctx.restore();

  // 4) ┘ä┘à╪╣╪⌐ ┘é╪╖╪▒┘è╪⌐ ┘å╪º╪╣┘à╪⌐ (tone mapping)
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.translate(CARD_W * 0.5, CARD_H * 0.5);
  ctx.rotate(-0.22);
  const band = ctx.createLinearGradient(-CARD_W, 0, CARD_W, 0);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,1)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-CARD_W * 0.2, -CARD_H * 0.9, CARD_W * 0.4, CARD_H * 1.8);
  ctx.restore();

  // 5) ╪Ñ╪╖╪º╪▒ ┘à╪▓╪»┘ê╪¼: ╪«╪º╪▒╪¼┘è ┘å╪º╪╣┘à + ╪»╪º╪«┘ä┘è ╪░┘ç╪¿┘è ╪▒┘ü┘è╪╣ (╪º┘ä┘ü╪«╪º┘à╪⌐)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, 10, 10, CARD_W - 20, CARD_H - 20, 34);
  ctx.stroke();
  ctx.strokeStyle = rgba({ r: 216, g: 180, b: 90 }, 0.55);
  ctx.lineWidth = 1.2;
  roundedRectPath(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 28);
  ctx.stroke();

  const textColor = '#ffffff';
  const muted = 'rgba(255,255,255,0.55)';
  const goldSoft = 'rgba(216,180,90,0.8)';

  // 6) ╪º┘ä╪¬╪▒┘ê┘è╪│╪⌐: ╪º╪│┘à ╪º┘ä╪┤╪▒┘â╪⌐ ┘è┘à┘è┘å + ╪┤╪º╪▒╪⌐ ┘ü╪º╪«╪▒╪⌐ ┘è╪│╪º╪▒
  drawFancyText(ctx, data.companyName, CARD_W - PAD, 74, { size: 29, color: textColor, align: 'right' });
  drawFancyText(ctx, 'MEMBER  CARD', PAD, 70, { size: 14, color: goldSoft, align: 'left', letterSpacing: 4 });

  // ╪«╪╖ ╪░┘ç╪¿┘è ╪¬╪¡╪¬ ╪º┘ä╪¬╪▒┘ê┘è╪│╪⌐ (┘è┘à╪¬╪» ╪¬╪¡╪¬ ╪º╪│┘à ╪º┘ä╪┤╪▒┘â╪⌐)
  ctx.strokeStyle = 'rgba(216,180,90,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CARD_W - PAD - 150, 94);
  ctx.lineTo(CARD_W - PAD, 94);
  ctx.stroke();

  // 7) ╪º┘ä╪┤╪╣╪º╪▒ ┘ü┘è ╪¡┘ä┘é╪⌐ ┘à╪╣╪»┘å┘è╪⌐ + ╪º╪│┘à ╪º┘ä┘à╪│╪¬┘ê┘ë + ╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä
  const emblemR = 118;
  const emblemCx = CARD_W - PAD - 126;
  const emblemCy = 258;

  // ┘ç╪º┘ä╪⌐
  const halo = ctx.createRadialGradient(emblemCx, emblemCy, 8, emblemCx, emblemCy, emblemR * 1.6);
  halo.addColorStop(0, rgba(light, 0.55));
  halo.addColorStop(0.4, rgba(main, 0.2));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(emblemCx, emblemCy, emblemR * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // ╪¡┘ä┘é╪⌐ ┘à╪╣╪»┘å┘è╪⌐ (tier color metallic)
  const ring = ctx.createLinearGradient(emblemCx - emblemR, emblemCy - emblemR, emblemCx + emblemR, emblemCy + emblemR);
  ring.addColorStop(0, rgba(tint(main, 0.6), 1));
  ring.addColorStop(0.45, rgba(main, 1));
  ring.addColorStop(1, rgba(shade(main, 0.5), 1));
  ctx.fillStyle = rgba(shade(main, 0.45), 0.6);
  ctx.beginPath();
  ctx.arc(emblemCx, emblemCy, emblemR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ring;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(emblemCx, emblemCy, emblemR - 5, 0, Math.PI * 2);
  ctx.stroke();

  drawEmblem(ctx, data.tier?.icon, emblemCx, emblemCy, emblemR * 0.66, main);

  const tierName = data.tier?.nameAr || data.tier?.name || '';
  const customerName = [data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(' ') || '╪╣┘à┘è┘ä┘å╪º ╪º┘ä╪╣╪▓┘è╪▓';
  const tierX = emblemCx - 175;

  drawFancyText(ctx, '╪¿╪╖╪º┘é╪⌐ ╪╣╪╢┘ê┘è╪⌐', tierX, 178, { size: 18, color: goldSoft, align: 'right' });
  const tierSize = fitFontSize(ctx, tierName, 58, emblemCx - 175 - 130);
  // ╪╕┘ä ╪«┘ü┘è┘ü ┘ä╪º╪│┘à ╪º┘ä┘à╪│╪¬┘ê┘ë
  ctx.save();
  ctx.font = `${tierSize + 2}px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  try { ctx.direction = 'rtl'; } catch (e) { /* ignore */ }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(tierName, tierX + 2, 254);
  ctx.restore();
  drawFancyText(ctx, tierName, tierX, 252, { size: tierSize, color: textColor, align: 'right' });

  // ╪«╪╖ ╪░┘ç╪¿┘è ╪¬╪¡╪¬ ╪º╪│┘à ╪º┘ä┘à╪│╪¬┘ê┘ë
  ctx.font = `${tierSize}px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  const tierW = ctx.measureText(String(tierName)).width;
  ctx.fillStyle = 'rgba(216,180,90,0.75)';
  roundedRectPath(ctx, tierX - tierW, 268, tierW, 3, 1.5);
  ctx.fill();

  const nameSize = fitFontSize(ctx, customerName, 31, emblemCx - 175 - 60);
  drawFancyText(ctx, customerName, tierX, 318, { size: nameSize, color: 'rgba(255,255,255,0.92)', align: 'right' });

  // 8) ╪«╪¬┘à ┘à╪º╪ª┘è ╪«┘ü┘è┘ü (╪┤╪╣╪º╪▒ ┘â╪¿┘è╪▒ ╪┤┘ü╪º┘ü) ╪ú╪│┘ü┘ä ┘è╪│╪º╪▒
  ctx.save();
  ctx.globalAlpha = 0.05;
  drawEmblem(ctx, data.tier?.icon, 200, 500, 230, main);
  ctx.restore();

  // 9) ┘ü╪º╪╡┘ä ┘å╪º╪╣┘à
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 398);
  ctx.lineTo(CARD_W - PAD, 398);
  ctx.stroke();

  // 10) ╪º┘ä┘à╪▓╪º┘è╪º (chips) ΓÇö ╪¡╪»┘ê╪» ╪░┘ç╪¿┘è╪⌐ ╪▒┘ü┘è╪╣╪⌐
  const benefits = parseBenefits(data.tier?.benefits);
  if (benefits.length > 0) {
    ctx.font = `22px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    const chips = benefits.slice(0, 3);
    let chipX = CARD_W - PAD;
    const chipY = 448;
    const chipH = 40;
    for (let i = chips.length - 1; i >= 0; i--) {
      const label = chips[i];
      const w = ctx.measureText(label).width + 32;
      const x = chipX - w;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundedRectPath(ctx, x, chipY - chipH / 2, w, chipH, chipH / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(216,180,90,0.5)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      drawFancyText(ctx, label, x + w - 16, chipY, { size: 20, color: 'rgba(255,255,255,0.9)', align: 'right', baseline: 'middle' });
      chipX = x - 12;
    }
  }

  // 11) ╪º┘ä╪¬╪░┘è┘è┘ä: ╪▒┘é┘à ╪º┘ä╪╣╪╢┘ê┘è╪⌐ + ╪┤╪▒┘è╪¡╪⌐ EMV ┘è┘à┘è┘å / ╪º┘ä╪▒╪╡┘è╪» ┘è╪│╪º╪▒
  // ╪┤╪▒┘è╪¡╪⌐ ╪╡╪║┘è╪▒╪⌐ (EMV chip) ΓÇö ┘è╪│╪º╪▒ ╪▒┘é┘à ╪º┘ä╪╣╪╢┘ê┘è╪⌐ (╪¿╪╣┘è╪»╪⌐ ╪╣┘å┘ç)
  drawChip(ctx, CARD_W - PAD - 305, 558, 52, 38, main);

  drawFancyText(ctx, '╪▒┘é┘à ╪º┘ä╪╣╪╢┘ê┘è╪⌐', CARD_W - PAD, 514, { size: 15, color: muted, align: 'right' });
  ctx.save();
  ctx.font = `30px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'ltr';
  ctx.fillStyle = textColor;
  ctx.fillText(data.membershipNumber, CARD_W - PAD, 556);
  ctx.restore();

  const pointsLabel = data.metricLabel || '┘å┘é╪╖╪⌐';
  const pointsText = `${Number(data.points || 0).toLocaleString('ar-EG')} ${pointsLabel}`;
  drawFancyText(ctx, '╪▒╪╡┘è╪»┘â', PAD, 514, { size: 15, color: muted, align: 'left' });
  drawFancyText(ctx, pointsText, PAD, 556, { size: 28, color: textColor, align: 'left' });
  drawFancyText(ctx, 'MAXP', PAD, 596, { size: 14, color: goldSoft, align: 'left', letterSpacing: 5 });

  return canvas.toBuffer('image/png');
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒÜÇ API ╪º┘ä╪«╪»┘à╪⌐
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * ╪¬┘ê┘ä┘è╪»/╪¼┘ä╪¿ ┘â╪º╪▒╪¬ ╪º┘ä┘à╪│╪¬┘ê┘ë ┘ä┘ä╪╣┘à┘è┘ä.
 * @param {Object} params { companyId, customerId, programId?, tierId?, force? }
 * @returns {Promise<{ url, filePath, generated, membershipNumber, tierId }>}
 */
async function getOrGenerateTierCard({ companyId, customerId, programId, tierId, force = false }) {
  const prisma = getSharedPrismaClient();

  // 1) ╪¬╪¡╪»┘è╪» ╪│╪¼┘ä ╪º┘ä┘ê┘ä╪º╪í + ╪º┘ä┘à╪│╪¬┘ê┘ë
  let record = null;
  let tier = null;

  if (tierId) {
    tier = await prisma.customerLoyaltyTier.findFirst({
      where: { id: tierId, companyId }
    });
  }

  if (programId) {
    record = await prisma.customerLoyaltyRecord.findFirst({
      where: { customerId, programId, status: 'ACTIVE' }
    });
  }
  if (!record) {
    record = await prisma.customerLoyaltyRecord.findFirst({
      where: { companyId, customerId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    });
  }
  if (!tier && record?.tierId) {
    tier = await prisma.customerLoyaltyTier.findFirst({
      where: { id: record.tierId, companyId }
    });
  }
  if (!tier) {
    return { url: null, filePath: null, generated: false, membershipNumber: null, tierId: null };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { firstName: true, lastName: true, phone: true }
  });
  if (!customer) {
    return { url: null, filePath: null, generated: false, membershipNumber: null, tierId: tier.id };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true }
  });

  const filePath = cardFilePath(companyId, customerId, tier.id);
  const exists = force ? false : fs.existsSync(filePath);

  const membershipNumber = membershipNumberFromId(record?.id || customerId);

  if (!exists) {
    const png = renderTierCard({
      customer,
      tier,
      record,
      companyName: company?.name || 'Store',
      membershipNumber,
      points: record ? parseFloat(record.currentPoints || 0) : 0,
      metricLabel: tier.calculationType === 'SPENT' ? '╪¼.┘à' : tier.calculationType === 'ITEMS' ? '┘é╪╖╪╣╪⌐' : tier.calculationType === 'ORDER_COUNT' ? '╪ú┘ê╪▒╪»╪▒' : '┘å┘é╪╖╪⌐'
    });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, png);
  }

  return {
    url: cardPublicPath(companyId, customerId, tier.id),
    filePath,
    generated: !exists,
    membershipNumber,
    tierId: tier.id,
    tierName: tier.nameAr || tier.name
  };
}

/**
 * ╪Ñ╪▒╪│╪º┘ä ╪╡┘ê╪▒╪⌐ ┘â╪º╪▒╪¬ ╪º┘ä╪╣╪╢┘ê┘è╪⌐ ╪╣╪¿╪▒ WhatsApp (best-effort).
 * ┘è┘ü╪╢┘æ┘ä ╪¼┘ä╪│╪⌐ Baileys ┘à╪¬╪╡┘ä╪⌐ (╪▒╪│╪º┘è┘ä ╪º┘ä╪╡┘ê╪▒ ╪¬╪╣┘à┘ä ╪»╪º╪ª┘à╪º┘ï ╪«╪º╪▒╪¼ ┘å╪º┘ü╪░╪⌐ 24 ╪│╪º╪╣╪⌐).
 */
async function sendTierCardImage({ companyId, customer, filePath, caption }) {
  const phone = formatPhoneNumber(customer?.phone);
  if (!phone) return { success: false, reason: 'no_phone' };
  if (!fs.existsSync(filePath)) return { success: false, reason: 'no_card_file' };

  try {
    const WhatsAppManager = require('../whatsapp/WhatsAppManager');
    const WhatsAppMessageHandler = require('../whatsapp/WhatsAppMessageHandler');

    // 1) ╪¼┘ä╪│╪⌐ Baileys ┘à╪¬╪╡┘ä╪⌐ ┘ü┘è ╪º┘ä╪░╪º┘â╪▒╪⌐ ╪ú┘ê┘ä╪º┘ï
    let session = (WhatsAppManager.getCompanySessions(companyId) || []).find(
      (s) => s.status === 'connected' && s.provider !== 'META_CLOUD'
    );

    // 2) ┘à┘å ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬
    if (!session) {
      const prisma = getSharedPrismaClient();
      const dbSession = await prisma.whatsAppSession.findFirst({
        where: { companyId, status: 'CONNECTED', provider: { not: 'META_CLOUD' } },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      });
      const inMemory = dbSession ? WhatsAppManager.getSession(dbSession.id) : null;
      if (dbSession && inMemory && inMemory.status === 'connected') {
        session = inMemory;
      }
    }

    if (!session) {
      return { success: false, reason: 'no_baileys_session' };
    }

    const result = await WhatsAppMessageHandler.sendImage(
      session.id || session.sessionId,
      phone,
      { filePath, mimetype: 'image/png' },
      caption || '╪¿╪╖╪º┘é╪⌐ ╪╣╪╢┘ê┘è╪¬┘â ╪º┘ä╪¼╪»┘è╪»╪⌐ ≡ƒÄû∩╕Å'
    );

    return { success: true, result };
  } catch (error) {
    console.error('Γ¥î [TIER-CARD] Failed to send card image:', error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

module.exports = {
  getOrGenerateTierCard,
  sendTierCardImage,
  membershipNumberFromId,
  renderTierCard,
  cardPublicPath,
  CARD_W,
  CARD_H
};
