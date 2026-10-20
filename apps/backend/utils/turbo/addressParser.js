/**
 * Turbo Address Parser Utilities
 * ╪»┘ê╪º┘ä ╪¬╪¡┘ä┘è┘ä ┘ê╪¬┘å╪╕┘è┘ü ╪º┘ä╪╣┘å┘ê╪º┘å ┘ä╪┤╪¡┘å Turbo
 */

function cleanLocationName(location) {
  if (!location) return '';
  return location.toString().replace(/^\d+:/, '').trim();
}

function parseShippingAddress(shippingAddress) {
  if (!shippingAddress) {
    return null;
  }

  if (typeof shippingAddress === 'object') {
    return Array.isArray(shippingAddress) ? null : shippingAddress;
  }

  if (typeof shippingAddress !== 'string') {
    return null;
  }

  const trimmedAddress = shippingAddress.trim();
  if (!trimmedAddress.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedAddress);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function getShippingAddressFields(shippingAddress) {
  const parsedAddress = parseShippingAddress(shippingAddress);
  const fallbackText = typeof shippingAddress === 'string' ? shippingAddress.trim() : '';

  if (!parsedAddress) {
    return {
      sourceValue: shippingAddress,
      parsedAddress: null,
      primaryAddress: fallbackText,
      secondaryAddress: '',
      city: '',
      governorate: '',
      formattedAddress: fallbackText,
    };
  }

  const normalizeText = (value, isLocation = false) => {
    if (value === null || value === undefined) {
      return '';
    }

    let normalizedValue = String(value).trim();
    if (!normalizedValue) {
      return '';
    }

    if (normalizedValue.startsWith('{')) {
      try {
        const innerObj = JSON.parse(normalizedValue);
        if (innerObj && typeof innerObj === 'object') {
          normalizedValue = innerObj.addressLine1 || innerObj.street || innerObj.address || innerObj.address1 || innerObj.address_1 || '';
        }
      } catch (e) {
        // ignore
      }
    }

    if (normalizedValue.startsWith('{') || normalizedValue.startsWith('[')) {
      return '';
    }

    return isLocation ? cleanLocationName(normalizedValue) : normalizedValue;
  };

  const city = normalizeText(parsedAddress.city || parsedAddress.town || '', true);
  const governorate = normalizeText(parsedAddress.governorate || parsedAddress.state || parsedAddress.province || parsedAddress.region, true);
  // The Turbo `area` field means the district/╪¡┘è. Derive it from the most specific
  // location key so a district stored under `district`/`neighborhood` is not dropped
  // (previously only `area` was considered, which left the area field empty/wrong).
  const area = normalizeText(parsedAddress.area || parsedAddress.district || parsedAddress.neighborhood || parsedAddress.landmark || '', true);
  const parts = [
    normalizeText(parsedAddress.address),
    normalizeText(parsedAddress.street),
    normalizeText(parsedAddress.addressLine1),
    normalizeText(parsedAddress.address1),
    normalizeText(parsedAddress.address_1),
    normalizeText(parsedAddress.address_2),
    normalizeText(parsedAddress.district),
    normalizeText(parsedAddress.neighborhood),
    normalizeText(parsedAddress.area),
    normalizeText(parsedAddress.landmark),
    city,
    governorate
  ].filter(Boolean);

  const uniqueParts = [];
  const seenParts = new Set();
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seenParts.has(key)) {
      continue;
    }

    seenParts.add(key);
    uniqueParts.push(part);
  }

  const formattedAddress = uniqueParts.join(', ') || fallbackText;
  const primaryAddress = uniqueParts[0] || fallbackText;
  const secondaryAddress = uniqueParts.slice(1).join(', ');

  return {
    sourceValue: shippingAddress,
    parsedAddress,
    primaryAddress,
    secondaryAddress,
    city,
    governorate,
    area,
    formattedAddress,
  };
}

function getAddressCompletenessScore(addressFields = {}) {
  const text = String(addressFields.formattedAddress || '').trim();
  if (!text) {
    return 0;
  }

  let score = text.length;
  const parsedAddress = addressFields.parsedAddress || {};

  // Only a REAL street portion (address/street/...) earns the big bonus.
  // `area`/`governorate`-only JSON objects must NOT outrank a plain-text
  // address that actually contains the street, otherwise the detailed
  // address gets dropped and Turbo receives an incomplete (area-only) address.
  const primaryStreetKeys = [
    'address',
    'street',
    'addressLine1',
    'address1',
    'address_1',
    'address_2',
  ];
  const secondaryStreetKeys = [
    'district',
    'neighborhood',
    'area',
    'landmark',
  ];

  const hasPrimaryStreet = primaryStreetKeys.some((key) => String(parsedAddress[key] || '').trim());

  // Only a real street (address/street/...) earns the large bonus.
  // `area`/`district`/`landmark`-only objects must NOT outrank a plain-text
  // address that actually contains the street, otherwise the detailed
  // address is dropped and Turbo receives an incomplete (area-only) address.
  if (hasPrimaryStreet) {
    score += 1000;
  }

  const locationOnlyValues = [
    addressFields.city,
    addressFields.governorate,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  if (locationOnlyValues.includes(text.toLowerCase())) {
    score -= 500;
  }

  return score;
}

function getBestShippingAddressFields(...shippingAddressCandidates) {
  const fields = shippingAddressCandidates
    .map((candidate) => getShippingAddressFields(candidate));
  if (fields.length === 0) return getShippingAddressFields('');

  fields.sort((a, b) => getAddressCompletenessScore(b) - getAddressCompletenessScore(a));
  const best = fields[0];

  // Merge location fields (city/governorate/area) from ALL candidates, not just
  // the one chosen for the street. Otherwise the real district/area ΓÇö which is
  // often only present in the structured shippingAddress JSON while the street
  // lives in a plain-text customerAddress ΓÇö gets dropped and Turbo receives an
  // incorrect (governorate-level) area.
  const nonEmpty = (vals) => vals.find((v) => v && String(v).trim()) || '';
  const mergedArea = nonEmpty(fields.map((f) => f.area || (f.parsedAddress && (f.parsedAddress.area || f.parsedAddress.district || f.parsedAddress.neighborhood)) || ''));

  const merged = { ...best, city: nonEmpty(fields.map((f) => f.city)), governorate: nonEmpty(fields.map((f) => f.governorate)), area: mergedArea };
  if (merged.parsedAddress) {
    merged.parsedAddress = { ...merged.parsedAddress, area: mergedArea };
  } else if (mergedArea) {
    merged.parsedAddress = { area: mergedArea };
  }
  return merged;
}

function unwrapAddressText(value) {
  if (value === null || value === undefined) return '';
  let text = String(value).trim();
  while (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        text = String(parsed.street || parsed.addressLine1 || parsed.address || parsed.address1 || parsed.address_1 || '').trim();
      } else {
        break;
      }
    } catch (e) {
      break;
    }
  }
  return text;
}

function extractCleanStreetAddress(addressFields, rawFallback = '', options = {}) {
  let streetText = unwrapAddressText(addressFields.formattedAddress)
    || unwrapAddressText(addressFields.primaryAddress)
    || unwrapAddressText(addressFields.parsedAddress?.street)
    || unwrapAddressText(addressFields.parsedAddress?.addressLine1)
    || unwrapAddressText(addressFields.parsedAddress?.address)
    || unwrapAddressText(addressFields.sourceValue)
    || unwrapAddressText(rawFallback);

  if (typeof streetText !== 'string') {
    streetText = String(streetText || '');
  }

  streetText = streetText.trim();

  // Strip standalone mobile numbers if embedded in the address text
  streetText = streetText.replace(/01[0-9]{9}/g, '');

  // Strip customer name if embedded in the address
  if (options.customerName) {
    const nameParts = String(options.customerName).trim().split(/\s+/).filter(p => p.length > 2);
    if (nameParts.length > 0) {
      const nameRegex = new RegExp(nameParts.join('|'), 'gi');
      streetText = streetText.replace(nameRegex, '');
    }
  }

  // Remove trailing city or governorate name only if it's trailing at the very end of the formatted address
  const knownGovNames = [
    'Cairo', 'Giza', 'Alexandria', 'القاهرة', 'القاهره', 'الجيزة', 'الجيزه', 'الإسكندرية', 'الاسكندريه'
  ];
  const locWords = [
    addressFields.governorate,
    options.governorate,
    addressFields.city,
    options.city,
    ...knownGovNames
  ].filter(Boolean).map(s => cleanLocationName(String(s).trim())).filter(s => s.length > 2);

  let stripped = true;
  let iterations = 0;
  while (stripped && iterations < 5) {
    stripped = false;
    iterations++;
    for (const loc of locWords) {
      const locRegex = new RegExp(`[\\s,]+(${loc.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\s*$`, 'i');
      if (locRegex.test(streetText)) {
        streetText = streetText.replace(locRegex, '');
        stripped = true;
      }
    }
  }

  // Clean up extra whitespace and punctuation without removing location/district text
  streetText = streetText
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[,\s\-\:\.\t،]+|[,\s\-\:\.\t،]+$/g, '')
    .replace(/[،\s]*,[،\s]*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (streetText.length < 3) {
    const fallbackClean = unwrapAddressText(rawFallback).replace(/01[0-9]{9}/g, '').trim();
    if (fallbackClean.length >= 3) {
      streetText = fallbackClean;
    }
  }

  // Never emit a raw JSON blob as the street address
  if (streetText.startsWith('{') || streetText.startsWith('[')) {
    streetText = '';
  }

  return streetText.substring(0, 350).trim();
}

function normalizeGuestShippingAddress(rawShippingAddress) {
  let parsedShippingAddress = rawShippingAddress || {};

  if (typeof parsedShippingAddress === 'string') {
    try {
      parsedShippingAddress = JSON.parse(parsedShippingAddress);
    } catch (error) {
      return {
        rawShippingAddress,
        parsedShippingAddress: {},
        customerAddress: rawShippingAddress || '',
        city: '',
        governorate: '',
      };
    }
  }

  if (!parsedShippingAddress || typeof parsedShippingAddress !== 'object' || Array.isArray(parsedShippingAddress)) {
    return {
      rawShippingAddress,
      parsedShippingAddress: {},
      customerAddress: '',
      city: '',
      governorate: '',
    };
  }

  const addressParts = [
    parsedShippingAddress.address,
    parsedShippingAddress.street,
    parsedShippingAddress.addressLine1,
    parsedShippingAddress.address1,
    parsedShippingAddress.address_1,
    parsedShippingAddress.address_2,
    parsedShippingAddress.district,
    parsedShippingAddress.neighborhood,
    parsedShippingAddress.area,
    parsedShippingAddress.landmark,
  ]
    .map((part) => (part === null || part === undefined ? '' : String(part).trim()))
    .filter(Boolean);

  const uniqueParts = [];
  const seenParts = new Set();
  for (const part of addressParts) {
    const key = part.toLowerCase();
    if (seenParts.has(key)) {
      continue;
    }

    seenParts.add(key);
    uniqueParts.push(part);
  }

  return {
    rawShippingAddress,
    parsedShippingAddress,
    customerAddress: uniqueParts.join(', '),
    city: parsedShippingAddress.city || '',
    governorate: parsedShippingAddress.governorate || '',
  };
}

module.exports = {
  cleanLocationName,
  parseShippingAddress,
  getShippingAddressFields,
  getAddressCompletenessScore,
  getBestShippingAddressFields,
  extractCleanStreetAddress,
  normalizeGuestShippingAddress
};
