import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { envConfig } from "../../../config/environment";
import {
  ShippingCompany,
  ShippingCompanyFormData,
  TestedProfile,
  parseSettings,
} from "../types";

const INITIAL_FORM_DATA: ShippingCompanyFormData = {
  name: "",
  slug: "",
  phone: "",
  email: "",
  website: "",
  apiKey: "",
  apiUrl: "",
  providerKey: "MANUAL",
  integrationMode: "MANUAL",
  autoCreateShipments: false,
  isActive: true,
  username: "",
  password: "",
  customerId: "",
  defaultNotes: "",
  pickupAddress: "",
  mainClientCode: "",
  senderNumber: "",
};

export const useShippingCompaniesData = () => {
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Modal & Drawer State
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testedProfile, setTestedProfile] = useState<TestedProfile | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modeFilter, setModeFilter] = useState<string>("ALL");

  const [formData, setFormData] = useState<ShippingCompanyFormData>(INITIAL_FORM_DATA);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { all: "true" };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (modeFilter !== "ALL") params.integrationMode = modeFilter;

      const res = await apiClient.get("/shipping-companies", { params });
      if (res.data?.success) {
        setCompanies(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load shipping companies:", err);
      toast.error("تعذر تحميل قائمة شركات الشحن");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modeFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggleActive = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(company.id);
    try {
      const res: any = await apiClient.patch(`/shipping-companies/${company.id}/toggle`, {
        isActive: !company.isActive,
      });
      if (res.data?.success) {
        toast.success(
          company.isActive ? `تم إيقاف ${company.name}` : `تم تفعيل ${company.name} للعمل`
        );
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء تغيير الحالة");
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (companyId?: string) => {
    const targetId = companyId || editingCompany?.id;
    if (!targetId) return;

    setTestingConnection(true);
    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        apiKey: formData.apiKey,
        apiUrl: formData.apiUrl,
      };
      const res: any = await apiClient.post(`/shipping-companies/${targetId}/test-connection`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || "الاتصال ناجح ومكتمل");
        if (res.data.data) {
          setTestedProfile(res.data.data);
          if (res.data.data.customerId) {
            setFormData((prev) => ({
              ...prev,
              customerId: String(res.data.data.customerId),
              pickupAddress: prev.pickupAddress || res.data.data.address || "",
            }));
          }
        }
        fetchCompanies();
      } else {
        toast.error(res.data?.error || "فشل الاتصال بشركة الشحن");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر فحص الاتصال");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenSettings = (company: ShippingCompany, autoActivate = false) => {
    const settings = parseSettings(company.settings) as any;
    setEditingCompany(company);
    setShowAdvanced(false);
    setTestedProfile(null);
    setFormData({
      name: company.name,
      slug: company.slug || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      apiKey: company.apiKey || settings.apiKey || "",
      apiUrl: company.apiUrl || (company.providerKey === "QP_EXPRESS" ? "https://qpxpress.com:8001" : company.providerKey === "BOSTA" ? "https://app.bosta.co" : ""),
      providerKey: company.providerKey || "MANUAL",
      integrationMode: company.integrationMode || "MANUAL",
      autoCreateShipments: Boolean(settings.autoCreateShipments),
      isActive: autoActivate ? true : company.isActive,
      username: settings.username || "",
      password: settings.password || "",
      customerId: settings.customerId ? String(settings.customerId) : "",
      defaultNotes: settings.defaultNotes || "",
      pickupAddress: settings.pickupAddress || "",
      mainClientCode: settings.mainClientCode ? String(settings.mainClientCode) : "",
      senderNumber: settings.senderNumber || "",
    });
    setShowModal(true);
  };

  const handleOpenNewModal = () => {
    setEditingCompany(null);
    setShowAdvanced(false);
    setTestedProfile(null);
    setFormData(INITIAL_FORM_DATA);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `/shipping-companies${editingCompany ? `/${editingCompany.id}` : ""}`;
      const method = editingCompany ? "put" : "post";

      const settingsPayload = {
        autoCreateShipments: formData.autoCreateShipments,
        username: formData.username || undefined,
        password: formData.password || undefined,
        customerId: formData.customerId ? Number(formData.customerId) : undefined,
        defaultNotes: formData.defaultNotes || undefined,
        pickupAddress: formData.pickupAddress || undefined,
        mainClientCode: formData.mainClientCode || undefined,
        senderNumber: formData.senderNumber || undefined,
        apiKey: formData.apiKey || undefined,
      };

      const resolvedIntegrationMode =
        (formData.providerKey === "QP_EXPRESS" && (formData.username || formData.password))
          ? "LIVE"
          : (formData.providerKey === "BOSTA" && formData.apiKey)
          ? "LIVE"
          : (formData.providerKey === "TURBO" && formData.apiKey)
          ? "LIVE"
          : formData.integrationMode;

      const payload = {
        ...formData,
        integrationMode: resolvedIntegrationMode,
        settings: JSON.stringify(settingsPayload),
      };

      const res = await (apiClient as any)[method](url, payload);
      if (res.data?.success) {
        toast.success(
          editingCompany
            ? "تم حفظ إعدادات الربط بنجاح"
            : "تمت إضافة شركة الشحن بنجاح"
        );
        setShowModal(false);
        fetchCompanies();
      } else {
        toast.error(res.data?.error || "تعذر حفظ إعدادات الشركة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف شركة الشحن "${company.name}"؟`)) {
      try {
        const res: any = await apiClient.delete(`/shipping-companies/${company.id}`);
        if (res.data?.success) {
          toast.success("تم حذف شركة الشحن بنجاح");
          fetchCompanies();
        } else {
          toast.error(res.data?.error || "فشل الحذف");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "تعذر الحذف");
      }
    }
  };

  const displayedCompanies = useMemo(() => {
    const seenStandardKeys = new Set<string>();
    const result: ShippingCompany[] = [];

    const priorityWeight = (item: ShippingCompany) => {
      if (item.providerKey === "QP_EXPRESS") return 1;
      if (item.providerKey === "BOSTA") return 2;
      if (item.providerKey === "TURBO") return 3;
      return 10;
    };

    const sorted = [...companies].sort((a, b) => {
      const diff = priorityWeight(a) - priorityWeight(b);
      if (diff !== 0) return diff;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    for (const c of sorted) {
      if (c.providerKey && ["QP_EXPRESS", "BOSTA", "TURBO"].includes(c.providerKey)) {
        if (seenStandardKeys.has(c.providerKey)) continue;
        seenStandardKeys.add(c.providerKey);
      }
      result.push(c);
    }

    return result;
  }, [companies]);

  const copyWebhookUrl = () => {
    const webhookUrl = `${envConfig.backendUrl}/api/v1/shipments/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("تم نسخ رابط الـ Webhook");
  };

  const stats = useMemo(() => {
    const total = displayedCompanies.length;
    const active = displayedCompanies.filter((c) => c.isActive).length;
    const live = displayedCompanies.filter((c) => c.integrationMode === "LIVE").length;
    const manual = displayedCompanies.filter((c) => c.integrationMode === "MANUAL" || !c.integrationMode).length;
    return { total, active, live, manual };
  }, [displayedCompanies]);

  return {
    companies,
    displayedCompanies,
    loading,
    viewMode,
    setViewMode,
    togglingId,
    testingConnection,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    showModal,
    setShowModal,
    editingCompany,
    showAdvanced,
    setShowAdvanced,
    testedProfile,
    formData,
    setFormData,
    stats,
    fetchCompanies,
    handleToggleActive,
    handleTestConnection,
    handleOpenSettings,
    handleOpenNewModal,
    handleSubmit,
    handleDelete,
    copyWebhookUrl,
  };
};
