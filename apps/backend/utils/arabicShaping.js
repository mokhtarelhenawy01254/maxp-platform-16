// Complete Arabic Text Shaper & Bidirectional Engine for PDFKit
// Handles contextual forms (iso, ini, med, fin), Lam-Alef ligatures,
// and RTL reordering while keeping LTR text, numbers, and dates intact.

const ARABIC_LETTERS = {
  '\u0621': { iso: '\uFE80' }, // Hamza
  '\u0622': { iso: '\uFE81', fin: '\uFE82' }, // Alef with Madda
  '\u0623': { iso: '\uFE83', fin: '\uFE84' }, // Alef with Hamza Above
  '\u0624': { iso: '\uFE85', fin: '\uFE86' }, // Waw with Hamza
  '\u0625': { iso: '\uFE87', fin: '\uFE88' }, // Alef with Hamza Below
  '\u0626': { iso: '\uFE89', ini: '\uFE8B', med: '\uFE8C', fin: '\uFE8A' }, // Yeh with Hamza
  '\u0627': { iso: '\uFE8D', fin: '\uFE8E' }, // Alef
  '\u0628': { iso: '\uFE8F', ini: '\uFE91', med: '\uFE92', fin: '\uFE90' }, // Beh
  '\u0629': { iso: '\uFE93', fin: '\uFE94' }, // Teh Marbuta
  '\u062A': { iso: '\uFE95', ini: '\uFE97', med: '\uFE98', fin: '\uFE96' }, // Teh
  '\u062B': { iso: '\uFE99', ini: '\uFE9B', med: '\uFE9C', fin: '\uFE9A' }, // Theh
  '\u062C': { iso: '\uFE9D', ini: '\uFE9F', med: '\uFEA0', fin: '\uFE9E' }, // Jeem
  '\u062D': { iso: '\uFEA1', ini: '\uFEA3', med: '\uFEA4', fin: '\uFEA2' }, // Hah
  '\u062E': { iso: '\uFEA5', ini: '\uFEA7', med: '\uFEA8', fin: '\uFEA6' }, // Khah
  '\u062F': { iso: '\uFEA9', fin: '\uFEAA' }, // Dal
  '\u0630': { iso: '\uFEAB', fin: '\uFEAC' }, // Thal
  '\u0631': { iso: '\uFEAD', fin: '\uFEAE' }, // Reh
  '\u0632': { iso: '\uFEAF', fin: '\uFEB0' }, // Zain
  '\u0633': { iso: '\uFEB1', ini: '\uFEB3', med: '\uFEB4', fin: '\uFEB2' }, // Seen
  '\u0634': { iso: '\uFEB5', ini: '\uFEB7', med: '\uFEB8', fin: '\uFEB6' }, // Sheen
  '\u0635': { iso: '\uFEB9', ini: '\uFEBB', med: '\uFEBC', fin: '\uFEBA' }, // Sad
  '\u0636': { iso: '\uFEBD', ini: '\uFEBF', med: '\uFEC0', fin: '\uFEBE' }, // Dad
  '\u0637': { iso: '\uFEC1', ini: '\uFEC3', med: '\uFEC4', fin: '\uFEC2' }, // Tah
  '\u0638': { iso: '\uFEC5', ini: '\uFEC7', med: '\uFEC8', fin: '\uFEC6' }, // Zah
  '\u0639': { iso: '\uFEC9', ini: '\uFECB', med: '\uFECC', fin: '\uFECA' }, // Ain
  '\u063A': { iso: '\uFECD', ini: '\uFECF', med: '\uFED0', fin: '\uFECE' }, // Ghain
  '\u0641': { iso: '\uFED1', ini: '\uFED3', med: '\uFED4', fin: '\uFED2' }, // Feh
  '\u0642': { iso: '\uFED5', ini: '\uFED7', med: '\uFED8', fin: '\uFED6' }, // Qaf
  '\u0643': { iso: '\uFED9', ini: '\uFEDB', med: '\uFEDC', fin: '\uFEDA' }, // Kaf
  '\u0644': { iso: '\uFEDD', ini: '\uFEDF', med: '\uFEE0', fin: '\uFEDE' }, // Lam
  '\u0645': { iso: '\uFEE1', ini: '\uFEE3', med: '\uFEE4', fin: '\uFEE2' }, // Meem
  '\u0646': { iso: '\uFEE5', ini: '\uFEE7', med: '\uFEE8', fin: '\uFEE6' }, // Noon
  '\u0647': { iso: '\uFEE9', ini: '\uFEEB', med: '\uFEEC', fin: '\uFEEA' }, // Heh
  '\u0648': { iso: '\uFEED', fin: '\uFEEE' }, // Waw
  '\u0649': { iso: '\uFEEF', fin: '\uFEF0' }, // Alef Maksura
  '\u064A': { iso: '\uFEF1', ini: '\uFEF3', med: '\uFEF4', fin: '\uFEF2' }, // Yeh
  '\u0640': { iso: '\u0640', ini: '\u0640', med: '\u0640', fin: '\u0640' }, // Tatweel
};

// Letters that connect to the next letter (dual-joining)
const CONNECTS_AFTER = new Set(
  Object.keys(ARABIC_LETTERS).filter((c) => ARABIC_LETTERS[c].ini !== undefined)
);

// Letters that can receive connection from previous letter
const CONNECTS_BEFORE = new Set(
  Object.keys(ARABIC_LETTERS).filter((c) => ARABIC_LETTERS[c].fin !== undefined)
);

// Lam-Alef Ligatures (mandatory in Arabic typography)
const LAM_ALEF = {
  '\u0622': { iso: '\uFEF5', fin: '\uFEF6' }, // Lam + Alef with Madda
  '\u0623': { iso: '\uFEF7', fin: '\uFEF8' }, // Lam + Alef with Hamza Above
  '\u0625': { iso: '\uFEF9', fin: '\uFEFA' }, // Lam + Alef with Hamza Below
  '\u0627': { iso: '\uFEFB', fin: '\uFEFC' }, // Lam + Alef
};

function isArabicChar(ch) {
  if (!ch) return false;
  return (
    (ch >= '\u0600' && ch <= '\u06FF') ||
    (ch >= '\uFB50' && ch <= '\uFDFF') ||
    (ch >= '\uFE70' && ch <= '\uFEFF')
  );
}

function hasArabic(text) {
  if (!text) return false;
  for (const ch of String(text)) {
    if (isArabicChar(ch)) return true;
  }
  return false;
}

function shapeArabicText(text) {
  if (!text) return '';
  const str = String(text);

  // Step 1: Detect Lam-Alef ligatures
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = str[i + 1];

    if (ch === '\u0644' && next && LAM_ALEF[next]) {
      const prev = chars[chars.length - 1];
      const connectsBefore = prev && prev.connectsAfter;
      const ligature = LAM_ALEF[next];
      const glyph = connectsBefore ? ligature.fin : ligature.iso;
      chars.push({ glyph, isArabic: true, connectsBefore: !!connectsBefore, connectsAfter: false });
      i++; // Skip next alef character
      continue;
    }

    if (ARABIC_LETTERS[ch]) {
      chars.push({ orig: ch, isArabic: true });
    } else {
      chars.push({ glyph: ch, isArabic: isArabicChar(ch) });
    }
  }

  // Step 2: Contextual shaping for all Arabic letters
  for (let i = 0; i < chars.length; i++) {
    const item = chars[i];
    if (!item.orig) continue;

    const letter = ARABIC_LETTERS[item.orig];
    const prev = chars[i - 1];
    const next = chars[i + 1];

    const prevConnects = prev && prev.isArabic && (
      prev.orig ? CONNECTS_AFTER.has(prev.orig) : prev.connectsAfter
    );
    const nextConnects = next && next.isArabic && (
      next.orig ? CONNECTS_BEFORE.has(next.orig) : next.connectsBefore
    );

    let form = 'iso';
    if (prevConnects && nextConnects && letter.med) form = 'med';
    else if (prevConnects && letter.fin) form = 'fin';
    else if (nextConnects && letter.ini) form = 'ini';

    item.glyph = letter[form] || letter.iso || item.orig;
    item.connectsBefore = CONNECTS_BEFORE.has(item.orig);
    item.connectsAfter = CONNECTS_AFTER.has(item.orig);
  }

  return chars.map((c) => c.glyph);
}

/**
 * Shape Arabic text and reorder segments for LTR PDFKit rendering.
 * Arabic characters are reversed to print correctly from right to left,
 * while numbers and English tokens remain in their natural LTR sequence.
 */
function shapeArabic(text) {
  if (!text) return '';
  const str = String(text);
  if (!hasArabic(str)) return str;

  const shapedGlyphs = shapeArabicText(str);

  // Group into contiguous RTL (Arabic) vs LTR (Latin/Numbers/Symbols) runs
  const runs = [];
  let currentRun = [];
  let currentType = null; // 'rtl' | 'ltr'

  for (const glyph of shapedGlyphs) {
    const isArab = isArabicChar(glyph);
    const type = isArab ? 'rtl' : 'ltr';

    if (currentType === null) {
      currentType = type;
      currentRun.push(glyph);
    } else if (type === currentType) {
      currentRun.push(glyph);
    } else {
      runs.push({ type: currentType, text: currentRun });
      currentRun = [glyph];
      currentType = type;
    }
  }
  if (currentRun.length > 0) {
    runs.push({ type: currentType, text: currentRun });
  }

  // Reverse runs for overall RTL layout, and reverse characters inside RTL runs
  const result = [];
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    if (run.type === 'rtl') {
      for (let j = run.text.length - 1; j >= 0; j--) {
        result.push(run.text[j]);
      }
    } else {
      for (let j = 0; j < run.text.length; j++) {
        result.push(run.text[j]);
      }
    }
  }

  return result.join('');
}

module.exports = { shapeArabic, hasArabic };
