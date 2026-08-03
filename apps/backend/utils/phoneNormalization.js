let parsePhoneNumberFromString = null;
try {
  ({ parsePhoneNumberFromString } = require('libphonenumber-js'));
} catch (e) {
  // libphonenumber-js غير مثبّت — نفضل الـ heuristics المصرية
}

function stripPhone(value) {
  return String(value || '').replace(/\D/g, '');
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

  // 1) libphonenumber: رقم دولي صالح (عنده country code) → يبقى E.164 صحيح لأي دولة
  //    (مش بس مصر). ده بيصلح الأرقام غير المصرية اللي كانت بتتبهدل بالـ heuristics.
  if (parsePhoneNumberFromString) {
    try {
      const parsed = parsePhoneNumberFromString('+' + digits);
      if (parsed && parsed.isValid()) {
        return parsed.number;
      }
    } catch (e) { /* not parseable — fall through */ }

    // 2) رقم محلي مصري (01...) → +20xxxxxxxxxx
    try {
      const parsedEg = parsePhoneNumberFromString(digits, 'EG');
      if (parsedEg && parsedEg.isValid()) {
        return parsedEg.number;
      }
    } catch (e) { /* fall through */ }
  }

  // 3) Fallback: heuristics مصرية قديمة (للأرقام اللي libphonenumber مش قادر يصنفها)
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
};
