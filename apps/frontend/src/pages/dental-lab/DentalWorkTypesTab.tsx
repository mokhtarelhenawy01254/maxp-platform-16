import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  Workflow,
  Wrench,
  X as XMarkIcon,
} from "lucide-react";
import DentalWorkTypeStagesModal from "./DentalWorkTypeStagesModal";
import {
  DentalWorkType, fetchWorkTypes, createWorkType, updateWorkType, deleteWorkType,
  WORK_TYPE_CATEGORIES, tKey, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fmtMoney,
} from "./shared";

interface WorkTypeForm {
  id?: string;
  name: string;
  category: string;
  pricingMode: "PER_UNIT" | "FLAT";
  price: number;
  costPrice: number;
  leadTimeDays: number;
  urgentLeadTimeDays: number;
  defaultMaterial: string;
  materialBrand: string;
  instructions: string;
  defaultWarrantyYears: number;
  defaultCrownCount: number;
  sortOrder: number;
  isActive: boolean;
}

const COMMON_MATERIALS = [
  "زيركون (Zirconia Multilayer)",
  "إيماكس (e.max CAD / Press)",
  "بورسلين ميتال (PFM Cobalt-Chrome)",
  "بي إي إي كيه (PEEK / High Performance)",
  "أكريل وطباعة 3D (PMMA / 3D Print)",
  "معدن مسبوك (Cast Metal / Gold)",
  "فينير تجميلي (Cosmetic Veneer)",
];

const COMMON_BRANDS = [
  "Aidite (3D Pro Zir, Honor)",
  "Kuraray Noritake (Katana Zirconia)",
  "Ivoclar Vivadent (IPS e.max CAD / Press)",
  "Upcera (Explore Multilayer)",
  "Wieland Dental (Zenostar)",
  "Vita Zahnfabrik (Suprinity, Enamic)",
  "Argen (ArgenZ Zirconia)",
  "Dentsply Sirona (Cercon ht)",
];

export default function DentalWorkTypesTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalWorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<WorkTypeForm | null>(null);
  const [stagesModalWorkType, setStagesModalWorkType] = useState<DentalWorkType | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      let data = await fetchWorkTypes();
      if (search.trim()) {
        const q = search.trim();
        data = data.filter(w => w.name.includes(q) || (w.category || "").includes(q) || (w.materialBrand || "").includes(q));
      }
      data = [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setRows(data);
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
      category: "CROWN",
      pricingMode: "PER_UNIT",
      price: 0,
      costPrice: 0,
      leadTimeDays: 3,
      urgentLeadTimeDays: 1,
      defaultMaterial: "زيركون (Zirconia Multilayer)",
      materialBrand: "Aidite (3D Pro Zir, Honor)",
      instructions: "",
      defaultWarrantyYears: 5,
      defaultCrownCount: 1,
      sortOrder: 0,
      isActive: true,
    });
  };

  const openEdit = (w: DentalWorkType) => {
    setError(null);
    setModal({
      id: w.id,
      name: w.name,
      category: w.category || "OTHER",
      pricingMode: w.pricingMode || "PER_UNIT",
      price: w.price ?? 0,
      costPrice: w.costPrice ?? 0,
      leadTimeDays: w.leadTimeDays ?? 0,
      urgentLeadTimeDays: w.urgentLeadTimeDays ?? 0,
      defaultMaterial: w.defaultMaterial || "",
      materialBrand: w.materialBrand || "",
      instructions: w.instructions || "",
      defaultWarrantyYears: w.defaultWarrantyYears ?? 0,
      defaultCrownCount: w.defaultCrownCount ?? 1,
      sortOrder: w.sortOrder ?? 0,
      isActive: w.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError(t("dentalLab.common.name")); return; }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        category: modal.category || "OTHER",
        pricingMode: modal.pricingMode,
        price: Number(modal.price) || 0,
        costPrice: Number(modal.costPrice) || 0,
        leadTimeDays: Number(modal.leadTimeDays) || 0,
        urgentLeadTimeDays: Number(modal.urgentLeadTimeDays) || 0,
        defaultMaterial: modal.defaultMaterial.trim() || undefined,
        materialBrand: modal.materialBrand.trim() || undefined,
        instructions: modal.instructions.trim() || undefined,
        defaultWarrantyYears: Number(modal.defaultWarrantyYears) || 0,
        defaultCrownCount: Math.max(1, Number(modal.defaultCrownCount) || 1),
        sortOrder: Number(modal.sortOrder) || 0,
      };
      if (modal.id) {
        await updateWorkType(modal.id, { ...payload, isActive: modal.isActive });
        toast.success(t("dentalLab.workTypes.updated"));
      } else {
        await createWorkType({ ...payload, isActive: true });
        toast.success(t("dentalLab.workTypes.created"));
      }
      setModal(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (w: DentalWorkType) => {
    if (removingId) return;
    if (!window.confirm(`${t("dentalLab.common.confirmDelete")} (${w.name})`)) return;
    setRemovingId(w.id);
    try {
      await deleteWorkType(w.id);
      toast.success(t("dentalLab.workTypes.deleted"));
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (w: DentalWorkType) => {
    try {
      await updateWorkType(w.id, { isActive: !w.isActive });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  // Live calculations for the active modal
  const liveProfit = modal ? Math.max(0, (Number(modal.price) || 0) - (Number(modal.costPrice) || 0)) : 0;
  const liveMarginPct = modal && Number(modal.price) > 0 ? Math.round((liveProfit / Number(modal.price)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.workTypes.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الخدمات، تسعير الخدمات والوحدات، الماركات المعتمدة، وهوامش الربح</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm">
            <Plus className="w-4 h-4" />{t("dentalLab.workTypes.newWorkType")}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">{t("dentalLab.workTypes.title")} ({rows.length})</h3>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input className={`${inputCls} pr-9 w-64`} value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="بحث بالاسم أو الخامة أو الماركة..." />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <Wrench className="w-10 h-10 mx-auto mb-3" />
            {t("dentalLab.common.noResults")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.common.name")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.workTypes.category")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">طريقة التسعير</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">السعر للعيادة</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">التكلفة والربح</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">الخامة والماركة</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.workTypes.leadTimeDays")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.common.status")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(w => {
                  const profit = Math.max(0, (w.price ?? 0) - (w.costPrice ?? 0));
                  const margin = (w.price ?? 0) > 0 ? Math.round((profit / (w.price ?? 1)) * 100) : 0;
                  return (
                    <tr key={w.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <Link
                          to={`/dental-lab/cases?workTypeId=${w.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                          title="عرض كل حالات هذا النوع فقط"
                        >
                          {w.name}
                        </Link>
                        {w.instructions && (
                          <span className="block text-[11px] text-gray-400 font-normal truncate max-w-xs" title={w.instructions}>
                            📝 {w.instructions}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                          {tKey(t, `dentalLab.workTypes.categoryOptions.${w.category}`) || w.category || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${w.pricingMode === "PER_UNIT" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"}`}>
                          {w.pricingMode === "PER_UNIT" ? "لكل وحدة" : "سعر ثابت للخدمة"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                        {fmtMoney(w.price)} {t("dentalLab.common.egp")}
                      </td>
                      <td className="py-3 px-4">
                        {(w.costPrice ?? 0) > 0 ? (
                          <div className="text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{fmtMoney(profit)} ج.م</span>
                            <span className="text-[10px] text-gray-400 mr-1 font-mono">({margin}%)</span>
                            <div className="text-[10px] text-gray-400">ت: {fmtMoney(w.costPrice)} ج.م</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">غير محدد</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {w.defaultMaterial || "—"}
                        </div>
                        {w.materialBrand && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            <span>{w.materialBrand}</span>
                          </div>
                        )}
                        {(w.defaultWarrantyYears ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>ضمان {w.defaultWarrantyYears} سنوات</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        <div className="tabular-nums font-mono">{w.leadTimeDays ?? 0} أيام</div>
                        {(w.urgentLeadTimeDays ?? 0) > 0 && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                            مستعجل: {w.urgentLeadTimeDays} يوم
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleActive(w)}
                          className={`text-xs px-2 py-0.5 rounded-full border ${w.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                        >
                          {w.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setStagesModalWorkType(w)}
                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                            title="قالب مراحل الإنتاج ومواصفات SLA"
                          >
                            <Workflow className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(w)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title={t("dentalLab.common.edit")}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => remove(w)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("dentalLab.common.delete")}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">{modal.id ? "تعديل نوع الشغل" : "إضافة نوع شغل جديد (2026 Ready)"}</h3>
              </div>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with 2-column layout: Form & Live Preview */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className={labelCls}>{t("dentalLab.common.name")} *</label>
                  <input
                    className={inputCls}
                    placeholder="مثال: تاج زيركون متعدد الطبقات (Zirconia Multilayer Crown)"
                    value={modal.name}
                    onChange={e => setModal({ ...modal, name: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t("dentalLab.workTypes.category")}</label>
                    <select className={inputCls} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })}>
                      {WORK_TYPE_CATEGORIES.map(c => <option key={c} value={c}>{tKey(t, `dentalLab.workTypes.categoryOptions.${c}`)}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>طريقة التسعير *</label>
                    <select className={inputCls} value={modal.pricingMode} onChange={e => setModal({ ...modal, pricingMode: e.target.value as "PER_UNIT" | "FLAT" })}>
                      <option value="PER_UNIT">تسعير لكل وحدة (Per Unit)</option>
                      <option value="FLAT">سعر ثابت للخدمة كاملة (Flat Rate)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>
                      {modal.pricingMode === "PER_UNIT" ? "سعر الوحدة للعيادة (ج.م) *" : "السعر الإجمالي للخدمة (ج.م) *"}
                    </label>
                    <input className={inputCls} type="number" min="0" value={modal.price} onChange={e => setModal({ ...modal, price: Number(e.target.value) })} />
                  </div>

                  <div>
                    <label className={labelCls}>التكلفة التقديرية للمعمل (ج.م)</label>
                    <input className={inputCls} type="number" min="0" placeholder="تكلفة البلوك والمواد" value={modal.costPrice} onChange={e => setModal({ ...modal, costPrice: Number(e.target.value) })} />
                  </div>

                  {modal.pricingMode === "PER_UNIT" && (
                    <div>
                      <label className={labelCls}>عدد الوحدات الافتراضي</label>
                      <input className={inputCls} type="number" min="1" value={modal.defaultCrownCount} onChange={e => setModal({ ...modal, defaultCrownCount: Math.max(1, Number(e.target.value)) })} />
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>{t("dentalLab.workTypes.leadTimeDays")} (أيام العمل العادية)</label>
                    <input className={inputCls} type="number" min="1" value={modal.leadTimeDays} onChange={e => setModal({ ...modal, leadTimeDays: Number(e.target.value) })} />
                  </div>

                  <div>
                    <label className={labelCls}>مدة الإنجاز المستعجل (أيام)</label>
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      value={modal.urgentLeadTimeDays}
                      onChange={e => setModal({ ...modal, urgentLeadTimeDays: Number(e.target.value) })}
                      placeholder="فارغ = حسب السياسة العامة"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>الخامة الطبية الافتراضية</label>
                    <input list="common-materials" className={inputCls} placeholder="اختر أو اكتب الخامة" value={modal.defaultMaterial} onChange={e => setModal({ ...modal, defaultMaterial: e.target.value })} />
                    <datalist id="common-materials">
                      {COMMON_MATERIALS.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className={labelCls}>الماركة / الشركة المصنعة المعتمدة</label>
                    <input list="common-brands" className={inputCls} placeholder="مثال: Aidite 3D Pro / Katana" value={modal.materialBrand} onChange={e => setModal({ ...modal, materialBrand: e.target.value })} />
                    <datalist id="common-brands">
                      {COMMON_BRANDS.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>سنوات الضمان الافتراضية</label>
                    <input className={inputCls} type="number" min="0" placeholder="مثال: 5 سنوات" value={modal.defaultWarrantyYears} onChange={e => setModal({ ...modal, defaultWarrantyYears: Number(e.target.value) })} />
                  </div>

                  <div>
                    <label className={labelCls}>{t("dentalLab.workTypes.sortOrder")}</label>
                    <input className={inputCls} type="number" value={modal.sortOrder} onChange={e => setModal({ ...modal, sortOrder: Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>إرشادات التحضير للعيادة وملاحظات الفنيين (Guidelines)</label>
                  <textarea
                    className={`${inputCls} min-h-[60px] resize-y`}
                    placeholder="تعليمات تحضير الشامفر، الحد الأدنى للسمك، زوايا التحضير، أو توجيهات التصميم..."
                    value={modal.instructions}
                    onChange={e => setModal({ ...modal, instructions: e.target.value })}
                  />
                </div>

                {modal.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="worktype-active" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                    <label htmlFor="worktype-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t("dentalLab.common.active")} (متاح لاختياره في الحالات والطلبات الجديدة)
                    </label>
                  </div>
                )}
              </div>

              {/* Right Column: Live Interactive Card Preview */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    معاينة حية (كيف تظهر للطبيب في البوابة)
                  </label>
                  <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-850 p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          {tKey(t, `dentalLab.workTypes.categoryOptions.${modal.category}`) || modal.category}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {modal.name.trim() || "اسم نوع الشغل"}
                        </h4>
                      </div>
                      <div className="text-end">
                        <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                          {fmtMoney(modal.price)} ج.م
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {modal.pricingMode === "PER_UNIT" ? "/ وحدة واحدة" : "سعر شامل"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">الخامة:</span>
                        <span className="font-medium truncate max-w-[150px]">{modal.defaultMaterial || "—"}</span>
                      </div>
                      {modal.materialBrand && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">الماركة:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{modal.materialBrand}</span>
                        </div>
                      )}
                      {modal.defaultWarrantyYears > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> الضمان:</span>
                          <span>{modal.defaultWarrantyYears} سنوات</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3.5 h-3.5" /> مدة التنفيذ:</span>
                        <span>{modal.leadTimeDays} أيام عمل</span>
                      </div>
                    </div>

                    {modal.instructions && (
                      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200">
                        <span className="font-bold block mb-0.5">توصيات التحضير للعيادة:</span>
                        <p className="line-clamp-3">{modal.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profit Margin Analyzer Card for Lab Owner */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-600" /> تحليل ربحية الخدمة</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{liveMarginPct}% هامش</span>
                  </div>
                  <div className="space-y-1 text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>سعر البيع للطبيب:</span>
                      <span className="font-bold">{fmtMoney(modal.price)} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تكلفة المواد والبلوكات:</span>
                      <span className="text-red-500 font-bold">-{fmtMoney(modal.costPrice)} ج.م</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t dark:border-gray-700 font-bold text-emerald-600 dark:text-emerald-400">
                      <span>صافي ربح الوحدة / الخدمة:</span>
                      <span>+{fmtMoney(liveProfit)} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 shrink-0">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-sm">
                {t("dentalLab.common.cancel")}
              </button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm">
                {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {stagesModalWorkType && (
        <DentalWorkTypeStagesModal
          workType={stagesModalWorkType}
          onClose={() => setStagesModalWorkType(null)}
          onSaved={async () => {
            await load(true);
          }}
        />
      )}
    </div>
  );
}