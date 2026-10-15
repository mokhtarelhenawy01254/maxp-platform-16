import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BookingPatient, PATIENT_STATUS_MAP, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, api, fetchJson } from "./shared";
import { Check, Eye, Pencil, Plus, Search, Trash2, ExternalLink, GitMerge, X, Users } from 'lucide-react';
import PatientModal from "./PatientModal";

interface Props {
  patients: BookingPatient[];
  search: string;
  onSearchChange: (v: string) => void;
  onView: (id: string) => void;
  onEdit: (p: Partial<BookingPatient>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  modalPatient: Partial<BookingPatient> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };

const statusMeta = (status?: string) => PATIENT_STATUS_MAP[status || "ACTIVE"] ?? { label: status || "ACTIVE", color: "bg-muted text-muted-foreground" };

export default function PatientsTab({
  patients, search, onSearchChange,
  onView, onEdit, onToggleActive, onDelete,
  modalPatient, onModalClose, onSave
}: Props) {
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState("");
  const [insuranceFilter, setInsuranceFilter] = useState("");
  const [mergeSource, setMergeSource] = useState<BookingPatient | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);
  const [localPatients, setLocalPatients] = useState<BookingPatient[] | null>(null);

  useEffect(() => { setLocalPatients(null); }, [patients]);

  const list = localPatients ?? patients;

  const sources = useMemo(() => {
    const set = new Set<string>();
    list.forEach(p => { if (p.source) set.add(p.source); });
    return Array.from(set);
  }, [list]);

  const insuranceCompanies = useMemo(() => {
    const set = new Set<string>();
    list.forEach(p => { if (p.insuranceCompany?.name) set.add(p.insuranceCompany.name); });
    return Array.from(set);
  }, [list]);

  const filtered = useMemo(() => list.filter(p => {
    if (sourceFilter && p.source !== sourceFilter) return false;
    if (insuranceFilter && p.insuranceCompany?.name !== insuranceFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.firstName || "").toLowerCase().includes(q)
      || (p.lastName || "").toLowerCase().includes(q)
      || (p.phone || "").toLowerCase().includes(q)
      || (p.insuranceNumber || "").toLowerCase().includes(q);
  }), [list, search, sourceFilter, insuranceFilter]);

  const refresh = async () => {
    try { setLocalPatients(await fetchJson<BookingPatient[]>(api("patients?includeInactive=true"))); } catch { /* keep current list */ }
  };

  const candidates = list.filter(p => p.id !== mergeSource?.id && p.isActive !== false && p.status !== "INACTIVE");

  const confirmMerge = async () => {
    if (!mergeSource || !mergeTargetId || merging) return;
    setMerging(true);
    try {
      await fetchJson(api(`patients/${mergeSource.id}/merge`), {
        method: "POST",
        body: JSON.stringify({ targetPatientId: mergeTargetId }),
      });
      toast.success("تم دمج المريض بنجاح");
      setMergeSource(null);
      setMergeTargetId("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل دمج المرضى");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top search & filters */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">سجل وملفات المرضى</h2>
          <p className="text-xs text-muted-foreground mt-0.5">البحث في السجلات الطبية، أرقام التأمين، والزيارات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              className={`${MODAL_INPUT_CLS} pr-8 pl-3 py-1.5 text-xs sm:text-sm w-44 sm:w-56`}
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
          {sources.length > 0 && (
            <select
              className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
            >
              <option value="">كل المصادر</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {insuranceCompanies.length > 0 && (
            <select
              className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={insuranceFilter}
              onChange={e => setInsuranceFilter(e.target.value)}
            >
              <option value="">كل شركات التأمين</option>
              {insuranceCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button
            onClick={() => onEdit({})}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm hover:bg-primary/90 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مريض</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border/70 rounded-xl p-6">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-primary" />
          <p className="text-xs">لا يوجد مرضى مطابقون لخيارات البحث</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-3">
            {filtered.map(p => (
              <div key={p.id} className={`bg-card rounded-xl border border-border/70 p-4 shadow-sm space-y-2.5 ${!p.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{p.firstName} {p.lastName || ""}</h3>
                    <p className="text-xs text-muted-foreground">{GENDER_LABEL[p.gender || ""] || ""} {p.bloodType ? `· فصيلة ${p.bloodType}` : ""}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusMeta(p.status).color}`}>
                    {statusMeta(p.status).label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono tabular-nums" dir="ltr">{p.phone || "—"}</p>
                {p.insuranceNumber && (
                  <p className="text-xs text-muted-foreground">
                    <span dir="ltr">رقم التأمين: <strong className="font-mono tabular-nums">{p.insuranceNumber}</strong></span>
                    {p.insuranceCompany?.name ? ` · ${p.insuranceCompany.name}` : ""}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">الزيارات المسجلة: <strong className="font-mono tabular-nums text-foreground">{p.visitCount ?? 0}</strong></p>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                  <button onClick={() => onView(p.id)} className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض</span>
                  </button>
                  <button onClick={() => navigate(`/admin/booking/patients/${p.id}`)} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>صفحة</span>
                  </button>
                  <button onClick={() => onEdit(p)} className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-500/20 flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button onClick={() => { setMergeTargetId(""); setMergeSource(p); }} className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md hover:bg-amber-500/20 flex items-center gap-1">
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>دمج</span>
                  </button>
                  <button onClick={() => onToggleActive(p.id, p.isActive)} className={`text-xs px-2.5 py-1 rounded-md ${p.isActive ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"}`}>
                    {p.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                  <button onClick={() => onDelete(p.id)} className="text-xs px-2.5 py-1 bg-rose-500/10 text-rose-600 rounded-md hover:bg-rose-500/20 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-xl border border-border/70 overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-medium">
                  {["الاسم", "الهاتف", "الجنس", "فصيلة الدم", "رقم التأمين", "الزيارات", "الحالة", "المصدر", ""].map(h => (
                    <th key={h} className="text-right py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(p => (
                  <tr key={p.id} className={`hover:bg-muted/40 transition-colors ${!p.isActive ? "opacity-60" : ""}`}>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{p.firstName} {p.lastName || ""}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground" dir="ltr">{p.phone || "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{GENDER_LABEL[p.gender || ""] || "—"}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{p.bloodType || "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      <span className="font-mono tabular-nums" dir="ltr">{p.insuranceNumber || "—"}</span>
                      {p.insuranceCompany?.name ? <div className="text-[10px] text-muted-foreground/75">{p.insuranceCompany.name}</div> : null}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{p.visitCount ?? 0}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${statusMeta(p.status).color}`}>
                        {statusMeta(p.status).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.source || "—"}</td>
                    <td className="py-2.5 px-3 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onView(p.id)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="عرض الملف"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => navigate(`/admin/booking/patients/${p.id}`)} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors" title="فتح صفحة مستقلة"><ExternalLink className="w-4 h-4" /></button>
                        <button onClick={() => onEdit(p)} className="p-1 text-blue-600 hover:bg-blue-500/10 rounded transition-colors" title="تعديل"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { setMergeTargetId(""); setMergeSource(p); }} className="p-1 text-amber-600 hover:bg-amber-500/10 rounded transition-colors" title="دمج"><GitMerge className="w-4 h-4" /></button>
                        <button onClick={() => onToggleActive(p.id, p.isActive)} className={`p-1 rounded transition-colors ${p.isActive ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`} title={p.isActive ? "تعطيل" : "تفعيل"}><Check className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(p.id)} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalPatient !== undefined && <PatientModal patient={modalPatient} onClose={onModalClose} onSave={onSave} />}

      {mergeSource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setMergeSource(null)}>
          <div className={`${MODAL_CONTENT_CLS} bg-card border border-border/80 shadow-2xl max-w-md w-full`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/70">
              <h3 className="text-base font-bold text-foreground">دمج مريض</h3>
              <button onClick={() => setMergeSource(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 leading-relaxed">
              سيتم نقل مواعيد وفواتير المريض <strong>{mergeSource.firstName} {mergeSource.lastName || ""}</strong> إلى المريض المستهدف ثم تعطيل هذا الحساب.
            </p>
            <label className="block text-xs font-medium text-foreground mb-1.5">المريض المستهدف *</label>
            <select
              className={`${MODAL_INPUT_CLS} text-xs sm:text-sm`}
              value={mergeTargetId}
              onChange={e => setMergeTargetId(e.target.value)}
            >
              <option value="">اختر المريض المستهدف...</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName || ""}{c.phone ? ` (${c.phone})` : ""}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-border/60">
              <button
                onClick={() => setMergeSource(null)}
                className="px-3.5 py-1.5 text-xs sm:text-sm text-muted-foreground border border-border/70 rounded-lg hover:bg-muted/60 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmMerge}
                disabled={!mergeTargetId || merging}
                className="px-3.5 py-1.5 bg-amber-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {merging ? "جاري الدمج..." : "تأكيد الدمج"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
