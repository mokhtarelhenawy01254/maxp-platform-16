/**
 * Turbo Address Parser Utilities
 * دوال تحليل وتنظيف العنوان لشحن Turbo
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

  const city = normalizeText(parsedAddress.city || parsedAddress.town || parsedAddress.area, true);
  const governorate = normalizeText(parsedAddress.governorate || parsedAddress.state || parsedAddress.province || parsedAddress.region, true);
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
  const streetLikeKeys = [
    'address',
    'street',
    'addressLine1',
    'address1',
    'address_1',
    'address_2',
    'district',
    'neighborhood',
    'area',
    'landmark',
  ];

  if (streetLikeKeys.some((key) => String(parsedAddress[key] || '').trim())) {
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
  return shippingAddressCandidates
    .map((candidate) => getShippingAddressFields(candidate))
    .sort((a, b) => getAddressCompletenessScore(b) - getAddressCompletenessScore(a))[0]
    || getShippingAddressFields('');
}

function extractCleanStreetAddress(addressFields, rawFallback = '', options = {}) {
  let streetText = addressFields.formattedAddress || addressFields.primaryAddress || addressFields.parsedAddress?.street || addressFields.parsedAddress?.addressLine1 || addressFields.parsedAddress?.address || '';

  if (typeof streetText !== 'string') {
    streetText = String(streetText || '');
  }

  streetText = streetText.trim();

  if (streetText.startsWith('{')) {
    try {
      const parsed = JSON.parse(streetText);
      streetText = parsed.street || parsed.addressLine1 || parsed.address || parsed.address_1 || '';
    } catch (e) {
      streetText = '';
    }
  }

  if (!streetText || streetText.length < 3) {
    streetText = addressFields.formattedAddress || addressFields.sourceValue || rawFallback || '';
  }

  if (typeof streetText !== 'string') {
    streetText = String(streetText || '');
  }

  if (streetText.startsWith('{') || streetText.startsWith('[')) {
    streetText = '';
  }

  streetText = streetText.replace(/01[0-9]{9}/g, '');

  if (options.customerName) {
    const nameParts = String(options.customerName).trim().split(/\s+/).filter(p => p.length > 2);
    if (nameParts.length > 0) {
      const nameRegex = new RegExp(nameParts.join('|'), 'gi');
      streetText = streetText.replace(nameRegex, '');
    }
  }

  const commonGovWords = ['محافظة القاهره', 'محافظة القاهرة', 'محافظة الجيزة', 'محافظة الاسكندرية', 'أطراف القاهرة والجيزة', 'القاهرة', 'الجيزة', 'الإسكندرية', 'Cairo', 'Giza', 'Alexandria'];
  for (const govWord of commonGovWords) {
    const gRegex = new RegExp(govWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    streetText = streetText.replace(gRegex, '');
  }

  if (addressFields.city || options.city) {
    const cityName = String(addressFields.city || options.city).trim();
    if (cityName && cityName.length > 2) {
      const cityRegex = new RegExp(`(مدينة\\s+)?${cityName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi');
      streetText = streetText.replace(cityRegex, '');
    }
  }

  streetText = streetText
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[,\s\-\:\.\t]+|[,\s\-\:\.\t]+$/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (streetText.length < 3) {
    streetText = String(rawFallback || '').replace(/01[0-9]{9}/g, '').trim();
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
