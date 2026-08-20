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
} from "lucide-react";

import { apiClient } from "../../services/apiClient";
import { useCustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";

const formatDate = (value?: string | null) => {
  if (!value) return "ΓÇö";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ΓÇö";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export default function CustomerProfilePage() {
  const { data, loading, error, reload } = useCustomerLoyaltySummary();

  // ΓöÇΓöÇ ╪º┘ä╪╣┘å┘ê╪º┘å ╪¿╪º┘ä╪¬┘ü╪╡┘è┘ä ΓöÇΓöÇ
  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ΓöÇΓöÇ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ΓöÇΓöÇ
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ╪¬╪╣╪¿╪ª╪⌐ ╪º┘ä╪╣┘å┘ê╪º┘å ┘à┘å ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä ┘ä┘à╪º ╪¬╪¡┘à┘æ┘ä
  useEffect(() => {
    if (data?.customer?.address) setAddress(data.customer.address);
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4">╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¿┘è╪º┘å╪º╪¬┘â...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error || "╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪¿┘è╪º┘å╪º╪¬┘â"}</span>
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
      setAddressMsg({ ok: true, text: "╪¬┘à ╪¡┘ü╪╕ ╪º┘ä╪╣┘å┘ê╪º┘å ╪¿┘å╪¼╪º╪¡" });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setAddressMsg({ ok: false, text: e.response?.data?.message || "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä╪╣┘å┘ê╪º┘å" });
    } finally {
      setSavingAddress(false);
    }
  };

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordMsg(null);
    if (newPassword.length < 4) {
      setPasswordMsg({ ok: false, text: "┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ┘è╪¼╪¿ ╪ú┘ä╪º ╪¬┘é┘ä ╪╣┘å 4 ╪ú╪¡╪▒┘ü" });
      setSavingPassword(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "┘â┘ä┘à╪¬╪º ╪º┘ä┘à╪▒┘ê╪▒ ╪║┘è╪▒ ┘à╪¬╪╖╪º╪¿┘é╪¬┘è┘å" });
      setSavingPassword(false);
      return;
    }
    try {
      await apiClient.put("/public/customers/password", {
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setPasswordMsg({ ok: true, text: "╪¬┘à ╪¡┘ü╪╕ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪¿┘å╪¼╪º╪¡" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      void reload();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setPasswordMsg({ ok: false, text: e.response?.data?.message || "┘ü╪┤┘ä ╪¡┘ü╪╕ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" });
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
            ╪¿┘è╪º┘å╪º╪¬┘è
          </div>
          <h1 className="mt-4 text-3xl font-black">╪¿┘è╪º┘å╪º╪¬┘è ╪º┘ä╪┤╪«╪╡┘è╪⌐</h1>
          <p className="mt-2 text-sm leading-7 text-white/85">
            ╪º┘ä┘à╪╣┘ä┘ê┘à╪º╪¬ ╪º┘ä┘à╪│╪¼┘ä╪⌐ ╪╣┘å┘â ┘ü┘è ┘à╪¬╪¼╪▒{" "}
            {data.company?.nameAr || data.company?.name || "╪º┘ä┘à╪¬╪¼╪▒"}.
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
              {fullName || "╪╣┘à┘è┘ä"}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ╪╣┘à┘è┘ä ┘à┘å╪░ {formatDate(data.customer.joinedAt)}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Phone size={16} />
              <span>╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü</span>
            </div>
            <span
              className="font-bold text-gray-900 dark:text-white"
              dir="ltr"
            >
              {data.customer.phone || "ΓÇö"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Mail size={16} />
              <span>╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è</span>
            </div>
            <span
              className="font-bold text-gray-900 dark:text-white"
              dir="ltr"
            >
              {data.customer.email || "ΓÇö"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/60">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <CalendarDays size={16} />
              <span>╪¬╪º╪▒┘è╪« ╪º┘ä╪º┘å╪╢┘à╪º┘à</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              {formatDate(data.customer.joinedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ╪º┘ä╪╣┘å┘ê╪º┘å ╪¿╪º┘ä╪¬┘ü╪╡┘è┘ä */}
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
            <MapPin size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900 dark:text-white">╪º┘ä╪╣┘å┘ê╪º┘å ╪¿╪º┘ä╪¬┘ü╪╡┘è┘ä</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ╪╣┘å┘ê╪º┘å┘â ┘ä┘ä╪┤╪¡┘å ┘ê╪º┘ä╪¬┘ê╪╡┘è┘ä
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="┘à╪½╪º┘ä: ╪┤╪º╪▒╪╣ 9╪î ╪¡┘è ╪º┘ä┘à╪╣╪º╪»┘è╪î ╪º┘ä┘é╪º┘ç╪▒╪⌐ ΓÇö ╪¿╪¼┘ê╪º╪▒ ┘à╪¡╪╖╪⌐ ╪º┘ä┘à╪¬╪▒┘ê"
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
            ╪¡┘ü╪╕ ╪º┘ä╪╣┘å┘ê╪º┘å
          </button>
        </div>
      </div>

      {/* ╪Ñ╪»╪º╪▒╪⌐ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ */}
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
            <KeyRound size={20} />
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900 dark:text-white">┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ╪│╪¼┘æ┘ä ╪º┘ä╪»╪«┘ê┘ä ╪¿╪▒┘é┘à ╪º┘ä┘à┘ê╪¿╪º┘è┘ä + ┘â┘ä┘à╪⌐ ┘à╪▒┘ê╪▒ ╪¿╪»┘ä ╪»╪«┘ê┘ä ╪º┘ä┘à┘ê╪¿╪º┘è┘ä ┘ü┘é╪╖
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Lock size={12} /> ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¡╪º┘ä┘è╪⌐ (┘ä┘ê ╪╣┘å╪»┘â ┘ê╪º╪¡╪»╪⌐)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¼╪»┘è╪»╪⌐</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">╪¬╪ú┘â┘è╪» ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
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
            ╪¡┘ü╪╕ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒
          </button>
        </div>
      </div>
    </div>
  );
}
