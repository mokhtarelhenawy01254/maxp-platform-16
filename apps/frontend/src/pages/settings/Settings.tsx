import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { getApiUrl } from "../../config/environment";
import { useAuth } from "../../hooks/useAuthSimple";
import tokenManager from "../../utils/tokenManager";
import CustomDomainPage from "./CustomDomainPage";
import SidebarSettings from "./SidebarSettings";
import AuthorizedDevicesTab from "./AuthorizedDevicesTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface SettingsTab {
  id: string;
  name: string;
  component: React.ComponentType;
}

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const DEFAULT_TAB = "profile";

const SectionHeader: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div className="border-b border-border pb-4 mb-6">
    <h2 className="text-xl font-semibold text-foreground">
      {title}
    </h2>
    <p className="mt-1 text-sm text-muted-foreground">
      {description}
    </p>
  </div>
);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { t } = useTranslation();

  const tabs: SettingsTab[] = [
    { id: "profile", name: t("settings.tabProfile"), component: ProfileSettings },
    { id: "custom-domain", name: t("settings.tabCustomDomain"), component: CustomDomainPage },
    { id: "store", name: t("settings.tabStore"), component: StoreSettingsRedirect },
    { id: "security", name: t("settings.tabSecurity"), component: SecuritySettings },
    { id: "devices", name: "الأجهزة المعتمدة", component: AuthorizedDevicesTab },
    { id: "sidebar", name: t("settings.tabSidebar"), component: SidebarSettings },

  ];

  const validTabIds = tabs.map((item) => item.id);

  useEffect(() => {
    if (tab === "billing") {
      navigate("/marketplace", { replace: true });
      return;
    }

    if (tab && !validTabIds.includes(tab)) {
      navigate(`/settings/${DEFAULT_TAB}`, { replace: true });
    }
  }, [navigate, tab, validTabIds]);

  const activeTab = tab && validTabIds.includes(tab) ? tab : DEFAULT_TAB;
  const activeTabConfig =
    tabs.find((item) => item.id === activeTab) ?? tabs[0]!;
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold text-foreground">
            <Cog6ToothIcon className="mr-3 h-8 w-8 text-primary" />
            {t("settings.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("settings.pageDescription")}
          </p>
        </div>

      </div>

      {/* MOB-015: the big settings card is desktop-only — on mobile the tab
          content renders flat (depth-1 rule: no box-in-box under 768px). */}
      <div className="md:rounded-3xl md:border md:border-border md:bg-card">
        <ActiveComponent />
      </div>
    </div>
  );
};

const ProfileSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    timezone: "Africa/Cairo",
    language: "ar",
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiUrl()}/hr/employees/me`, {
          headers: getAuthHeaders(),
        });
        const payload = await res.json();
        if (!cancelled && payload?.success && payload?.employee) {
          const e = payload.employee;
          setFormData({
            firstName: e.firstName || "",
            lastName: e.lastName || "",
            email: e.email || "",
            phone: e.phone || "",
            timezone: e.timezone || "Africa/Cairo",
            language: "ar",
          });
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFieldChange =
    (field: keyof ProfileFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch(`${getApiUrl()}/hr/employees/me`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          timezone: formData.timezone,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setFeedback({
          type: "error",
          message: payload?.message || t("settings.errorSaveFailed"),
        });
        return;
      }

      setFeedback({
        type: "success",
        message: t("settings.successProfileSaved"),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: t("settings.errorSaveSettings"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <SectionHeader
        title={t("settings.profileSectionTitle")}
        description={t("settings.profileSectionDescription")}
      />

      {feedback && (
        <Alert variant={feedback.type === "success" ? "default" : "destructive"}>
          <AlertTitle>{feedback.type === "success" ? t("common.success") : t("common.error")}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-first-name">{t("settings.firstName")}</Label>
              <Input
                id="profile-first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                inputMode="text"
                value={formData.firstName}
                onChange={handleFieldChange("firstName")}
                dir="auto"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-last-name">{t("settings.lastName")}</Label>
              <Input
                id="profile-last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                inputMode="text"
                value={formData.lastName}
                onChange={handleFieldChange("lastName")}
                dir="auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">{t("common.email")}</Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={formData.email}
                onChange={handleFieldChange("email")}
                dir="ltr"
                disabled
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-phone">{t("common.phone")}</Label>
              <Input
                id="profile-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleFieldChange("phone")}
                placeholder="+20 1XX XXX XXXX"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-timezone">{t("settings.timezone")}</Label>
              <Select value={formData.timezone} onValueChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}>
                <SelectTrigger id="profile-timezone">
                  <SelectValue>
                    {formData.timezone === "Africa/Cairo"
                      ? t("settings.cairo")
                      : formData.timezone === "Asia/Riyadh"
                        ? t("settings.riyadh")
                        : formData.timezone === "Asia/Dubai"
                          ? t("settings.dubai")
                          : formData.timezone}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Cairo">{t("settings.cairo")}</SelectItem>
                  <SelectItem value="Asia/Riyadh">{t("settings.riyadh")}</SelectItem>
                  <SelectItem value="Asia/Dubai">{t("settings.dubai")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-language">{t("settings.language")}</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}>
                <SelectTrigger id="profile-language">
                  <SelectValue>
                    {formData.language === "ar"
                      ? t("settings.arabic")
                      : formData.language === "en"
                        ? "English"
                        : formData.language}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{t("settings.arabic")}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

const SecuritySettings: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const updateField =
    (field: keyof typeof formData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const validatePassword = (password: string) => {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push(t("settings.validationMinLength"));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t("settings.validationUppercase"));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t("settings.validationLowercase"));
    }
    if (!/[0-9]/.test(password)) {
      errors.push(t("settings.validationDigit"));
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setFeedback({
        type: "error",
        message: t("settings.validationPasswordMismatch"),
      });
      return;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setFeedback({
        type: "error",
        message: passwordErrors.join(" "),
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${getApiUrl()}/auth/change-password`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setFeedback({
          type: "error",
          message: payload?.message || t("settings.errorPasswordChangeFailed"),
        });
        return;
      }

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setFeedback({
        type: "success",
        message: t("settings.successPasswordUpdated"),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: t("settings.errorPasswordChange"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const passwordChecks = [
    { label: t("settings.requirementMinLength"), passed: formData.newPassword.length >= 6 },
    { label: t("settings.requirementUppercase"), passed: /[A-Z]/.test(formData.newPassword) },
    { label: t("settings.requirementLowercase"), passed: /[a-z]/.test(formData.newPassword) },
    { label: t("settings.requirementDigit"), passed: /[0-9]/.test(formData.newPassword) },
  ];

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <SectionHeader
        title={t("settings.securitySectionTitle")}
        description={t("settings.securitySectionDescription")}
      />

      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 size-5 text-muted-foreground" />
          <p className="text-sm text-foreground">
            {t("settings.securityTip")}
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === "success" ? "default" : "destructive"}>
          <AlertTitle>{feedback.type === "success" ? t("common.success") : t("common.error")}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="security-current-password">{t("settings.currentPassword")}</Label>
          <Input id="security-current-password" name="currentPassword" type="password" autoComplete="current-password" value={formData.currentPassword} onChange={updateField("currentPassword")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="security-new-password">{t("settings.newPassword")}</Label>
          <Input id="security-new-password" name="newPassword" type="password" autoComplete="new-password" value={formData.newPassword} onChange={updateField("newPassword")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="security-confirm-password">{t("settings.confirmNewPassword")}</Label>
          <Input id="security-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={updateField("confirmPassword")} />
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">{t("settings.passwordRequirements")}</p>
          <div className="flex flex-col gap-2">
            {passwordChecks.map((item) => (
              <div key={item.label} className={cn("flex items-center gap-2 text-sm", item.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                <span className={cn("size-2.5 rounded-full", item.passed ? "bg-green-500" : "bg-muted-foreground/30")} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("settings.updating") : t("settings.updatePassword")}
          </Button>
        </div>
      </form>
    </div>
  );
};


const StoreSettingsRedirect: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings/store", { replace: true });
  }, [navigate]);

  return (
    <div className="px-6 py-10">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          {t("settings.redirecting")}
        </p>
      </div>
    </div>
  );
};

export default Settings;
