// Minimal Arabic text shaper for pdfkit (presentation forms + bidi reverse).
// Maps Arabic letters to their contextual (initial/medial/final/isolated) forms.

const ARABIC_LETTERS = {
  '\u0621': { iso: '\uFE80' }, // hamza
  '\u0622': { iso: '\uFE81', fin: '\uFE82' }, // alef madda
  '\u0623': { iso: '\uFE83', fin: '\uFE84' }, // alef hamza above
  '\u0624': { iso: '\uFE85', fin: '\uFE86' }, // waw hamza
  '\u0625': { iso: '\uFE87', fin: '\uFE88' }, // alef hamza below
  '\u0626': { iso: '\uFE89', ini: '\uFE8B', med: '\uFE8C', fin: '\uFE8A' }, // yeh hamza
  '\u0627': { iso: '\uFE8D', fin: '\uFE8E' }, // alef
  '\u0628': { iso: '\uFE8F', ini: '\uFE91', med: '\uFE92', fin: '\uFE90' }, // beh
  '\u0629': { iso: '\uFE93', fin: '\uFE94' }, // teh marbuta
  '\u062A': { iso: '\uFE95', ini: '\uFE97', med: '\uFE98', fin: '\uFE96' }, // teh
  '\u062B': { iso: '\uFE99', ini: '\uFE9B', med: '\uFE9C', fin: '\uFE9A' }, // theh
  '\u062C': { iso: '\uFE9D', ini: '\uFE9F', med: '\uFEA0', fin: '\uFE9E' }, // jeem
  '\u062D': { iso: '\uFEA1', ini: '\uFEA3', med: '\uFEA4', fin: '\uFEA2' }, // hah
  '\u062E': { iso: '\uFEA5', ini: '\uFEA7', med: '\uFEA8', fin: '\uFEA6' }, // khah
  '\u062F': { iso: '\uFEA9', fin: '\uFEAA' }, // dal
  '\u0630': { iso: '\uFEAB', fin: '\uFEAC' }, // thal
  '\u0631': { iso: '\uFEAD', fin: '\uFEAE' }, // reh
  '\u0632': { iso: '\uFEAF', fin: '\uFEB0' }, // zain
  '\u0633': { iso: '\uFEB1', ini: '\uFEB3', med: '\uFEB4', fin: '\uFEB2' }, // seen
  '\u0634': { iso: '\uFEB5', ini: '\uFEB7', med: '\uFEB8', fin: '\uFEB6' }, // sheen
  '\u0635': { iso: '\uFEB9', ini: '\uFEBB', med: '\uFEBC', fin: '\uFEBA' }, // sad
  '\u0636': { iso: '\uFEBD', ini: '\uFEBF', med: '\uFEC0', fin: '\uFEBE' }, // dad
  '\u0637': { iso: '\uFEC1', ini: '\uFEC3', med: '\uFEC4', fin: '\uFEC2' }, // tah
  '\u0638': { iso: '\uFEC5', ini: '\uFEC7', med: '\uFEC8', fin: '\uFEC6' }, // zah
  '\u0639': { iso: '\uFEC9', ini: '\uFECB', med: '\uFECC', fin: '\uFECA' }, // ain
  '\u063A': { iso: '\uFECD', ini: '\uFECF', med: '\uFED0', fin: '\uFECE' }, // ghain
  '\u0641': { iso: '\uFED1', ini: '\uFED3', med: '\uFED4', fin: '\uFED2' }, // feh
  '\u0642': { iso: '\uFED5', ini: '\uFED7', med: '\uFED8', fin: '\uFED6' }, // qaf
  '\u0643': { iso: '\uFED9', ini: '\uFEDB', med: '\uFEDC', fin: '\uFEDA' }, // kaf
  '\u0644': { iso: '\uFEDD', ini: '\uFEDF', med: '\uFEE0', fin: '\uFEDE' }, // lam
  '\u0645': { iso: '\uFEE1', ini: '\uFEE3', med: '\uFEE4', fin: '\uFEE2' }, // meem
  '\u0646': { iso: '\uFEE5', ini: '\uFEE7', med: '\uFEE8', fin: '\uFEE6' }, // noon
  '\u0647': { iso: '\uFEE9', ini: '\uFEEB', med: '\uFEEC', fin: '\uFEEA' }, // heh
  '\u0648': { iso: '\uFEED', fin: '\uFEEE' }, // waw
  '\u064A': { iso: '\uFEF1', ini: '\uFEF3', med: '\uFEF4', fin: '\uFEF2' }, // yeh
  // tatweel / kashida
  '\u0640': { iso: '\u0640', ini: '\u0640', med: '\u0640', fin: '\u0640' },
};

const CONNECTABLE = new Set(Object.keys(ARABIC_LETTERS).filter((c) => ARABIC_LETTERS[c].ini !== undefined));

function isArabicChar(ch) {
  return ch >= '\u0600' && ch <= '\u06FF';
}

function hasArabic(text) {
  for (const ch of text) if (isArabicChar(ch)) return true;
  return false;
}

// Shaping applies to a pure-Arabic token; returns the presentation-form string.
function shapeToken(token) {
  const chars = token.split('');
  const out = [];
  const prevConnectable = [false];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const letter = ARABIC_LETTERS[ch];
    if (!letter) { out.push(ch); prevConnectable[0] = false; continue; }

    const prev = chars[i - 1];
    const next = chars[i + 1];
    const prevIsConnectable = prev && CONNECTABLE.has(prev);
    const nextIsConnectable = next && CONNECTABLE.has(next);

    let form = 'iso';
    if (prevIsConnectable && nextIsConnectable) form = 'med';
    else if (prevIsConnectable && !nextIsConnectable) form = 'fin';
    else if (!prevIsConnectable && nextIsConnectable) form = 'ini';

    const shaped = letter[form] !== undefined ? letter[form] : letter.iso;
    out.push(shaped);
    prevConnectable[0] = CONNECTABLE.has(ch);
  }
  return out.join('');
}

// Shape + reverse an Arabic text segment for RTL rendering in pdfkit.
function shapeArabic(text) {
  if (!text) return text;
  // Split into tokens (Arabic vs non-Arabic runs), shape each Arabic token, then
  // reverse the whole sequence for RTL presentation.
  const tokens = [];
  let current = '';
  let currentIsArabic = false;
  for (const ch of text) {
    const arab = isArabicChar(ch);
    if (current && arab !== currentIsArabic) {
      tokens.push({ text: current, arabic: currentIsArabic });
      current = '';
    }
    currentIsArabic = arab;
    current += ch;
  }
  if (current) tokens.push({ text: current, arabic: currentIsArabic });

  const shapedTokens = tokens.map((t) => (t.arabic ? shapeToken(t.text) : t.text));
  // Reverse token order so the first Arabic word renders rightmost.
  shapedTokens.reverse();
  return shapedTokens.join('');
}

module.exports = { shapeArabic, hasArabic };
