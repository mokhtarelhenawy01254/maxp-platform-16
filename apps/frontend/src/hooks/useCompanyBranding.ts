import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

export interface CompanyBranding {
  logo: string | null;
  name: string;
  accent: string;
  loading: boolean;
}

const EMPTY: CompanyBranding = { logo: null, name: "", accent: "", loading: true };

/**
 * يجلب هوية الشركة (لوجو + اسم + لون رئيسي) عشان بوابة العميل تظهر بهوية المتجر
 * مش بهوية المنصة. بيستخدم /public/storefront/settings (عام وبيحل الشركة من الـ subdomain).
 */
export const useCompanyBranding = (companyId?: string | null): CompanyBranding => {
  const [branding, setBranding] = useState<CompanyBranding>(EMPTY);

  useEffect(() => {
    let active = true;
    setBranding(EMPTY);

    (async () => {
      try {
        const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
        const res = await apiClient.get(`/public/storefront/settings${query}`);
        const data = res.data?.data;
        const colors = data?.storefront?.designTokens?.colors || {};
        const rawAccent =
          colors?.primary || colors?.primaryColor || colors?.accent || "";
        const accent = String(rawAccent || "").trim();
        if (!active) return;
        setBranding({
          logo: data?.company?.logo || null,
          name:
            data?.company?.name ||
            data?.storefront?.settings?.storeName ||
            data?.company?.nameAr ||
            "",
          accent: accent.startsWith("#") ? accent : accent ? `#${accent}` : "",
          loading: false,
        });
      } catch {
        if (active) setBranding((b) => ({ ...b, loading: false }));
      }
    })();

    return () => {
      active = false;
    };
  }, [companyId]);

  return branding;
};
