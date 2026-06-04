import { type Governorate, getGovernorateByName } from "../constants/egyptGovernorates";
import { getBackendUrl } from "../config/environment";

interface BackendGeoResponse {
  success?: boolean;
  data?: {
    countryCode?: string;
    region?: string;
    regionName?: string;
    city?: string;
  };
}

/**
 * Detects the user's governorate based on their IP address.
 * Uses backend geolocation endpoint to avoid browser CORS and rate limits.
 * 
 * @returns {Promise<Governorate | null>} The detected governorate or null if not found.
 */
export async function detectUserGovernorate(): Promise<Governorate | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/geolocation/detect`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    const result = (await response.json()) as BackendGeoResponse;
    const data = result?.data;
    if (!data || data.countryCode !== "EG") return null;

    const candidates = [data.region, data.regionName, data.city].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const governorate = getGovernorateByName(candidate);
      if (governorate) {
        console.info(`Detected via backend geolocation: ${governorate.nameAr}`);
        return governorate;
      }
    }
  } catch (error) {
    if (import.meta.env.DEV || import.meta.env.MODE === "development") {
      console.warn("Backend geolocation failed:", error);
    }
  }

  return null;
}
