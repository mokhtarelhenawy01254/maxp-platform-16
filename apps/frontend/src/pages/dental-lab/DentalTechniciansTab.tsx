import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Pencil, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users, Wallet, Receipt, Printer, X as XMarkIcon } from "lucide-react";
import {
  DentalTechnician, DentalTechnicianRole, DentalTechnicianPayout, TechnicianPayoutType, TechnicianPayoutSummary,
  fetchTechnicians, createTechnician, updateTechnician, deleteTechnician,
  fetchTechnicianPayouts, createTechnicianPayout, deleteTechnicianPayout,
  fetchTeam, TeamMember,
  ROLE_CONFIG, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fmtMoney, fmtDate,
} from "./shared";

interface TechnicianForm {
  id?: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: DentalTechnicianRole;
  userId: string;
  wagePerStage: string;
  isActive: boolean;
}

export default function DentalTechniciansTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalTechnician[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [wageDefault, setWageDefault] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<TechnicianForm | null>(null);
  const [payoutModalTech, setPayoutModalTech] = useState<DentalTechnician | null>(null);
  const [ledgerModalTech, setLedgerModalTech] = useState<DentalTechnician | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      const [data, teamRows] = await Promise.all([
        fetchTechnicians(),
        fetchTeam().catch(() => [] as TeamMember[]),
      ]);
      let list = data.items || [];
      if (search.trim()) {
        const q = search.trim();
        list = list.filter(x => x.name.includes(q) || (x.phone || "").includes(q));
      }
      setRows(list);
      setTeam(teamRows);
      setWageDefault(data.wageDefaults?.defaultPerStage ?? 0);
      setError(null);
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "CAD_DESIGNER",
      userId: "",
      wagePerStage: "",
      isActive: true,
    });
  };

  const openEdit = (x: DentalTechnician) => {
    setError(null);
    const existingEmail = x.userEmail || x.user?.email || (team.find(mm => mm.userId === x.userId)?.email) || "";
    setModal({
      id: x.id,
      name: x.name,
      phone: x.phone || "",
      email: existingEmail,
      password: "",
      role: x.role || "GENERAL_TECHNICIAN",
      userId: x.userId || "",
      wagePerStage: x.wagePerStage != null ? String(x.wagePerStage) : "",
      isActive: x.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("اسم عضو الفريق مطلوب"); return; }
    if (!modal.id) {
      if (!modal.email.trim()) {
        setError("البريد الإلكتروني مطلوب لإنشاء حساب الفني");
        return;
      }
      if (!modal.password || modal.password.length < 6) {
        setError("كلمة المرور مطلوبة ويجب ألا تقل عن 6 أحرف");
        return;
      }
    } else if (modal.password && modal.password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        phone: modal.phone.trim() || undefined,
        role: modal.role,
        email: modal.email.trim() || undefined,
        password: modal.password.trim() || undefined,
        userId: modal.userId.trim() || undefined,
        wagePerStage: modal.wagePerStage.trim() === "" ? undefined : Number(modal.wagePerStage),
      };
      if (modal.id) {
        await updateTechnician(modal.id, { ...payload, isActive: modal.isActive });
        toast.success("تم تحديث بيانات عضو فريق العمل بنجاح");
      } else {
        await createTechnician({ ...payload, isActive: true });
        toast.success("تمت إضافة الفني وإنشاء حسابه بالمنصة بنجاح");
      }
      setModal(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (x: DentalTechnician) => {
    if (removingId) return;
    if (!window.confirm(`هل أنت متأكد من حذف (${x.name}) من فريق العمل؟`)) return;
    setRemovingId(x.id);
    try {
      await deleteTechnician(x.id);
      toast.success("تم حذف عضو الفريق بنجاح");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (x: DentalTechnician) => {
    try {
      await updateTechnician(x.id, { isActive: !x.isActive });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const roleBadge = (role: string) => {
    const meta = ROLE_CONFIG[role];
    if (!meta) return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{role}</span>;
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>;
  };

  const teamName = (userId?: string) => {
    if (!userId) return "—";
    const m = team.find(mm => mm.userId === userId);
    return m ? (m.name || m.email || userId) : userId;
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const totalWages = rows.reduce((s, x) => s + (x.totalEarnings ?? 0), 0);
  const totalPaid = rows.reduce((s, x) => s + (x.totalPaid ?? 0), 0);
  const totalBalanceDue = rows.reduce((s, x) => s + (x.balanceDue ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">فريق العمل والمحطات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة تخصصات ومحطات فريق المعمل، أجور المراحل، وسندات صرف المستحقات والسلف</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm">
            <Plus className="w-4 h-4" />إضافة عضو جديد للفريق
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">أجر المرحلة الافتراضي</p>
          <p className="text-xl font-bold mt-1">{fmtMoney(wageDefault)} {t("dentalLab.common.egp")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي مستحقات الإنتاج</p>
          <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">{fmtMoney(totalWages)} {t("dentalLab.common.egp")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المنصرف والسلف</p>
          <p className="text-xl font-bold mt-1 text-purple-600 dark:text-purple-400">{fmtMoney(totalPaid)} {t("dentalLab.common.egp")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">صافي المستحق القائم للفريق</p>
          <p className={`text-xl font-bold mt-1 ${totalBalanceDue > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"}`}>
            {fmtMoney(totalBalanceDue)} {t("dentalLab.common.egp")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">أعضاء فريق العمل والتخصصات</h3>
            <Wallet className="w-4 h-4 text-gray-400" />
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input className={`${inputCls} pr-9 w-64`} value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3" />
            {t("dentalLab.common.noResults")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.name")}</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.phone")}</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">التخصص / المحطة</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">أجر المرحلة</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">المراحل</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">إجمالي المكتسب</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">المنصرف والسلف</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">صافي المتبقي</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">حساب المنصة</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.status")}</th>
                  <th className="text-right py-3 px-3 whitespace-nowrap">{t("dentalLab.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(x => (
                  <tr key={x.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
                      <Link
                        to={`/dental-lab/cases?technicianId=${x.id}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                        title="عرض كل حالات هذا الفني فقط"
                      >
                        {x.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400" dir="ltr">{x.phone || "—"}</td>
                    <td className="py-3 px-3">{roleBadge(x.role)}</td>
                    <td className="py-3 px-3">
                      {x.wagePerStage != null ? (
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(x.wagePerStage)} ج.م</span>
                      ) : (
                        <span className="text-xs text-gray-400">افتراضي ({fmtMoney(wageDefault)} ج.م)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-blue-600 dark:text-blue-400">{x.completedStages ?? 0}</td>
                    <td className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400">
                      <div>{fmtMoney(x.totalEarnings)} ج.م</div>
                      {(Number(x.totalBonuses) > 0 || Number(x.totalDeductions) > 0) ? (
                        <div className="text-[11px] font-normal flex items-center gap-1 mt-0.5">
                          {Number(x.totalBonuses) > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">+{fmtMoney(x.totalBonuses)}</span>
                          )}
                          {Number(x.totalDeductions) > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-mono">-{fmtMoney(x.totalDeductions)}</span>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 font-semibold text-purple-600 dark:text-purple-400">{fmtMoney(x.totalPaid ?? 0)} ج.م</td>
                    <td className={`py-3 px-3 font-bold ${(x.balanceDue ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"}`}>
                      {fmtMoney(x.balanceDue ?? 0)} ج.م
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {x.userEmail || x.user?.email || (x.userId && teamName(x.userId) !== "—") ? (
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="truncate max-w-[170px]" title={x.userEmail || x.user?.email || teamName(x.userId)}>
                            {x.userEmail || x.user?.email || teamName(x.userId)}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openEdit(x)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                          title="اضغط لإنشاء أو ربط حساب المنصة"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إنشاء حساب دخول</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => toggleActive(x)}
                        className={`text-xs px-2 py-0.5 rounded-full border ${x.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                      >
                        {x.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPayoutModalTech(x)}
                          className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                          title="صرف مستحقات / سلفة"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setLedgerModalTech(x)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title="كشف حساب وسجل السندات"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(x)} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={t("dentalLab.common.edit")}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(x)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("dentalLab.common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full`}>
            <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
              <h3 className="font-semibold text-lg">{modal.id ? "تعديل بيانات عضو فريق العمل" : "إضافة فني جديد وحساب المنصة"}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>اسم الفني / العضو *</label>
                <input className={inputCls} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: أحمد مصطفى" />
              </div>
              <div>
                <label className={labelCls}>رقم الهاتف</label>
                <input className={inputCls} value={modal.phone} onChange={e => setModal({ ...modal, phone: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className={labelCls}>التخصص / المحطة التشغيلية</label>
                <select className={inputCls} value={modal.role} onChange={e => setModal({ ...modal, role: e.target.value as DentalTechnicianRole })}>
                  <option value="CAD_DESIGNER">مصمم CAD/CAM (تصميم ثلاثي الأبعاد)</option>
                  <option value="CERAMIST">فني سيراميك وبورسلين (Ceramist)</option>
                  <option value="MODEL_WAX">فني كاستات وشمع (Model & Wax)</option>
                  <option value="METAL_CASTING">فني صب معادن وسباكة (Casting)</option>
                  <option value="FINISHING_POLISHING">فني فينشنج وتلميع (Finishing & Polish)</option>
                  <option value="QC_INSPECTOR">أخصائي مراقبة جودة (QC Inspector)</option>
                  <option value="RECEPTION_LOGISTICS">استقبال ولوجستيات (Reception)</option>
                  <option value="SUPERVISOR">مشرف الإنتاج / Master Tech</option>
                  <option value="GENERAL_TECHNICIAN">فني أسنان عام (General)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>أجر المرحلة المكتملة (ج.م)</label>
                <input className={inputCls} type="number" min="0" value={modal.wagePerStage} onChange={e => setModal({ ...modal, wagePerStage: e.target.value })} placeholder="فارغ = المعدل الافتراضي" />
              </div>

              {/* Direct User Account Section (معايير 2026 لإنشاء الحساب المباشر) */}
              <div className="sm:col-span-2 border-t dark:border-gray-700/80 pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    بيانات تسجيل الدخول لحساب الفني بالمنصة (Portal Login Account)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>البريد الإلكتروني / اسم الدخول *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
                      <input
                        className={`${inputCls} pr-9`}
                        type="email"
                        value={modal.email}
                        onChange={e => setModal({ ...modal, email: e.target.value })}
                        placeholder="technician@lab.com"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>
                      {modal.id ? "تحديث كلمة المرور (فارغ للإبقاء)" : "كلمة المرور للدخول *"}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
                      <input
                        className={`${inputCls} pr-9`}
                        type="password"
                        value={modal.password}
                        onChange={e => setModal({ ...modal, password: e.target.value })}
                        placeholder={modal.id ? "•••••••• (فارغ للإبقاء)" : "6 أحرف على الأقل"}
                        dir="ltr"
                        required={!modal.id}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  يتم إنشاء وتفعيل حساب المستخدم فورياً لتمكين الفني من الدخول لبوابة المعمل ومسح باركود الحالات وتتبع مهامه.
                </p>
              </div>
              {modal.id && (
                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input type="checkbox" id="tech-active" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                  <label htmlFor="tech-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    عضو نشط (متاح لتعيين مراحل الشغل له)
                  </label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 border-t pt-3 dark:border-gray-700">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm">
                {t("dentalLab.common.cancel")}
              </button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm">
                {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {payoutModalTech && (
        <TechnicianPayoutModal
          tech={payoutModalTech}
          onClose={() => setPayoutModalTech(null)}
          onSaved={async () => {
            setPayoutModalTech(null);
            await load(true);
          }}
        />
      )}

      {ledgerModalTech && (
        <TechnicianLedgerModal
          tech={ledgerModalTech}
          onClose={() => setLedgerModalTech(null)}
          onAddPayout={() => {
            const current = ledgerModalTech;
            setLedgerModalTech(null);
            setPayoutModalTech(current);
          }}
          onDataChanged={async () => {
            await load(true);
          }}
        />
      )}
    </div>
  );
}

interface PayoutModalProps {
  tech: DentalTechnician;
  onClose: () => void;
  onSaved: () => void;
}

function TechnicianPayoutModal({ tech, onClose, onSaved }: PayoutModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TechnicianPayoutType>("PAYOUT");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }
    setSaving(true);
    try {
      await createTechnicianPayout(tech.id, {
        amount: val,
        type,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
      });
      toast.success("تم تسجيل السند المالي بنجاح");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ السند");
    } finally {
      setSaving(false);
    }
  };

  const typeConfig: Record<TechnicianPayoutType, { label: string; desc: string; color: string }> = {
    PAYOUT: { label: "صرف مستحقات إنتاج", desc: "دفع أجر المراحل المكتملة", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
    ADVANCE: { label: "سلفة نقدية على الحساب", desc: "سلفة تخصم لاحقاً من الأرباح", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
    BONUS: { label: "مكافأة أداء / حافز", desc: "إضافة مالية تضاف للمستحقات", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
    DEDUCTION: { label: "خصم (تالف / إعادة شغل)", desc: "خصم يقلل المستحق للفني", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" },
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-lg max-h-[92vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold">تسجيل حركة مالية / سند صرف</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">الفني: {tech.name} (المتبقي الحالي: {fmtMoney(tech.balanceDue ?? 0)} ج.م)</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">نوع الحركة المالية *</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(typeConfig) as TechnicianPayoutType[]).map(tKey => {
                const cfg = typeConfig[tKey];
                const isSelected = type === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setType(tKey)}
                    className={`p-2.5 rounded-lg border text-right transition-all text-xs ${isSelected ? `${cfg.color} ring-2 ring-blue-500 font-bold shadow-sm` : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
                  >
                    <div>{cfg.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-normal">{cfg.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">المبلغ (ج.م) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`${MODAL_INPUT_CLS} text-sm font-bold`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">طريقة الصرف *</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className={`${MODAL_INPUT_CLS} text-sm`}
              >
                <option value="CASH">نقدي (كاش الخزينة)</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="WALLET">محفظة إلكترونية / فودافون كاش / إنستاباي</option>
                <option value="CHECK">شيك بنكي</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">تاريخ الصرف</label>
              <input
                type="date"
                value={paidAt}
                onChange={e => setPaidAt(e.target.value)}
                className={`${MODAL_INPUT_CLS} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">الرقم المرجعي / رقم الإيصال</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="مثال: رقم الحوالة أو سند الصرف"
                className={`${MODAL_INPUT_CLS} text-sm`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">البيان / الملاحظات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: صرف دفعة مستحقات عن الأسبوع الأول من الشهر..."
              className={`${MODAL_INPUT_CLS} text-sm`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || !amount}
              className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold shadow-sm flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              حفظ وتأكيد السند
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LedgerModalProps {
  tech: DentalTechnician;
  onClose: () => void;
  onAddPayout: () => void;
  onDataChanged: () => void;
}

function TechnicianLedgerModal({ tech, onClose, onAddPayout, onDataChanged }: LedgerModalProps) {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<DentalTechnicianPayout[]>([]);
  const [summary, setSummary] = useState<TechnicianPayoutSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTechnicianPayouts(tech.id);
      setPayouts(res.payouts || []);
      setSummary(res.summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ في تحميل كشف حساب الفني");
    } finally {
      setLoading(false);
    }
  }, [tech.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (payoutId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السند المالي؟ سيتم تحديث رصيد الفني تلقائياً.")) return;
    setDeletingId(payoutId);
    try {
      await deleteTechnicianPayout(payoutId);
      toast.success("تم حذف السند بنجاح");
      await loadData();
      onDataChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ أثناء حذف السند");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "PAYOUT":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">صرف مستحقات</span>;
      case "ADVANCE":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">سلفة نقدية</span>;
      case "BONUS":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">مكافأة أداء</span>;
      case "DEDUCTION":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">خصم تالف/إعادة</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{type}</span>;
    }
  };

  const methodLabel: Record<string, string> = {
    CASH: "نقدي",
    BANK_TRANSFER: "تحويل بنكي",
    WALLET: "محفظة إلكترونية",
    CHECK: "شيك بنكي",
    OTHER: "أخرى",
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:shadow-none print:border-none print:p-0`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-bold">كشف حساب وسجل مستحقات الفني</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tech.name} — {tech.phone || "بدون هاتف"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة كشف الحساب
            </button>
            <button
              onClick={onAddPayout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              صرف جديد / سلفة
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Header */}
        <div className="hidden print:block mb-6 border-b pb-4 text-right" dir="rtl">
          <h2 className="text-2xl font-bold">سند كشف حساب فني معمل الأسنان</h2>
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
            <div>
              <p><span className="font-bold">اسم الفني:</span> {tech.name}</p>
              <p><span className="font-bold">التخصص:</span> {tech.role}</p>
              <p><span className="font-bold">الهاتف:</span> {tech.phone || "—"}</p>
            </div>
            <div className="text-left" dir="ltr">
              <p><span className="font-bold">تاريخ الطباعة:</span> {new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">أجر الإنتاج المكتسب</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">{fmtMoney(summary?.totalEarned ?? 0)} ج.م</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">{summary?.completedStages ?? 0} مرحلة ({summary?.completedUnits ?? 0} وحدة)</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">إجمالي ما صُرف للفني</span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">{fmtMoney(summary?.totalPaid ?? 0)} ج.م</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">سلف: {fmtMoney(summary?.totalAdvances ?? 0)} ج.م</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">المكافآت والحوافز</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">+{fmtMoney(summary?.totalBonuses ?? 0)} ج.م</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">الخصومات والتوالف</span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">-{fmtMoney(summary?.totalDeductions ?? 0)} ج.م</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border-2 border-emerald-500/40 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">صافي المستحق القائم</span>
              <span className={`text-lg font-bold block ${Number(summary?.netDue ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}>
                {fmtMoney(summary?.netDue ?? 0)} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">سجل الحركات وسندات الصرف</h4>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              لا توجد سندات صرف أو حركات مسجلة لهذا الفني حتى الآن
            </div>
          ) : (
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 text-gray-500">
                    <th className="py-2.5 px-3 text-right">التاريخ</th>
                    <th className="py-2.5 px-3 text-right">نوع الحركة</th>
                    <th className="py-2.5 px-3 text-right">المبلغ</th>
                    <th className="py-2.5 px-3 text-right">طريقة الدفع</th>
                    <th className="py-2.5 px-3 text-right">المرجع</th>
                    <th className="py-2.5 px-3 text-right">البيان والملاحظات</th>
                    <th className="py-2.5 px-3 text-right">المدخل</th>
                    <th className="py-2.5 px-3 text-right print:hidden">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">{fmtDate(p.paidAt)}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{typeBadge(p.type)}</td>
                      <td className={`py-2.5 px-3 font-bold font-mono whitespace-nowrap ${p.type === "DEDUCTION" ? "text-red-600" : p.type === "BONUS" ? "text-blue-600" : "text-emerald-600"}`}>
                        {p.type === "DEDUCTION" ? "-" : "+"}{fmtMoney(p.amount)} ج.م
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{methodLabel[p.paymentMethod] || p.paymentMethod}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-500 font-mono">{p.reference || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{p.notes || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">{p.createdByName || "الإدارة"}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap print:hidden">
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-40"
                          title="حذف السند"
                        >
                          {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Printable Signature Footer */}
          <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-8 border-t text-sm">
            <div className="text-right">
              <p className="font-bold">توقيع الفني المستلم:</p>
              <div className="mt-8 border-b border-dashed border-gray-400 w-48"></div>
            </div>
            <div className="text-left" dir="ltr">
              <p className="font-bold">توقيع الإدارة / الحسابات:</p>
              <div className="mt-8 border-b border-dashed border-gray-400 w-48 ml-auto"></div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t dark:border-gray-700 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}