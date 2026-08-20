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
 * ┘è╪¼┘ä╪¿ ┘ç┘ê┘è╪⌐ ╪º┘ä╪┤╪▒┘â╪⌐ (┘ä┘ê╪¼┘ê + ╪º╪│┘à + ┘ä┘ê┘å ╪▒╪ª┘è╪│┘è) ╪╣╪┤╪º┘å ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╣┘à┘è┘ä ╪¬╪╕┘ç╪▒ ╪¿┘ç┘ê┘è╪⌐ ╪º┘ä┘à╪¬╪¼╪▒
 * ┘à╪┤ ╪¿┘ç┘ê┘è╪⌐ ╪º┘ä┘à┘å╪╡╪⌐. ╪¿┘è╪│╪¬╪«╪»┘à /public/storefront/settings (╪╣╪º┘à ┘ê╪¿┘è╪¡┘ä ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘å ╪º┘ä┘Ç subdomain).
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
