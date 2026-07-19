import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { apiClient } from "../../services/apiClient";
import WhatsAppAnalytics from "../whatsapp/WhatsAppAnalytics";

export default function SuperAdminWhatsAppCompanyAnalytics() {
  const { companyId } = useParams<{ companyId: string }>();
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!companyId) return;
    let active = true;

    const load = async () => {
      try {
        const response = await apiClient.get(
          `/admin/whatsapp/companies/${companyId}/summary`,
        );
        if (active) {
          setCompanyName(response.data.data?.company?.name);
        }
      } catch (error) {
        console.error("Error loading company name for WhatsApp analytics:", error);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [companyId]);

  if (!companyId) return null;

  return (
    <WhatsAppAnalytics
      companyId={companyId}
      companyName={companyName}
      superAdminMode
    />
  );
}
