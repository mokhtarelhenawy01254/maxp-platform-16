import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Users, AlertCircle, Shield } from "lucide-react";
import { api, fetchJson, getAuthHeaders, InsuranceMemberType } from "./shared";

interface MemberTypeRow extends InsuranceMemberType {
  _count?: { patients?: number };
}

interface MemberTypeForm {
  id?: string;
  name: string;
  coveragePercent: string;
  isActive: boolean;
}

const emptyForm = (): MemberTypeForm => ({ name: "", coveragePercent: "", isActive: true });

export default function MemberTypesTab() {
  const [types, setTypes] = useState<MemberTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<MemberTypeForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchJson<MemberTypeRow[]>(api("insurance-member-types"));
    setTypes(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "حدث خطأ في تحميل أنواع العضوية");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const mutate = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "فشلت العملية");
    return data.data;
  };

  const openCreate = () => setModal(emptyForm());
  const openEdit = (t: MemberTypeRow) => setModal({ id: t.id, name: t.name, coveragePercent: String(t.coveragePercent), isActive: t.isActive });

  const save = async () => {
    if (!modal) return;
    const coverage = Number(modal.coveragePercent);
    if (modal.coveragePercent === "" || Number.isNaN(coverage) || !Number.isFinite(coverage) || coverage < 0 || coverage > 100) {
      setError("نسبة التغطية يجب أن تكون رقماً بين 0 و 100");
      return;
    }
    setSaving(true);
    try {
      if (modal.id) {
        await mutate(api(`insurance-member-types/${modal.id}`), "PUT", { name: modal.name, coveragePercent: coverage, isActive: modal.isActive });
      } else {
        await mutate(api("insurance-member-types"), "POST", { name: modal.name, coveragePercent: coverage });
      }
      setModal(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حفظ نوع العضوية");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: MemberTypeRow) => {
    if (!window.confirm(`تأكيد حذف نوع العضوية "${t.name}"؟`)) return;
    try {
      await mutate(api(`insurance-member-types/${t.id}`), "DELETE");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف نوع العضوية");
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground text-xs">جارٍ تحميل أنواع العضوية...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">أنواع عضوية التأمين</h2>
          <p className="text-xs text-muted-foreground">أدوار وفئات المستفيدين وتحديد نسبة التغطية التأمينية لكل فئة</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>نوع عضوية جديد</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-destructive/10 text-destructive border border-destructive/20 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-destructive/20 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {types.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl p-12 text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs">لا توجد أنواع عضوية مضافة بعد</p>
        </div>
      ) : (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-[11px] font-medium">
                  <th className="text-right py-2.5 px-3">اسم الفئة</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">نسبة التغطية التأمينية</th>
                  <th className="text-right py-2.5 px-3">الحالة</th>
                  <th className="text-right py-2.5 px-3">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {types.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{t.name}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-foreground">
                        {t.coveragePercent}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {t.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => remove(t)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border/70 rounded-2xl shadow-xl w-full max-w-md p-5 text-foreground space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-sm font-bold text-foreground">
                {modal.id ? "تعديل نوع العضوية" : "نوع عضوية جديد"}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">اسم الفئة</label>
                <input
                  className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={modal.name}
                  onChange={e => setModal({ ...modal, name: e.target.value })}
                  placeholder="مثال: المؤمَّن له، الزوج، الزوجة، الأطفال"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">نسبة التغطية %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs font-mono tabular-nums bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={modal.coveragePercent}
                  onChange={e => setModal({ ...modal, coveragePercent: e.target.value })}
                  placeholder="0 - 100"
                />
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={modal.isActive}
                    onChange={e => setModal({ ...modal, isActive: e.target.checked })}
                    className="rounded border-border/70 text-primary focus:ring-primary/40"
                  />
                  <span>مفعّل ونشط</span>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
              <button
                onClick={() => setModal(null)}
                className="px-3 py-1.5 text-xs border border-border/70 text-foreground rounded-xl hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={save}
                disabled={saving || !modal.name.trim()}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
