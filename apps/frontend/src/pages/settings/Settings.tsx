import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Cog6ToothIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { getApiUrl } from "../../config/environment";
import { useAuth } from "../../hooks/useAuthSimple";
import tokenManager from "../../utils/tokenManager";
import CustomDomainPage from "./CustomDomainPage";
import SidebarSettings from "./SidebarSettings";
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

  const tabs: SettingsTab[] = [
    { id: "profile", name: "الملف الشخصي", component: ProfileSettings },
    { id: "custom-domain", name: "الدومين المخصص", component: CustomDomainPage },
    { id: "store", name: "إعدادات المتجر", component: StoreSettingsRedirect },
    { id: "security", name: "الأمان", component: SecuritySettings },
    { id: "sidebar", name: "القائمة الجانبية", component: SidebarSettings },
  ];

  const validTabIds = tabs.map((item) => item.id);

  useEffect(() => {
    if (tab === "billing") {
      navigate("/marketplace", { replace: true });
      return;
    }

    if (!tab || !validTabIds.includes(tab)) {
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
            الإعدادات
          </h1>
          <p className="mt-2 text-muted-foreground">
            إدارة إعدادات الحساب والنظام من مكان واحد.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/marketplace")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <CreditCardIcon className="h-5 w-5" />
          إدارة الاشتراك والفواتير
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-card">
        <ActiveComponent />
      </div>
    </div>
  );
};

const ProfileSettings: React.FC = () => {
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
          message: payload?.message || "فشل في حفظ البيانات.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "تم حفظ الملف الشخصي بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "حدث خطأ أثناء حفظ الإعدادات.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <SectionHeader
        title="الملف الشخصي"
        description="حدّث بياناتك الأساسية التي تظهر على الحساب."
      />

      {feedback && (
        <Alert variant={feedback.type === "success" ? "default" : "destructive"}>
          <AlertTitle>{feedback.type === "success" ? "تم بنجاح" : "خطأ"}</AlertTitle>
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
              <Label htmlFor="profile-first-name">الاسم الأول</Label>
              <Input id="profile-first-name" name="firstName" type="text" autoComplete="given-name" value={formData.firstName} onChange={handleFieldChange("firstName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-last-name">الاسم الأخير</Label>
              <Input id="profile-last-name" name="lastName" type="text" autoComplete="family-name" value={formData.lastName} onChange={handleFieldChange("lastName")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">البريد الإلكتروني</Label>
              <Input id="profile-email" name="email" type="email" autoComplete="email" value={formData.email} disabled />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-phone">رقم الهاتف</Label>
              <Input id="profile-phone" name="phone" type="tel" autoComplete="tel" value={formData.phone} onChange={handleFieldChange("phone")} placeholder="+201234567890" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-timezone">المنطقة الزمنية</Label>
              <Select value={formData.timezone} onValueChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}>
                <SelectTrigger id="profile-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Cairo">القاهرة (GMT+2)</SelectItem>
                  <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
                  <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-language">اللغة</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}>
                <SelectTrigger id="profile-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

const SecuritySettings: React.FC = () => {
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
      errors.push("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("أضف حرفًا كبيرًا واحدًا على الأقل.");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("أضف حرفًا صغيرًا واحدًا على الأقل.");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("أضف رقمًا واحدًا على الأقل.");
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setFeedback({
        type: "error",
        message: "كلمتا المرور الجديدتان غير متطابقتين.",
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
          message: payload?.message || "فشل في تغيير كلمة المرور.",
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
        message: "تم تحديث كلمة المرور بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "حدث خطأ أثناء تغيير كلمة المرور.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const passwordChecks = [
    { label: "6 أحرف على الأقل", passed: formData.newPassword.length >= 6 },
    { label: "حرف كبير واحد على الأقل", passed: /[A-Z]/.test(formData.newPassword) },
    { label: "حرف صغير واحد على الأقل", passed: /[a-z]/.test(formData.newPassword) },
    { label: "رقم واحد على الأقل", passed: /[0-9]/.test(formData.newPassword) },
  ];

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <SectionHeader
        title="الأمان"
        description="غيّر كلمة المرور وراجع معايير الأمان الأساسية."
      />

      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 size-5 text-muted-foreground" />
          <p className="text-sm text-foreground">
            استخدم كلمة مرور قوية وفريدة لحسابك، وغيّرها دوريًا لحماية بيانات الشركة.
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === "success" ? "default" : "destructive"}>
          <AlertTitle>{feedback.type === "success" ? "تم بنجاح" : "خطأ"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="security-current-password">كلمة المرور الحالية</Label>
          <Input id="security-current-password" name="currentPassword" type="password" autoComplete="current-password" value={formData.currentPassword} onChange={updateField("currentPassword")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="security-new-password">كلمة المرور الجديدة</Label>
          <Input id="security-new-password" name="newPassword" type="password" autoComplete="new-password" value={formData.newPassword} onChange={updateField("newPassword")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="security-confirm-password">تأكيد كلمة المرور الجديدة</Label>
          <Input id="security-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={updateField("confirmPassword")} />
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">متطلبات كلمة المرور</p>
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
            {isSaving ? "جاري التحديث..." : "تحديث كلمة المرور"}
          </Button>
        </div>
      </form>
    </div>
  );
};


const StoreSettingsRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings/store", { replace: true });
  }, [navigate]);

  return (
    <div className="px-6 py-10">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          جاري التحويل إلى إعدادات المتجر...
        </p>
      </div>
    </div>
  );
};

export default Settings;
