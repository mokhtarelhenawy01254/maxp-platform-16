/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../../services/apiClient";
import { ShippingCompany, CourierMode } from "./shippingCardTypes";

export function useShippingCompanies() {
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [courierMode, setCourierMode] = useState<CourierMode>("manual");
  const [isManualCourier, setIsManualCourier] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        let activeOnes: ShippingCompany[] = [];
        try {
          const res: any = await apiClient.get("/shipping-companies/active-carriers");
          if (res.data?.success && Array.isArray(res.data.data)) {
            activeOnes = res.data.data;
          }
        } catch {
          const fallbackRes: any = await apiClient.get("/shipping-companies?status=active&all=true");
          if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.data)) {
            activeOnes = fallbackRes.data.data.filter((c: ShippingCompany) => c.isActive);
          }
        }

        if (cancelled) return;
        setCompanies(activeOnes);

        if (activeOnes.length > 0) {
          setSelectedCompanyId(activeOnes[0].id);
          const hasTurbo = activeOnes.some(
            (c) => c.providerKey === "TURBO" || c.slug === "turbo" || c.name?.toLowerCase().includes("turbo") || c.name?.includes("تربو")
          );
          const hasQp = activeOnes.some(
            (c) => c.providerKey === "QP_EXPRESS" || c.name?.toLowerCase().includes("qp") || c.name?.includes("كيو بي")
          );
          const hasBosta = activeOnes.some(
            (c) => c.providerKey === "BOSTA" || c.name?.toLowerCase().includes("bosta") || c.name?.includes("بوستا")
          );

          if (hasTurbo) {
            setCourierMode("turbo");
            setIsManualCourier(false);
          } else if (hasQp) {
            setCourierMode("qp");
            setIsManualCourier(false);
          } else if (hasBosta) {
            setCourierMode("bosta");
            setIsManualCourier(false);
          } else {
            setCourierMode("custom");
            setIsManualCourier(false);
          }
        } else {
          setCourierMode("manual");
          setIsManualCourier(true);
        }
      } catch (err) {
        console.error("Error fetching shipping companies:", err);
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    };
    fetchCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  const qpCompany = useMemo(
    () => companies.find(
      (c) => c.providerKey === "QP_EXPRESS" || c.name?.toLowerCase().includes("qp") || c.name?.includes("كيو بي")
    ),
    [companies]
  );

  const bostaCompany = useMemo(
    () => companies.find(
      (c) => c.providerKey === "BOSTA" || c.name?.toLowerCase().includes("bosta") || c.name?.includes("بوستا")
    ),
    [companies]
  );

  const turboCompany = useMemo(
    () => companies.find(
      (c) => c.providerKey === "TURBO" || c.slug === "turbo" || c.name?.toLowerCase().includes("turbo") || c.name?.includes("تربو")
    ),
    [companies]
  );

  const customCompanies = useMemo(
    () => companies.filter(
      (c) => c !== qpCompany && c !== bostaCompany && c !== turboCompany
    ),
    [companies, qpCompany, bostaCompany, turboCompany]
  );

  const qpSettings = useMemo(() => {
    if (!qpCompany?.settings) return {};
    if (typeof qpCompany.settings === "object") return qpCompany.settings;
    try {
      return JSON.parse(qpCompany.settings);
    } catch {
      return {};
    }
  }, [qpCompany?.settings]);

  return {
    companies,
    loadingCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    courierMode,
    setCourierMode,
    isManualCourier,
    setIsManualCourier,
    qpCompany,
    bostaCompany,
    turboCompany,
    customCompanies,
    qpSettings,
  };
}
