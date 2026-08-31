import { EGYPT_GOVERNORATES, getGovernorateByName } from "../../constants/egyptGovernorates";

/**
 * Auto-detect the customer's Egyptian governorate from their IP so it can be
 * pre-selected in the storefront checkout/buybox form the moment they land.
 *
 * Uses the free, no-key HTTPS geo API ipwho.is. Results are cached per-IP in
 * localStorage so we only call the API for a brand-new IP. Fails silently:
 * if the request fails or the visitor is not in Egypt, we simply return null
 * and leave the governorate empty (the buyer can pick it manually).
 */

const GEO_API_URL = "https://ipwho.is/";
const CACHE_KEY = "sf-ip-governorate";

export interface IpGovernorateResult {
  governorate: string | null;
  city: string | null;
}

interface GeoPayload {
  ip?: string;
  success?: boolean;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
}

// ISO 3166-2:EG region codes → canonical EGYPT_GOVERNORATES nameEn values.
const REGION_CODE_TO_GOVERNORATE: Record<string, string> = {
  CAI: "Cairo",
  GIZ: "Giza",
  ALX: "Alexandria",
  DK: "Dakahlia",
  BA: "Red Sea",
  BH: "Beheira",
  FYM: "Fayoum",
  GH: "Gharbia",
  IS: "Ismailia",
  MNF: "Monufia",
  MN: "Minya",
  KB: "Qalyubia",
  WAD: "New Valley",
  SUZ: "Suez",
  ASN: "Aswan",
  AST: "Asyut",
  BNS: "Beni Suef",
  PTS: "Port Said",
  DT: "Damietta",
  SHK: "Sharqia",
  JS: "South Sinai",
  KFS: "Kafr El Sheikh",
  MT: "Matrouh",
  LX: "Luxor",
  KN: "Qena",
  SIN: "North Sinai",
  SHG: "Sohag",
};

// Transliterated region names (as returned by ipwho.is for Egypt) → nameEn.
const REGION_NAME_TO_GOVERNORATE: Record<string, string> = {
  "al qahirah": "Cairo",
  "al jizah": "Giza",
  "al iskandariyah": "Alexandria",
  "ad daqahliyah": "Dakahlia",
  "al bahr al ahmar": "Red Sea",
  "al buhayrah": "Beheira",
  "al fayyum": "Fayoum",
  "al gharbiyah": "Gharbia",
  "al ismailiyah": "Ismailia",
  "al minufiyah": "Monufia",
  "al minya": "Minya",
  "al qalyubiyah": "Qalyubia",
  "al wadi al jadid": "New Valley",
  "as suways": "Suez",
  "aswan": "Aswan",
  "asyut": "Asyut",
  "bani suwayf": "Beni Suef",
  "bur said": "Port Said",
  "dumyat": "Damietta",
  "ash sharqiyah": "Sharqia",
  "janub sina": "South Sinai",
  "shamal sina": "North Sinai",
  "kafr ash shaykh": "Kafr El Sheikh",
  "matruh": "Matrouh",
  "al uqsur": "Luxor",
  "qina": "Qena",
  "suhaj": "Sohag",
};

const normalize = (value: string) =>
  (value || "").toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ").replace(/\s+/g, " ").trim();

const isCanonicalGovernorate = (nameEn: string) =>
  EGYPT_GOVERNORATES.some((gov) => gov.nameEn === nameEn);

const mapGeoToGovernorate = (geo: GeoPayload): string | null => {
  const regionCode = (geo.region_code || "").trim().toUpperCase();
  if (regionCode && REGION_CODE_TO_GOVERNORATE[regionCode]) {
    return REGION_CODE_TO_GOVERNORATE[regionCode];
  }

  const regionName = normalize(geo.region || "");
  if (regionName && REGION_NAME_TO_GOVERNORATE[regionName]) {
    return REGION_NAME_TO_GOVERNORATE[regionName];
  }

  const byRegionName = getGovernorateByName(geo.region || "");
  if (byRegionName && isCanonicalGovernorate(byRegionName.nameEn)) {
    return byRegionName.nameEn;
  }

  const byCity = getGovernorateByName(geo.city || "");
  if (byCity && isCanonicalGovernorate(byCity.nameEn)) {
    return byCity.nameEn;
  }

  return null;
};

const hasWindow = typeof window !== "undefined";

const readCache = (): { ip: string; result: IpGovernorateResult } | null => {
  if (!hasWindow) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      ip?: string;
      result?: IpGovernorateResult;
      expired?: boolean;
    } | null;
    if (parsed?.ip && parsed?.result && !parsed.expired) {
      return { ip: parsed.ip, result: parsed.result };
    }
    return null;
  } catch {
    return null;
  }
};

const writeCache = (ip: string, result: IpGovernorateResult) => {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ip, result, expired: false, ttl: Date.now() + 30 * 24 * 60 * 60 * 1000 }),
    );
  } catch {
    // Ignore storage failures.
  }
};

// Module-level singleton so only one geo request runs per page load even if the
// hook is mounted by multiple components.
let inFlight: Promise<IpGovernorateResult> | null = null;

const fetchGeo = async (): Promise<GeoPayload | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(GEO_API_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as GeoPayload;
    if (data.success === false) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const detectGovernorateByIp = async (): Promise<IpGovernorateResult> => {
  if (!hasWindow) return { governorate: null, city: null };

  const cached = readCache();
  // Reuse the cached result only for the same IP across sessions.
  if (cached?.result?.governorate) {
    return cached.result;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async (): Promise<IpGovernorateResult> => {
    const geo = await fetchGeo();
    if (!geo) return { governorate: null, city: null };

    // Only autofill for Egypt — the storefront ships within Egypt only.
    if ((geo.country_code || "").toUpperCase() !== "EG") {
      writeCache(geo.ip || "unknown", { governorate: null, city: null });
      return { governorate: null, city: null };
    }

    const governorate = mapGeoToGovernorate(geo);
    const city = geo.city?.trim() ? geo.city.trim() : null;

    const result: IpGovernorateResult = { governorate, city };
    writeCache(geo.ip || "unknown", result);
    return result;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};
