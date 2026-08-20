let parsePhoneNumberFromString = null;
try {
  ({ parsePhoneNumberFromString } = require('libphonenumber-js'));
} catch (e) {
  // libphonenumber-js ╪║┘è╪▒ ┘à╪½╪¿┘æ╪¬ ΓÇö ┘å┘ü╪╢┘ä ╪º┘ä┘Ç heuristics ╪º┘ä┘à╪╡╪▒┘è╪⌐
}

// ╪º┘ä╪ú╪▒┘é╪º┘à ╪º┘ä┘à┘â╪¬┘ê╪¿╪⌐ ╪¿╪ú╪▒┘é╪º┘à ╪╣╪▒╪¿┘è╪⌐/┘ü╪º╪▒╪│┘è╪⌐ (┘á┘í┘ó┘ú / █░█▒█▓█│) ╪¿╪¬╪¬╪¡┘ê┘ä ┘ä╪Ñ┘å╪¼┘ä┘è╪▓┘è╪⌐ (0123)
// ╪╣╪┤╪º┘å ╪º┘ä┘Ç normalization ┘ê╪º┘ä╪¿╪¡╪½ ╪╣┘å ╪º┘ä╪╣┘à┘ä╪º╪í ┘è╪┤╪¬╪║┘ä┘ê╪º ╪╡╪¡ ╪╣┘ä┘ë ┘â┘ä ╪º┘ä╪╡┘è╪║.
const ARABIC_INDIC_0 = 0x0660; // ┘á-┘⌐
const EXTENDED_ARABIC_0 = 0x06F0; // █░-█╣

function toAsciiDigits(value) {
  return String(value || '')
    .replace(/[┘á-┘⌐]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_0))
    .replace(/[█░-█╣]/g, (d) => String(d.charCodeAt(0) - EXTENDED_ARABIC_0));
}

function stripPhone(value) {
  return toAsciiDigits(value).replace(/\D/g, '');
}

function normalizePhone(value) {
  let digits = stripPhone(value);
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Egyptian corrections -> local leading-zero form (mirrors contactIdentity.js)
  if (digits.startsWith('2001') && digits.length === 13) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('01') && digits.length === 11) {
    digits = '0' + digits.slice(1);
  } else if (digits.startsWith('00201') && digits.length === 14) {
    digits = '0' + digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  } else if (digits.startsWith('021') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('20') && digits.length === 12 && digits[2] === '1') {
    digits = '0' + digits.slice(2);
  }

  return digits;
}

function getPhoneVariants(value) {
  const raw = stripPhone(value);
  const normalized = normalizePhone(value);
  const variants = new Set([raw, normalized].filter(Boolean));

  if (normalized.startsWith('0') && normalized.length >= 10) {
    const withoutLeadingZero = normalized.slice(1);
    variants.add(withoutLeadingZero);
    variants.add(`20${withoutLeadingZero}`);
  }

  if (raw.startsWith('20') && raw.length === 12) {
    variants.add(`0${raw.slice(2)}`);
  }

  return Array.from(variants);
}

function toCanonicalE164(value) {
  let digits = stripPhone(value);
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // 1) libphonenumber: ╪▒┘é┘à ╪»┘ê┘ä┘è ╪╡╪º┘ä╪¡ (╪╣┘å╪»┘ç country code) ΓåÆ ┘è╪¿┘é┘ë E.164 ╪╡╪¡┘è╪¡ ┘ä╪ú┘è ╪»┘ê┘ä╪⌐
  //    (┘à╪┤ ╪¿╪│ ┘à╪╡╪▒). ╪»┘ç ╪¿┘è╪╡┘ä╪¡ ╪º┘ä╪ú╪▒┘é╪º┘à ╪║┘è╪▒ ╪º┘ä┘à╪╡╪▒┘è╪⌐ ╪º┘ä┘ä┘è ┘â╪º┘å╪¬ ╪¿╪¬╪¬╪¿┘ç╪»┘ä ╪¿╪º┘ä┘Ç heuristics.
  if (parsePhoneNumberFromString) {
    try {
      const parsed = parsePhoneNumberFromString('+' + digits);
      if (parsed && parsed.isValid()) {
        return parsed.number;
      }
    } catch (e) { /* not parseable ΓÇö fall through */ }

    // 2) ╪▒┘é┘à ┘à╪¡┘ä┘è ┘à╪╡╪▒┘è (01...) ΓåÆ +20xxxxxxxxxx
    try {
      const parsedEg = parsePhoneNumberFromString(digits, 'EG');
      if (parsedEg && parsedEg.isValid()) {
        return parsedEg.number;
      }
    } catch (e) { /* fall through */ }
  }

  // 3) Fallback: heuristics ┘à╪╡╪▒┘è╪⌐ ┘é╪»┘è┘à╪⌐ (┘ä┘ä╪ú╪▒┘é╪º┘à ╪º┘ä┘ä┘è libphonenumber ┘à╪┤ ┘é╪º╪»╪▒ ┘è╪╡┘å┘ü┘ç╪º)
  if (digits.startsWith('2001') && digits.length === 13) {
    digits = '20' + digits.slice(3);
  } else if (digits.startsWith('01') && digits.length === 11) {
    digits = '20' + digits.slice(1);
  } else if (digits.startsWith('00201') && digits.length === 14) {
    digits = digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '20' + digits;
  } else if (digits.startsWith('021') && digits.length === 12) {
    digits = '20' + digits.slice(2);
  }

  return `+${digits}`;
}

function getCanonicalKey(companyId, phone) {
  const canonical = toCanonicalE164(phone);
  if (!canonical) return null;
  return `${companyId}::${canonical}`;
}

module.exports = {
  stripPhone,
  normalizePhone,
  getPhoneVariants,
  toCanonicalE164,
  getCanonicalKey,
  toAsciiDigits,
};
