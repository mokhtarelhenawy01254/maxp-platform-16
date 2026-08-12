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
  CreditCard,
  Save,
  Loader2,
  Lock,
} from "lucide-react";

import { apiClient } from "../../services/apiClient";
import { useCustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = "EGP") =>
  `${value.toFixed(2)} ${currency}`;

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

  // ── العنوان بالتفصيل ──
  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── كلمة المرور ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // تعبئة العنوان من بيانات العميل لما تحمّل
  useEffect(() => {
    if (data?.customer?.address) setAddress(data.customer.address);
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4">جاري تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error || "تعذر تحميل بياناتك"}</span>
        </div>
      </div>
    );
  }

  const currency = data.wallet?.currency || data.company?.currency || "EGP";
  const fullName = `${data.customer.firstName} ${data.customer.lastName}`.trim();

  const saveAddress = async () => {
    setSavingAddress(true);
    setAddressMsg(null);
    try {
      await apiClient.put("/public/customers/profile", { address });
      setAddressMsg({ ok: true, text: "تم حفظ العنوان بنجاح" });
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
      setPasswordMsg({ ok: true, text: "تم حفظ كلمة المرور بنجاح" });
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
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 p-8 text-white shadow-xl">
        <div className="text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <ShieldCheck size={14} />
            بياناتي
          </div>
          <h1 className="mt-4 text-3xl font-black">بياناتي الشخصية</h1>
          <p className="mt-2 text-sm leading-7 text-white/85">
            المعلومات المسجلة عنك في متجر{" "}
            {data.company?.nameAr || data.company?.name || "المتجر"}.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-gray-700">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <UserRound size={30} />
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {fullName || "عميل"}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              عميل منذ {formatDate(data.customer.joinedAt)}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Phone size={16} />
              <span>رقم الهاتف</span>
            </div>
            <span
              className="font-bold text-gray-900 dark:text-white"
              dir="ltr"
            >
              {data.customer.phone || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Mail size={16} />
              <span>البريد الإلكتروني</span>
            </div>
            <span
              className="font-bold text-gray-900 dark:text-white"
              dir="ltr"
            >
              {data.customer.email || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <CalendarDays size={16} />
              <span>تاريخ الانضمام</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              {formatDate(data.customer.joinedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* العنوان بالتفصيل */}
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
            <MapPin size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900 dark:text-white">العنوان بالتفصيل</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              عنوانك للشحن والتوصيل
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="مثال: شارع 9، حي المعادي، القاهرة — بجوار محطة المترو"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          {addressMsg && (
            <div
              className={`rounded-xl px-4 py-2 text-sm ${
                addressMsg.ok
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {addressMsg.text}
            </div>
          )}
          <button
            onClick={saveAddress}
            disabled={savingAddress}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {savingAddress ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ العنوان
          </button>
        </div>
      </div>

      {/* إدارة كلمة المرور */}
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
            <KeyRound size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900 dark:text-white">كلمة المرور</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              سجّل الدخول برقم الموبايل + كلمة مرور بدل دخول الموبايل فقط
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Lock size={12} /> كلمة المرور الحالية (لو عندك واحدة)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
          {passwordMsg && (
            <div
              className={`rounded-xl px-4 py-2 text-sm ${
                passwordMsg.ok
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {passwordMsg.text}
            </div>
          )}
          <button
            onClick={savePassword}
            disabled={savingPassword}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ كلمة المرور
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300">
            <CreditCard size={18} />
          </div>
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            رصيد المحفظة
          </div>
          <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">
            {formatMoney(toNumber(data.wallet?.balance), currency)}
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
            <UserRound size={18} />
          </div>
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            نقاطي
          </div>
          <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">
            {data.loyalty.points.current.toLocaleString("ar-EG")} نقطة
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CreditCard size={18} />
          </div>
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            إجمالي الكاش باك
          </div>
          <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">
            {formatMoney(toNumber(data.wallet?.totalCashback), currency)}
          </div>
        </div>
      </div>
    </div>
  );
}
