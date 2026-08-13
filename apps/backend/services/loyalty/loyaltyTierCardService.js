/**
 * 💎 Loyalty Tier Card Service
 * توليد كارت عضوية فاخر (PNG) لكل عميل يصل لمستوى ولاء،
 * وعرضه في حساب العميل وإرساله تلقائياً عبر WhatsApp عند الترقية.
 *
 * الرندر يتم عبر @napi-rs/canvas (Skia) — يدعم تشكيل العربية (HarfBuzz)
 * والتدرجات والإضاءة، بصفر تبعيات نظام، ويعمل على Windows.
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

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 أدوات الألوان
// ═══════════════════════════════════════════════════════════════════════════════

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
  // t في [0,1] نحو الأسود
  return mixColor(color, '#000000', t);
}

function tint(color, t) {
  // t في [0,1] نحو الأبيض
  return mixColor(color, '#ffffff', t);
}

function luminance(color) {
  return (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
}

function contrastTextColor(color) {
  return luminance(color) > 0.5 ? '#111827' : '#ffffff';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📐 مساعدات الرسم
// ═══════════════════════════════════════════════════════════════════════════════

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
 * شعار المستوى (تاج / ميدالية / جوهرة / كأس / نجمة) مرسوم هندسياً
 * بتدرج من لون المستوى — يبقى مميزاً لكل مستوى.
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
    // كرات فوق القمم
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
    // نجمة داخل
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
    // لمعان أعلى
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.45, cy - s * 0.05);
    ctx.lineTo(cx, cy - s * 0.12);
    ctx.lineTo(cx - s * 0.45, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'trophy') {
    // كأس: قاعدة + جسم مقوس + مقبضان
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
    // مقبضان
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - s * 0.34, cy - s * 0.06, s * 0.16, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 0.34, cy - s * 0.06, s * 0.16, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();
  } else {
    // award / نجمة
    tracePoints(ctx, starPoints(cx, cy, s * 0.5, s * 0.22, 5));
    ctx.fill();
    ctx.stroke();
  }
}

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(String(text || ''));
}

// يضبط حجم الخط ليلائم العرض المتاح (عشان الأسماء الطويلة ما تفيضش)
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
  } catch (e) { /* غير مدعوم — نرسم يميناً عبر textAlign */ }
  const str = String(text);
  // التباعد يُطبَّق فقط على النص غير العربي (أرقام/إنجليزي) — رسم كل حرف لوحده
  // بيكسر اتصال الحروف العربية (تشكيل Skia).
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

// ═══════════════════════════════════════════════════════════════════════════════
// 🗄️ تخزين / بيانات
// ═══════════════════════════════════════════════════════════════════════════════

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
 * رقم عضوية ثابت ومستقر مشتق من معرّف سجل الولاء (مختصر وسهل التذكر).
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
      if (parsed.freeShipping) out.push('شحن مجاني');
      if (Number(parsed.discountPercent) > 0) out.push(`خصم ${parsed.discountPercent}%`);
      if (parsed.customText) out.push(String(parsed.customText));
      return out;
    }
    return [];
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ رسم الكارت
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * يرسم كارت العضوية ويعيد Buffer PNG.
 * @param {Object} data { customer, tier, record, company, points, metricLabel }
 */
function renderTierCard(data) {
  const { createCanvas, GlobalFonts } = requireCanvas();
  if (!GlobalFonts.families.some((f) => f.family === FONT_FAMILY) && fs.existsSync(FONT_REGULAR)) {
    try {
      GlobalFonts.registerFromPath(FONT_REGULAR, FONT_FAMILY);
    } catch (e) {
      console.warn('⚠️ [TIER-CARD] Font registration failed:', e.message);
    }
  }

  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  const tierColor = parseColor(data.tier?.color);
  const main = tierColor;
  const deep = shade(main, 0.55);
  const light = tint(main, 0.22);

  // 1) قاعدة داكنة فاخرة (زي كروت البلاتينيوم) مع مسحة من لون المستوى بالأسفل
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#0b0e13');
  bg.addColorStop(0.55, '#131922');
  bg.addColorStop(1, rgba(shade(main, 0.5), 1));
  ctx.fillStyle = bg;
  roundedRectPath(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.fill();

  // 2) توهج لوني أسفل يمين (عمق + هوية المستوى)
  const glow = ctx.createRadialGradient(CARD_W * 0.9, CARD_H * 1.05, 20, CARD_W * 0.9, CARD_H * 1.05, CARD_W * 0.85);
  glow.addColorStop(0, rgba(main, 0.5));
  glow.addColorStop(0.45, rgba(main, 0.16));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 3) لمعة ناعمة علوية (ضوء)
  const sheen = ctx.createLinearGradient(0, 0, CARD_W, CARD_H * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.09)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 4) لمسة قطرية رفيعة جداً (تلميعة خفيفة غير صارخة)
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.translate(CARD_W * 0.5, CARD_H * 0.5);
  ctx.rotate(-0.22);
  const band = ctx.createLinearGradient(-CARD_W, 0, CARD_W, 0);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,1)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-CARD_W, -CARD_H * 0.75, CARD_W * 0.45, CARD_H * 1.5);
  ctx.restore();

  // 5) حدود داخلية رفيعة
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, 14, 14, CARD_W - 28, CARD_H - 28, 26);
  ctx.stroke();

  const textColor = '#ffffff';
  const muted = 'rgba(255,255,255,0.6)';

  // 6) الترويسة: اسم الشركة يمين + شارة Member Card يسار
  drawFancyText(ctx, data.companyName, CARD_W - PAD, 76, { size: 30, color: textColor, align: 'right' });
  drawFancyText(ctx, 'MEMBER  CARD', PAD, 72, { size: 15, color: muted, align: 'left', letterSpacing: 3 });

  // خط أكسنت صغير بلون المستوى تحت الترويسة
  ctx.fillStyle = rgba(light, 0.9);
  roundedRectPath(ctx, CARD_W - PAD - 64, 96, 64, 4, 2);
  ctx.fill();

  // 7) الشعار + اسم المستوى + اسم العميل
  const emblemR = 122;
  const emblemCx = CARD_W - PAD - 130;
  const emblemCy = 262;

  // هالة
  const halo = ctx.createRadialGradient(emblemCx, emblemCy, 8, emblemCx, emblemCy, emblemR * 1.5);
  halo.addColorStop(0, rgba(light, 0.5));
  halo.addColorStop(0.4, rgba(main, 0.2));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(emblemCx, emblemCy, emblemR * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // دائرة الشعار
  ctx.fillStyle = rgba(shade(main, 0.35), 0.55);
  ctx.beginPath();
  ctx.arc(emblemCx, emblemCy, emblemR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawEmblem(ctx, data.tier?.icon, emblemCx, emblemCy, emblemR * 0.7, main);

  const tierName = data.tier?.nameAr || data.tier?.name || '';
  const customerName = [data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(' ') || 'عميلنا العزيز';
  const tierX = emblemCx - 175;

  drawFancyText(ctx, 'المستوى', tierX, 188, { size: 20, color: rgba(light, 0.95), align: 'right' });
  // ظل خفيف لاسم المستوى (عمق)
  const tierSize = fitFontSize(ctx, tierName, 54, emblemCx - 175 - 120);
  const tierSh = tierSize + 2;
  ctx.save();
  ctx.font = `${tierSh}px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  try { ctx.direction = 'rtl'; } catch (e) { /* ignore */ }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(tierName, tierX + 2, 254);
  ctx.restore();
  drawFancyText(ctx, tierName, tierX, 252, { size: tierSize, color: textColor, align: 'right' });
  const nameSize = fitFontSize(ctx, customerName, 32, emblemCx - 175 - 60);
  drawFancyText(ctx, customerName, tierX, 312, { size: nameSize, color: 'rgba(255,255,255,0.92)', align: 'right' });

  // 8) فاصل ناعم
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 404);
  ctx.lineTo(CARD_W - PAD, 404);
  ctx.stroke();

  // 9) المزايا (chips) — بلون المستوى
  const benefits = parseBenefits(data.tier?.benefits);
  if (benefits.length > 0) {
    ctx.font = `22px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    const chips = benefits.slice(0, 3);
    let chipX = CARD_W - PAD;
    const chipY = 460;
    const chipH = 42;
    for (let i = chips.length - 1; i >= 0; i--) {
      const label = chips[i];
      const w = ctx.measureText(label).width + 34;
      const x = chipX - w;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      roundedRectPath(ctx, x, chipY - chipH / 2, w, chipH, chipH / 2);
      ctx.fill();
      ctx.strokeStyle = rgba(main, 0.6);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      drawFancyText(ctx, label, x + w - 17, chipY, { size: 21, color: 'rgba(255,255,255,0.9)', align: 'right', baseline: 'middle' });
      chipX = x - 12;
    }
  }

  // 10) التذييل: رقم العضوية يمين + الرصيد يسار
  drawFancyText(ctx, 'رقم العضوية', CARD_W - PAD, 526, { size: 16, color: muted, align: 'right' });
  ctx.save();
  ctx.font = `28px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'ltr';
  ctx.fillStyle = textColor;
  ctx.fillText(data.membershipNumber, CARD_W - PAD, 566);
  ctx.restore();

  const pointsLabel = data.metricLabel || 'نقطة';
  const pointsText = `${Number(data.points || 0).toLocaleString('ar-EG')} ${pointsLabel}`;
  drawFancyText(ctx, 'رصيدك', PAD, 526, { size: 16, color: muted, align: 'left' });
  drawFancyText(ctx, pointsText, PAD, 566, { size: 28, color: textColor, align: 'left' });
  drawFancyText(ctx, 'MAXP', PAD, 602, { size: 15, color: muted, align: 'left', letterSpacing: 4 });

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 API الخدمة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * توليد/جلب كارت المستوى للعميل.
 * @param {Object} params { companyId, customerId, programId?, tierId?, force? }
 * @returns {Promise<{ url, filePath, generated, membershipNumber, tierId }>}
 */
async function getOrGenerateTierCard({ companyId, customerId, programId, tierId, force = false }) {
  const prisma = getSharedPrismaClient();

  // 1) تحديد سجل الولاء + المستوى
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
      metricLabel: tier.calculationType === 'SPENT' ? 'ج.م' : tier.calculationType === 'ITEMS' ? 'قطعة' : tier.calculationType === 'ORDER_COUNT' ? 'أوردر' : 'نقطة'
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
 * إرسال صورة كارت العضوية عبر WhatsApp (best-effort).
 * يفضّل جلسة Baileys متصلة (رسايل الصور تعمل دائماً خارج نافذة 24 ساعة).
 */
async function sendTierCardImage({ companyId, customer, filePath, caption }) {
  const phone = formatPhoneNumber(customer?.phone);
  if (!phone) return { success: false, reason: 'no_phone' };
  if (!fs.existsSync(filePath)) return { success: false, reason: 'no_card_file' };

  try {
    const WhatsAppManager = require('../whatsapp/WhatsAppManager');
    const WhatsAppMessageHandler = require('../whatsapp/WhatsAppMessageHandler');

    // 1) جلسة Baileys متصلة في الذاكرة أولاً
    let session = (WhatsAppManager.getCompanySessions(companyId) || []).find(
      (s) => s.status === 'connected' && s.provider !== 'META_CLOUD'
    );

    // 2) من قاعدة البيانات
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
      caption || 'بطاقة عضويتك الجديدة 🎖️'
    );

    return { success: true, result };
  } catch (error) {
    console.error('❌ [TIER-CARD] Failed to send card image:', error.message);
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
