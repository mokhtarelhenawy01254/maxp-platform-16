import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { DEFAULT_CURRENCY } from "../../../utils/currency";
import { getApiUrl, envConfig } from "../../../config/environment";
import { getBaseDomain, isLocalLikeDomain } from "../../../utils/storeUrl";
import i18n from "../../../i18n";
import { useSidebarSettings } from "../../../contexts/SidebarSettingsContext";
import { useDateFormat } from "../../../hooks/useDateFormat";
import {
  CompanyRecord,
  CompanyTab,
  CompanyUser,
  SidebarLayout,
  UsageStat,
  getAccessToken,
  normalizeSidebarLayout,
  parseCompanySettings,
} from "./types";

export function useCompanySettingsController() {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [usage, setUsage] = useState<Record<string, UsageStat>>({});
  const [loading, setLoading] = useState(true);

  const [selectedCurrency, setSelectedCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Live Time Preview
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sidebar Layout
  const [sidebarLayout, setSidebarLayout] = useState<SidebarLayout>("three-tier");
  const [savingLayout, setSavingLayout] = useState(false);
  const sidebarCtx = useSidebarSettings();

  // Logo upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Date format hook
  const {
    dateFormat,
    setDateFormat,
    isLoading: dateFormatLoading,
    error: dateFormatError,
    formatDate,
  } = useDateFormat();

  // Company name editing states
  const [editingName, setEditingName] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Description editing states
  const [editingDescription, setEditingDescription] = useState(false);
  const [companyDescription, setCompanyDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  // Slug states
  const [slug, setSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);

  // Custom domain states
  const [customDomain, setCustomDomain] = useState("");
  const [editingDomain, setEditingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDNS, setVerifyingDNS] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<CompanyTab>("general");

  // Business specialty & Inbox profile states
  const [inboxVerticalProfile, setInboxVerticalProfile] = useState<string>("auto");
  const [savingInboxProfile, setSavingInboxProfile] = useState(false);
  const [businessSpecialtyId, setBusinessSpecialtyId] = useState<string>("");
  const [savingSpecialty, setSavingSpecialty] = useState(false);

  // Ownership Transfer State
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  // Customer register URL calculation
  const customerRegisterUrl = (() => {
    const companyId = user?.companyId;
    if (!companyId) return null;
    let origin: string;
    if (customDomain) {
      origin = `https://${customDomain}`;
    } else if (slug) {
      try {
        const baseDomain = getBaseDomain();
        const protocol = isLocalLikeDomain(baseDomain)
          ? "http:"
          : window.location.protocol;
        origin = `${protocol}//${slug}.${baseDomain}`;
      } catch {
        origin = window.location.origin;
      }
    } else {
      origin = window.location.origin;
    }
    return `${origin}/auth/customer-register?companyId=${encodeURIComponent(companyId)}`;
  })();

  const fetchCompanyData = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user.companyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: CompanyRecord;
      };
      if (data.success && data.data) {
        const parsedCompanySettings = parseCompanySettings(data.data.settings);
        setCompany({ ...data.data, settings: parsedCompanySettings });
        setSelectedCurrency(data.data.currency || DEFAULT_CURRENCY);
        setCompanyName(data.data.name || "");
        setCompanyDescription(
          typeof parsedCompanySettings.description === "string"
            ? parsedCompanySettings.description
            : "",
        );
        setSlug(data.data.slug || "");
        setSidebarLayout(normalizeSidebarLayout(data.data.sidebarLayout));
        setCustomDomain(data.data.customDomain || "");
        const profile = typeof parsedCompanySettings.inboxVerticalProfile === "string"
          ? parsedCompanySettings.inboxVerticalProfile
          : "auto";
        setInboxVerticalProfile(profile);
        setBusinessSpecialtyId(data.data.businessSpecialtyId || data.data.businessSpecialty?.id || "");
        if (data.data.logo) {
          const logoUrl = data.data.logo.startsWith("http")
            ? data.data.logo
            : `${envConfig.backendUrl}${data.data.logo}`;
          setLogoPreview(logoUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
    }
  }, [user?.companyId]);

  const fetchUsage = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user.companyId}/usage`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setUsage(data.data || {});
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  const fetchCompanyUsers = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user.companyId}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = (await response.json()) as {
        success?: boolean;
        data?: { users?: CompanyUser[] };
      };
      if (data.success) {
        const companyUsers = Array.isArray(data.data?.users)
          ? data.data.users
          : [];
        setUsers(companyUsers.filter((u) => u.id !== user?.id));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [user?.companyId, user?.id]);

  useEffect(() => {
    fetchCompanyData();
    fetchUsage();
    if (user?.role === "OWNER") {
      fetchCompanyUsers();
    }
  }, [fetchCompanyData, fetchUsage, fetchCompanyUsers, user?.role]);

  const updateCompany = useCallback(
    (updater: (currentCompany: CompanyRecord) => CompanyRecord) => {
      setCompany((previousCompany) =>
        previousCompany ? updater(previousCompany) : previousCompany,
      );
    },
    [],
  );

  const handleCompanyNameSave = async () => {
    if (!companyName.trim()) {
      alert(i18n.t("companySettings.name_company_0ea7"));
      return;
    }

    try {
      setSavingName(true);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: companyName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        updateCompany((currentCompany) => ({
          ...currentCompany,
          name: companyName.trim(),
        }));
        setEditingName(false);
        alert(i18n.t("companySettings.success_update_name_f3af"));
      } else {
        alert(data.error || "فشل في تحديث اسم الشركة");
      }
    } catch (error) {
      console.error("Error updating company name:", error);
      alert(i18n.t("companySettings.error_error_83b4"));
    } finally {
      setSavingName(false);
    }
  };

  const handleCompanyDescriptionSave = async () => {
    try {
      setSavingDescription(true);
      const token = getAccessToken();
      const normalizedDescription = companyDescription.trim();
      const response = await fetch(`${getApiUrl()}/settings/company`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            description: normalizedDescription,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        updateCompany((currentCompany) => ({
          ...currentCompany,
          settings: {
            ...parseCompanySettings(currentCompany.settings),
            description: normalizedDescription,
          },
        }));
        setCompanyDescription(normalizedDescription);
        setEditingDescription(false);
        alert(i18n.t("companySettings.success_update_description_5c21"));
      } else {
        alert(data.error || data.message || "فشل في تحديث وصف الشركة");
      }
    } catch (error) {
      console.error("Error updating company description:", error);
      alert(i18n.t("companySettings.error_error_9650"));
    } finally {
      setSavingDescription(false);
    }
  };

  const handleSlugSave = async () => {
    if (!slug.trim()) {
      alert(i18n.t("companySettings.msg_fd5b"));
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      alert(i18n.t("companySettings.msg_6c7a"));
      return;
    }

    try {
      setSavingSlug(true);
      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}/slug`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slug: slug.trim() }),
        },
      );

      const data = await response.json();
      if (data.success) {
        updateCompany((currentCompany) => ({
          ...currentCompany,
          slug: slug.trim(),
        }));
        setEditingSlug(false);
        alert(i18n.t("companySettings.success_update_link_a69d"));
        window.location.reload();
      } else {
        alert(
          data.error ||
            data.message ||
            "فشل في تحديث الرابط. قد يكون مستخدماً بالفعل.",
        );
      }
    } catch (error) {
      console.error("Error updating company slug:", error);
      alert(i18n.t("companySettings.error_error_932c"));
    } finally {
      setSavingSlug(false);
    }
  };

  const handleCurrencyChange = async (currencyCode: string) => {
    try {
      setSavingCurrency(true);
      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}/currency`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currency: currencyCode }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setSelectedCurrency(currencyCode);
        updateCompany((currentCompany) => ({
          ...currentCompany,
          currency: currencyCode,
        }));
        alert(i18n.t("companySettings.success_update_3e76"));
      } else {
        alert(data.error || "فشل في تحديث العملة");
      }
    } catch (error) {
      console.error("Error updating currency:", error);
      alert(i18n.t("companySettings.error_error_a004"));
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleLayoutChange = async (layout: SidebarLayout) => {
    try {
      setSavingLayout(true);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sidebarLayout: layout }),
      });

      const data = await response.json();
      if (data.success) {
        setSidebarLayout(layout);
        updateCompany((currentCompany) => ({
          ...currentCompany,
          sidebarLayout: layout,
        }));
        try {
          await sidebarCtx.setUserLayout(null);
        } catch {
          // Non-critical
        }
        if (
          window.confirm(
            "تم تحديث نظام القائمة بنجاح! هل تريد إعادة تحميل الصفحة لتطبيق التغييرات؟",
          )
        ) {
          window.location.reload();
        }
      } else {
        alert(data.error || "فشل في تحديث نظام القائمة");
      }
    } catch (error) {
      console.error("Error updating layout:", error);
      alert(i18n.t("companySettings.error_error_d9e4"));
    } finally {
      setSavingLayout(false);
    }
  };

  const handleCustomDomainSave = async () => {
    if (
      customDomain &&
      !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(
        customDomain,
      )
    ) {
      alert(i18n.t("companySettings.msg_3708"));
      return;
    }

    try {
      setSavingDomain(true);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customDomain: customDomain || null }),
      });

      const data = await response.json();
      if (data.success) {
        updateCompany((currentCompany) => ({
          ...currentCompany,
          customDomain: customDomain || null,
        }));
        setEditingDomain(false);
        alert(i18n.t("companySettings.success_update_9101"));
      } else {
        alert(data.message || data.error || "فشل في تحديث الدومين");
      }
    } catch (error) {
      console.error("Error updating custom domain:", error);
      alert(i18n.t("companySettings.error_error_83ad"));
    } finally {
      setSavingDomain(false);
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timezone: newTimezone }),
      });

      const data = await response.json();
      if (data.success) {
        updateCompany((currentCompany) => ({
          ...currentCompany,
          timezone: newTimezone,
        }));
        alert(i18n.t("companySettings.success_update_ad9b"));
      } else {
        alert(data.error || "فشل في تحديث المنطقة الزمنية");
      }
    } catch (error) {
      console.error("Error updating timezone:", error);
      alert(i18n.t("companySettings.error_error_0376"));
    }
  };

  const handleInboxProfileChange = async (profile: string) => {
    try {
      setSavingInboxProfile(true);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            inboxVerticalProfile: profile === "auto" ? null : profile,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setInboxVerticalProfile(profile);
        updateCompany((currentCompany) => {
          const prevSettings = parseCompanySettings(currentCompany?.settings);
          return {
            ...currentCompany,
            settings: {
              ...prevSettings,
              inboxVerticalProfile: profile === "auto" ? null : profile,
            },
          };
        });
      } else {
        alert(data.error || data.message || "فشل في تحديث إعداد واجهة المحادثات");
      }
    } catch (error) {
      console.error("Error updating inbox vertical profile:", error);
      alert("حدث خطأ أثناء تحديث إعداد واجهة المحادثات");
    } finally {
      setSavingInboxProfile(false);
    }
  };

  const handleSpecialtyChange = async (specialtyId: string) => {
    try {
      setSavingSpecialty(true);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/companies/${user?.companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessSpecialtyId: specialtyId || "none",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBusinessSpecialtyId(specialtyId);
        updateCompany((currentCompany) => ({
          ...currentCompany,
          businessSpecialtyId: specialtyId || null,
        }));
      } else {
        alert(data.error || data.message || "فشل في تحديث تخصص الشركة");
      }
    } catch (error) {
      console.error("Error updating business specialty:", error);
      alert("حدث خطأ أثناء تحديث تخصص الشركة");
    } finally {
      setSavingSpecialty(false);
    }
  };

  const handleVerifyDNS = async () => {
    if (!company?.id) return;

    try {
      setVerifyingDNS(true);
      setDnsStatus(null);
      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}/verify-dns`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      setDnsStatus({
        success: data.success,
        message: data.message,
      });
    } catch (error) {
      console.error("Error verifying DNS:", error);
      setDnsStatus({
        success: false,
        message: "حدث خطأ أثناء الاتصال بالسيرفر للتحقق من DNS",
      });
    } finally {
      setVerifyingDNS(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(i18n.t("companySettings.msg_ce27"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(i18n.t("companySettings.msg_9311"));
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("logo", file);

      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}/logo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();
      if (data.success) {
        const logoUrl = data.data.logo.startsWith("http")
          ? data.data.logo
          : `${envConfig.backendUrl}${data.data.logo}`;
        setLogoPreview(logoUrl);
        updateCompany((currentCompany) => ({
          ...currentCompany,
          logo: data.data.logo,
        }));
        alert(i18n.t("companySettings.msg_d9fc"));
      } else {
        alert(data.error || "فشل في رفع اللوجو");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert(i18n.t("companySettings.error_error_bf55"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;

    try {
      setTransferring(true);
      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}/transfer-ownership`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetUserId: selectedNewOwner }),
        },
      );

      const data = await response.json();
      if (data.success) {
        alert("تم نقل الملكية بنجاح! سيتم إعادة تحميل الصفحة لتحديث الصلاحيات.");
        window.location.reload();
      } else {
        alert(data.message || "فشل نقل الملكية");
      }
    } catch (error) {
      console.error("Error transferring ownership:", error);
      alert(i18n.t("companySettings.error_error_8fc3"));
    } finally {
      setTransferring(false);
      setShowTransferConfirm(false);
    }
  };

  return {
    user,
    company,
    usage,
    loading,
    selectedCurrency,
    savingCurrency,
    currentTime,
    sidebarLayout,
    savingLayout,
    uploadingLogo,
    logoPreview,
    dateFormat,
    setDateFormat,
    dateFormatLoading,
    dateFormatError,
    formatDate,
    editingName,
    setEditingName,
    companyName,
    setCompanyName,
    savingName,
    editingDescription,
    setEditingDescription,
    companyDescription,
    setCompanyDescription,
    savingDescription,
    slug,
    setSlug,
    editingSlug,
    setEditingSlug,
    savingSlug,
    customDomain,
    setCustomDomain,
    editingDomain,
    setEditingDomain,
    savingDomain,
    verifyingDNS,
    dnsStatus,
    activeTab,
    setActiveTab,
    customerRegisterUrl,
    users,
    selectedNewOwner,
    setSelectedNewOwner,
    transferring,
    showTransferConfirm,
    setShowTransferConfirm,
    handleCompanyNameSave,
    handleCompanyDescriptionSave,
    handleSlugSave,
    handleCurrencyChange,
    handleLayoutChange,
    handleCustomDomainSave,
    handleTimezoneChange,
    handleVerifyDNS,
    handleLogoUpload,
    handleTransferOwnership,
    inboxVerticalProfile,
    savingInboxProfile,
    handleInboxProfileChange,
    businessSpecialtyId,
    savingSpecialty,
    handleSpecialtyChange,
  };
}

export type CompanySettingsController = ReturnType<typeof useCompanySettingsController>;
