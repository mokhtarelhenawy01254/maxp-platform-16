const https = require('https');
const http = require('http');

// In-memory cache with Map (LRU-like with 24-hour TTL)
const _geoCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

const REGION_CODE_TO_ARABIC = {
  C: 'القاهرة',
  CAI: 'القاهرة',
  GZ: 'الجيزة',
  GIZ: 'الجيزة',
  ALX: 'الإسكندرية',
  DK: 'الدقهلية',
  BA: 'البحر الأحمر',
  BH: 'البحيرة',
  FYM: 'الفيوم',
  GH: 'الغربية',
  IS: 'الإسماعيلية',
  MNF: 'المنوفية',
  MN: 'المنيا',
  KB: 'القليوبية',
  WAD: 'الوادي الجديد',
  SUZ: 'السويس',
  ASN: 'أسوان',
  AST: 'أسيوط',
  BNS: 'بني سويف',
  PTS: 'بورسعيد',
  DT: 'دمياط',
  SHK: 'الشرقية',
  JS: 'جنوب سيناء',
  KFS: 'كفر الشيخ',
  MT: 'مطروح',
  LX: 'الأقصر',
  KN: 'قنا',
  SIN: 'شمال سيناء',
  SHG: 'سوهاج',
};

const REGION_NAME_TO_ARABIC = {
  'cairo': 'القاهرة',
  'al qahirah': 'القاهرة',
  'giza': 'الجيزة',
  'al jizah': 'الجيزة',
  'alexandria': 'الإسكندرية',
  'al iskandariyah': 'الإسكندرية',
  'dakahlia': 'الدقهلية',
  'ad daqahliyah': 'الدقهلية',
  'mansoura': 'الدقهلية',
  'gharbia': 'الغربية',
  'al gharbiyah': 'الغربية',
  'tanta': 'الغربية',
  'sharqia': 'الشرقية',
  'ash sharqiyah': 'الشرقية',
  'zagazig': 'الشرقية',
  'qalyubia': 'القليوبية',
  'al qalyubiyah': 'القليوبية',
  'banha': 'القليوبية',
  'beheira': 'البحيرة',
  'al buhayrah': 'البحيرة',
  'damanhur': 'البحيرة',
  'monufia': 'المنوفية',
  'al minufiyah': 'المنوفية',
  'kafr el sheikh': 'كفر الشيخ',
  'kafr ash shaykh': 'كفر الشيخ',
  'damietta': 'دمياط',
  'dumyat': 'دمياط',
  'port said': 'بورسعيد',
  'bur said': 'بورسعيد',
  'ismailia': 'الإسماعيلية',
  'al ismailiyah': 'الإسماعيلية',
  'suez': 'السويس',
  'as suways': 'السويس',
  'fayoum': 'الفيوم',
  'al fayyum': 'الفيوم',
  'beni suef': 'بني سويف',
  'bani suwayf': 'بني سويف',
  'minya': 'المنيا',
  'al minya': 'المنيا',
  'asyut': 'أسيوط',
  'sohag': 'سوهاج',
  'suhaj': 'سوهاج',
  'qena': 'قنا',
  'qina': 'قنا',
  'luxor': 'الأقصر',
  'al uqsur': 'الأقصر',
  'aswan': 'أسوان',
  'red sea': 'البحر الأحمر',
  'al bahr al ahmar': 'البحر الأحمر',
  'hurghada': 'البحر الأحمر',
  'south sinai': 'جنوب سيناء',
  'janub sina': 'جنوب سيناء',
  'sharm el-sheikh': 'جنوب سيناء',
  'north sinai': 'شمال سيناء',
  'shamal sina': 'شمال سيناء',
  'matrouh': 'مطروح',
  'matruh': 'مطروح',
  'new valley': 'الوادي الجديد',
  'al wadi al jadid': 'الوادي الجديد',
};

const CITY_NAME_TO_ARABIC = {
  'girga': 'جرجا',
  'al mansurah': 'المنصورة',
  'mansoura': 'المنصورة',
  'talkha': 'طلخا',
  'tanta': 'طنطا',
  'mahalla': 'المحلة الكبرى',
  'el mahalla el kubra': 'المحلة الكبرى',
  'zagazig': 'الزقازيق',
  'damanhur': 'دمنهور',
  'banha': 'بنها',
  'sharm el-sheikh': 'شرم الشيخ',
  'hurghada': 'الغردقة',
  'cairo': 'القاهرة',
  'giza': 'الجيزة',
  'alexandria': 'الإسكندرية',
  'obour': 'مدينة العبور',
  'el obour': 'مدينة العبور',
  '6th of october': 'السادس من أكتوبر',
  'sheikh zayed': 'الشيخ زايد',
  'new cairo': 'القاهرة الجديدة',
  'nasr city': 'مدينة نصر',
  'heliopolis': 'مصر الجديدة',
  'maadi': 'المعادي',
  'helwan': 'حلوان',
  'shubra': 'شبرا',
  'dokki': 'الدقي',
  'mohandessin': 'المهندسين',
  'suez': 'السويس',
  'port said': 'بورسعيد',
  'ismailia': 'الإسماعيلية',
  'damietta': 'دمياط',
  'fayoum': 'الفيوم',
  'beni suef': 'بني سويف',
  'minya': 'المنيا',
  'asyut': 'أسيوط',
  'sohag': 'سوهاج',
  'qena': 'قنا',
  'luxor': 'الأقصر',
  'aswan': 'أسوان',
  'marsa matruh': 'مرسى مطروح',
  'arish': 'العريش',
  'mallawi': 'ملوي',
  'maghagha': 'مغاغة',
  'samalut': 'سمالوط',
  'tahta': 'طهطا',
  'qous': 'قوص',
  'edfu': 'إدفو',
  'kom ombo': 'كوم أمبو',
  'mit gamr': 'ميت غمر',
  'shebin el kom': 'شبين الكوم',
  'desouk': 'دسوق',
  'kafr el dawwar': 'كفر الدوار',
};

function cleanString(val) {
  if (!val || typeof val !== 'string') return '';
  return val.trim();
}

function isLocalOrPrivateIp(ip) {
  if (!ip) return true;
  let clean = String(ip).trim();
  if (clean.startsWith('::ffff:')) {
    clean = clean.substring(7);
  }
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)
  );
}

function getClientIp(req) {
  if (!req) return null;

  const cfConnectingIp = cleanString(req.headers?.['cf-connecting-ip']);
  if (cfConnectingIp && !isLocalOrPrivateIp(cfConnectingIp)) return cfConnectingIp;

  const forwarded = cleanString(req.headers?.['x-forwarded-for']);
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    const publicIp = parts.find((p) => !isLocalOrPrivateIp(p));
    if (publicIp) return publicIp;
  }

  const realIp = cleanString(req.headers?.['x-real-ip']);
  if (realIp && !isLocalOrPrivateIp(realIp)) return realIp;

  const clientIp = cleanString(req.headers?.['x-client-ip'] || req.headers?.['true-client-ip']);
  if (clientIp && !isLocalOrPrivateIp(clientIp)) return clientIp;

  let remote = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip;
  if (remote) {
    remote = String(remote).trim();
    if (remote.startsWith('::ffff:')) {
      remote = remote.substring(7);
    }
    return remote;
  }

  return cfConnectingIp || (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || null;
}

function mapToEgyptianGovernorate(regionCode, regionName, cityName) {
  if (regionCode) {
    const codeUpper = String(regionCode).trim().toUpperCase();
    if (REGION_CODE_TO_ARABIC[codeUpper]) {
      return REGION_CODE_TO_ARABIC[codeUpper];
    }
  }

  const cleanRegion = String(regionName || '').toLowerCase().trim();
  if (cleanRegion && REGION_NAME_TO_ARABIC[cleanRegion]) {
    return REGION_NAME_TO_ARABIC[cleanRegion];
  }

  const cleanCity = String(cityName || '').toLowerCase().trim();
  if (cleanCity && REGION_NAME_TO_ARABIC[cleanCity]) {
    return REGION_NAME_TO_ARABIC[cleanCity];
  }

  for (const [key, value] of Object.entries(REGION_NAME_TO_ARABIC)) {
    if (cleanRegion.includes(key)) {
      return value;
    }
  }

  for (const [key, value] of Object.entries(REGION_NAME_TO_ARABIC)) {
    if (cleanCity && cleanCity.includes(key)) {
      return value;
    }
  }

  return regionName || cityName || null;
}

function mapCityToArabic(cityName) {
  if (!cityName || typeof cityName !== 'string') return null;
  const clean = cityName.toLowerCase().trim();
  if (CITY_NAME_TO_ARABIC[clean]) return CITY_NAME_TO_ARABIC[clean];
  for (const [key, value] of Object.entries(CITY_NAME_TO_ARABIC)) {
    if (clean.includes(key)) return value;
  }
  return cityName.trim();
}

async function fetchFromIpApi(ip) {
  return new Promise((resolve) => {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city`;
    const req = http.get(url, { timeout: 2500 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.status === 'success') {
            resolve({
              country: parsed.countryCode || parsed.country || 'EG',
              region: parsed.regionName || parsed.region || null,
              regionCode: parsed.region || null,
              city: parsed.city || null,
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function fetchFromFreeIpApi(ip) {
  return new Promise((resolve) => {
    const url = `https://freeipapi.com/api/json/${encodeURIComponent(ip)}`;
    const handleResponse = (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const redirectUrl = res.headers.location;
        const client = redirectUrl.startsWith('https') ? https : http;
        const redirectReq = client.get(redirectUrl, { timeout: 2500 }, (redirectRes) => {
          handleData(redirectRes);
        });
        redirectReq.on('error', () => resolve(null));
        redirectReq.on('timeout', () => {
          redirectReq.destroy();
          resolve(null);
        });
        return;
      }
      handleData(res);
    };

    const handleData = (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.cityName || parsed.regionName)) {
            resolve({
              country: parsed.countryCode || 'EG',
              region: parsed.regionName || null,
              regionCode: parsed.regionCode || null,
              city: parsed.cityName || null,
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    };

    const req = https.get(url, { timeout: 2500 }, handleResponse);
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function fetchFromIpWhoIs(ip) {
  return new Promise((resolve) => {
    const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
    const req = https.get(url, { timeout: 2500 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.success !== false) {
            resolve({
              country: parsed.country_code || parsed.country || 'EG',
              region: parsed.region || null,
              regionCode: parsed.region_code || null,
              city: parsed.city || null,
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function fetchExternalGeo(ip) {
  // 1. Primary: ip-api.com (fast, no key required, unthrottled)
  try {
    const geo = await fetchFromIpApi(ip);
    if (geo && (geo.region || geo.city || geo.regionCode)) return geo;
  } catch {}

  // 2. Secondary: freeipapi.com
  try {
    const geo = await fetchFromFreeIpApi(ip);
    if (geo && (geo.region || geo.city || geo.regionCode)) return geo;
  } catch {}

  // 3. Fallback: ipwho.is
  try {
    const geo = await fetchFromIpWhoIs(ip);
    if (geo && (geo.region || geo.city || geo.regionCode)) return geo;
  } catch {}

  return null;
}

/**
 * Resolves IP geolocation with caching and Cloudflare header priority.
 */
async function resolveIpLocation(ip, req = null) {
  if (!ip || isLocalOrPrivateIp(ip)) {
    return {
      ip: ip || '127.0.0.1',
      governorate: null,
      city: null,
      country: 'EG',
    };
  }

  // 1. Try Cloudflare request headers if matching client IP
  if (req && req.headers) {
    const cfCity = cleanString(req.headers['cf-ipcity']);
    const cfRegionCode = cleanString(req.headers['cf-region-code'] || req.headers['cf-region']);
    const cfCountry = cleanString(req.headers['cf-ipcountry']);

    if (cfCity || cfRegionCode) {
      const governorate = mapToEgyptianGovernorate(cfRegionCode, null, cfCity);
      const city = mapCityToArabic(cfCity);
      const result = {
        ip,
        governorate: governorate || city || cfCity,
        city: city || governorate || cfCity,
        country: cfCountry || 'EG',
      };
      _geoCache.set(ip, { ...result, cachedAt: Date.now() });
      return result;
    }
  }

  // 2. Check in-memory cache
  const cached = _geoCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  // 3. Fallback to fast external geo services
  try {
    const geo = await fetchExternalGeo(ip);
    if (geo) {
      const governorate = mapToEgyptianGovernorate(geo.regionCode, geo.region, geo.city);
      const city = mapCityToArabic(geo.city);
      const result = {
        ip,
        governorate: governorate || geo.region || city || null,
        city: city || geo.city || governorate || null,
        country: geo.country || 'EG',
      };

      if (_geoCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = _geoCache.keys().next().value;
        _geoCache.delete(oldestKey);
      }
      _geoCache.set(ip, { ...result, cachedAt: Date.now() });
      return result;
    }
  } catch (err) {
    // Silent fail
  }

  return {
    ip,
    governorate: null,
    city: null,
    country: 'EG',
  };
}

module.exports = {
  getClientIp,
  isLocalOrPrivateIp,
  resolveIpLocation,
  mapToEgyptianGovernorate,
  mapCityToArabic,
};

