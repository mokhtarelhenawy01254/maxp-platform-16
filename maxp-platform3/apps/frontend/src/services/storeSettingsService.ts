import { apiClient } from "./apiClient";

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  workingHours?: string;
  isActive: boolean;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingTier {
  minWeight?: number;
  maxWeight?: number;
  minOrderValue?: number;
  maxOrderValue?: number;
  price: number;
}

export interface CanonicalGovernorate {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  isActive: boolean;
  aliases?: { id: string; alias: string; normalizedAlias: string }[];
}

export interface ShippingZone {
  id: string;
  name: string;
  governorateIds: string[];
  governorates: string[];
  pricingType: "flat" | "tiered";
  price: number;
  pricingTiers?: PricingTier[];
  deliveryTime: string;
  deliveryTimeType: "same-day" | "1-2" | "3-5" | "5-7" | "custom";
  freeShippingThreshold?: number;
  isActive: boolean;
  companyId: string;
  canonicalGovernorates?: CanonicalGovernorate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingMethod {
  id: string;
  zoneId: string;
  title: string;
  type: string;
  isEnabled: boolean;
  settings?: any;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

class StoreSettingsService {
  // ============ Branches API ============

  async getBranches() {
    return apiClient.get<{ data: Branch[] }>("/store-settings/branches");
  }

  async getBranchById(id: string) {
    return apiClient.get<{ data: Branch }>(`/store-settings/branches/${id}`);
  }

  async createBranch(data: Partial<Branch>) {
    return apiClient.post<{ data: Branch }>("/store-settings/branches", data);
  }

  async updateBranch(id: string, data: Partial<Branch>) {
    return apiClient.put<{ data: Branch }>(
      `/store-settings/branches/${id}`,
      data,
    );
  }

  async deleteBranch(id: string) {
    return apiClient.delete(`/store-settings/branches/${id}`);
  }

  // ============ Shipping Zones API ============

  async getShippingZones() {
    return apiClient.get<{ data: ShippingZone[] }>(
      "/store-settings/shipping-zones",
    );
  }

  async getCanonicalGovernorates() {
    return apiClient.get<{ data: CanonicalGovernorate[] }>(
      "/store-settings/shipping-governorates",
    );
  }

  async getShippingZoneById(id: string) {
    return apiClient.get<{ data: ShippingZone }>(
      `/store-settings/shipping-zones/${id}`,
    );
  }

  async createShippingZone(data: Partial<ShippingZone>) {
    return apiClient.post<{ data: ShippingZone }>(
      "/store-settings/shipping-zones",
      data,
    );
  }

  async updateShippingZone(id: string, data: Partial<ShippingZone>) {
    return apiClient.put<{ data: ShippingZone }>(
      `/store-settings/shipping-zones/${id}`,
      data,
    );
  }

  async deleteShippingZone(id: string) {
    return apiClient.delete(`/store-settings/shipping-zones/${id}`);
  }

  // ============ Shipping Methods API ============

  async getShippingMethods(zoneId: string) {
    return apiClient.get<{ data: ShippingMethod[] }>(
      `/store-settings/shipping-zones/${zoneId}/methods`,
    );
  }

  async createShippingMethod(zoneId: string, data: Partial<ShippingMethod>) {
    return apiClient.post<{ data: ShippingMethod }>(
      `/store-settings/shipping-zones/${zoneId}/methods`,
      data,
    );
  }

  async updateShippingMethod(
    methodId: string,
    data: Partial<ShippingMethod>,
  ) {
    return apiClient.put<{ data: ShippingMethod }>(
      `/store-settings/shipping-methods/${methodId}`,
      data,
    );
  }

  async deleteShippingMethod(methodId: string) {
    return apiClient.delete(`/store-settings/shipping-methods/${methodId}`);
  }

  // ============ Helper Methods ============

  /**
   * Generate governorate name variations to handle different spellings
   * Examples:
   * - "القاهرة" -> ["القاهرة", "قاهرة", "القاهره", "قاهره"]
   * - "الإسكندرية" -> ["الإسكندرية", "إسكندرية", "الإسكندريه", "إسكندريه"]
   */
  generateGovernorateVariations(name: string): string[] {
    const variations = new Set<string>();
    const cleaned = name.trim();

    // Add original
    variations.add(cleaned);

    // Handle "ال" prefix variations
    if (cleaned.startsWith("ال")) {
      variations.add(cleaned.substring(2));
    } else {
      variations.add("ال" + cleaned);
    }

    // Handle ه/ة ending variations
    if (cleaned.endsWith("ه")) {
      const withoutEnding = cleaned.slice(0, -1);
      variations.add(withoutEnding + "ة");

      // Also add variations without "ال"
      if (cleaned.startsWith("ال")) {
        variations.add(cleaned.substring(2).slice(0, -1) + "ة");
      } else {
        variations.add("ال" + withoutEnding + "ة");
      }
    } else if (cleaned.endsWith("ة")) {
      const withoutEnding = cleaned.slice(0, -1);
      variations.add(withoutEnding + "ه");

      // Also add variations without "ال"
      if (cleaned.startsWith("ال")) {
        variations.add(cleaned.substring(2).slice(0, -1) + "ه");
      } else {
        variations.add("ال" + withoutEnding + "ه");
      }
    }

    return Array.from(variations);
  }

  /**
   * Find shipping price for a governorate name
   * This will match against all variations in the shipping zones
   */
  async findShippingPrice(
    governorate: string,
  ): Promise<{
    zone: ShippingZone | null;
    price: number;
    deliveryTime: string;
  }> {
    try {
      const response = await this.getShippingZones();
      const zones = response.data.data || [];

      const normalizedInput = governorate.trim().toLowerCase();

      // Find matching zone
      const matchedZone = zones.find(
        (zone) =>
          zone.isActive &&
          zone.governorates.some(
            (gov) => gov.toLowerCase() === normalizedInput,
          ),
      );

      if (matchedZone) {
        return {
          zone: matchedZone,
          price: matchedZone.price,
          deliveryTime: matchedZone.deliveryTime,
        };
      }

      return {
        zone: null,
        price: 0,
        deliveryTime: "غير محدد",
      };
    } catch (error) {
      console.error("Error finding shipping price:", error);
      return {
        zone: null,
        price: 0,
        deliveryTime: "غير محدد",
      };
    }
  }
}

export const storeSettingsService = new StoreSettingsService();
