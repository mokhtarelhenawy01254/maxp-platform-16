import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  KeyRound,
  ShieldCheck,
  UserRound,
  Save,
  Loader2,
  Lock,
  CheckCircle2,
  RotateCw
} from "lucide-react";

import { apiClient } from "../../services/apiClient";
import { useCustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export default function CustomerProfilePage() {
  const { data, loading, error, reload } = useCustomerLoyaltySummary();

  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (data?.customer?.address) setAddress(data.customer.address);
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RotateCw className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-mono">جاري تحميل بيانات الحساب...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error || "تعذر تحميل بيانات الملف الشخصي"}</span>
        </div>
      </div>
    );
  }

  const fullName = `${data.customer.firstName} ${data.customer.lastName}`.trim();

  const saveAddress = async () => {
    setSavingAddress(true);
    setAddressMsg(null);
    try {
      await apiClient.put("/public/customers/profile", { address });
      setAddressMsg({ ok: true, text: "تم تحديث وحفظ العنوان بنجاح" });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setAddressMsg({ ok: false, text: e.response?.data?.message || "فشل حفظ العنوان" });
    } finally {
      setSavingAddress(false);
    }
  };

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordMsg(null);
    if (newPassword.length < 4) {
      setPasswordMsg({ ok: false, text: "كلمة المرور يجب ألا تقل عن 4 أحرف" });
      setSavingPassword(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "كلمتا المرور غير متطابقتين" });
      setSavingPassword(false);
      return;
    }
    try {
      await apiClient.put("/public/customers/password", {
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setPasswordMsg({ ok: true, text: "تم تحديث كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      void reload();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setPasswordMsg({ ok: false, text: e.response?.data?.message || "فشل حفظ كلمة المرور" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      {/* 1. Header Card Chassis */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>الملف الشخصي والبيانات</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">بياناتي الشخصية</h1>
            <p className="text-xs text-muted-foreground">
              المعلومات المسجلة لحسابك لدى {data.company?.nameAr || data.company?.name || "المتجر"}.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Customer Credentials Info */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-border/60 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <UserRound className="h-6 w-6" />
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-foreground">
              {fullName || "عميل"}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              عضو منذ {formatDate(data.customer.joinedAt)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>رقم الهاتف</span>
            </div>
            <span className="font-mono text-xs font-medium tabular-nums text-foreground" dir="ltr">
              {data.customer.phone || "—"}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>البريد الإلكتروني</span>
            </div>
            <span className="font-mono text-xs font-medium text-foreground" dir="ltr">
              {data.customer.email || "—"}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3.5 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>تاريخ الانضمام الرسمي</span>
            </div>
            <span className="text-xs font-medium text-foreground">
              {formatDate(data.customer.joinedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Detailed Shipping Address */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="text-right">
            <h2 className="text-sm font-semibold text-foreground">عنوان الشحن والتوصيل</h2>
            <p className="text-xs text-muted-foreground">العنوان المعتمد لتسليم الطلبيات والشحنات</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="مثال: شارع 9، المعادي، القاهرة — بجوار محطة المترو"
            className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {addressMsg && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
                addressMsg.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {addressMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{addressMsg.text}</span>
            </div>
          )}
          <button
            onClick={saveAddress}
            disabled={savingAddress}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {savingAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>حفظ العنوان</span>
          </button>
        </div>
      </div>

      {/* 4. Password Security Settings */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-500">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="text-right">
            <h2 className="text-sm font-semibold text-foreground">أمان كلمة المرور</h2>
            <p className="text-xs text-muted-foreground">تسجيل الدخول برقم الهاتف وكلمة المرور</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>كلمة المرور الحالية (إن وجدت)</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {passwordMsg && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
                passwordMsg.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {passwordMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div>
            <button
              onClick={savePassword}
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>تحديث كلمة المرور</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
