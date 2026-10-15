import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Building2, AlertCircle } from "lucide-react";
import { api, fetchJson, getAuthHeaders, InsuranceCompany, PriceList } from "./shared";

interface InsuranceCompanyRow extends InsuranceCompany {
  priceList?: { id: string; name: string; isBase?: boolean; isActive?: boolean };
}

interface CompanyForm {
  id?: string;
  name: string;
  priceListId: string;
  phone1: string;
  fax: string;
  contactName: string;
  contactPhone: string;
  isActive: boolean;
}

const emptyForm = (): CompanyForm => ({
  name: "", priceListId: "", phone1: "", fax: "", contactName: "", contactPhone: "", isActive: true
});

export default function InsuranceCompaniesTab() {
  const [companies, setCompanies] = useState<InsuranceCompanyRow[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCompanies = useCallback(async () => {
    const data = await fetchJson<InsuranceCompanyRow[]>(api("insurance-companies"));
    setCompanies(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await Promise.all([
          loadCompanies(),
          fetchJson<PriceList[]>(api("price-lists")).then(setPriceLists).catch(() => setPriceLists([]))
        ]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "حدث خطأ في تحميل شركات التأمين");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCompanies]);

  const mutate = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "فشلت العملية");
    return data.data;
  };

  const openCreate = () => setForm(emptyForm());
  const openEdit = (c: InsuranceCompanyRow) => setForm({
    id: c.id,
    name: c.name,
    priceListId: c.priceListId || "",
    phone1: c.phone1 || "",
    fax: c.fax || "",
    contactName: c.contactName || "",
    contactPhone: c.contactPhone || "",
    isActive: c.isActive
  });

  const saveCompany = async () => {
    if (!form) return;
    setSaving(true);
    try {
      if (form.id) {
        await mutate(api(`insurance-companies/${form.id}`), "PUT", {
          name: form.name,
          priceListId: form.priceListId || null,
          phone1: form.phone1 || null,
          fax: form.fax || null,
          contactName: form.contactName || null,
          contactPhone: form.contactPhone || null,
          isActive: form.isActive
        });
      } else {
        await mutate(api("insurance-companies"), "POST", {
          name: form.name,
          priceListId: form.priceListId || undefined,
          phone1: form.phone1 || undefined,
          fax: form.fax || undefined,
          contactName: form.contactName || undefined,
          contactPhone: form.contactPhone || undefined
        });
      }
      setForm(null);
      await loadCompanies();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حفظ شركة التأمين");
    } finally {
      setSaving(false);
    }
  };

  const deleteCompany = async (c: InsuranceCompanyRow) => {
    if (!window.confirm(`تأكيد حذف شركة التأمين "${c.name}"؟`)) return;
    try {
      await mutate(api(`insurance-companies/${c.id}`), "DELETE");
      await loadCompanies();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف شركة التأمين");
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground text-xs">جارٍ تحميل شركات التأمين...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">شركات التأمين</h2>
          <p className="text-xs text-muted-foreground">إدارة شركات التأمين التعاقدية وربطها بقوائم الأسعار المعمول بها</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>شركة جديدة</span>
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

      {companies.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl p-12 text-center text-muted-foreground">
          <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs">لا توجد شركات تأمين مضافة بعد</p>
        </div>
      ) : (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-[11px] font-medium">
                  <th className="text-right py-2.5 px-3">اسم الشركة</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">قائمة الأسعار</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">رقم الهاتف</th>
                  <th className="text-right py-2.5 px-3">الفاكس</th>
                  <th className="text-right py-2.5 px-3">المسؤول</th>
                  <th className="text-right py-2.5 px-3">الحالة</th>
                  <th className="text-right py-2.5 px-3">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {c.priceList ? (
                        <span className="text-primary font-medium">{c.priceList.name}</span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-muted-foreground" dir="ltr">
                      {c.phone1 || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground" dir="ltr">
                      {c.fax || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {c.contactName ? (
                        <div>
                          <div className="text-foreground font-medium">{c.contactName}</div>
                          {c.contactPhone && (
                            <div className="text-[10px] text-muted-foreground font-mono tabular-nums" dir="ltr">
                              {c.contactPhone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {c.isActive ? "نشط" : "معطلة"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCompany(c)}
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

      {form && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-card border border-border/70 rounded-2xl shadow-xl w-full max-w-lg p-5 text-foreground space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-sm font-bold text-foreground">
                {form.id ? "تعديل شركة تأمين" : "شركة تأمين جديدة"}
              </h3>
              <button onClick={() => setForm(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">الاسم</label>
                <input
                  className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="اسم شركة التأمين (مثال: بوبا للتأمين الطبي)"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">قائمة الأسعار المربوطة</label>
                <select
                  className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={form.priceListId}
                  onChange={e => setForm({ ...form, priceListId: e.target.value })}
                >
                  <option value="">بدون قائمة أسعار (استخدام الأسعار الأساسية)</option>
                  {priceLists
                    .filter(l => l.isActive || l.id === form.priceListId)
                    .map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">رقم الهاتف</label>
                  <input
                    className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                    value={form.phone1}
                    onChange={e => setForm({ ...form, phone1: e.target.value })}
                    placeholder="02..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">الفاكس</label>
                  <input
                    className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                    value={form.fax}
                    onChange={e => setForm({ ...form, fax: e.target.value })}
                    placeholder="02..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">اسم مسؤول التواصل</label>
                  <input
                    className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    value={form.contactName}
                    onChange={e => setForm({ ...form, contactName: e.target.value })}
                    placeholder="اسم المسؤول"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">تليفون المسؤول</label>
                  <input
                    className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
                    value={form.contactPhone}
                    onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="01..."
                  />
                </div>
              </div>
              {form.id && (
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-border/70 text-primary focus:ring-primary/40"
                  />
                  <span>مفعّلة ونشطة</span>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
              <button
                onClick={() => setForm(null)}
                className="px-3 py-1.5 text-xs border border-border/70 text-foreground rounded-xl hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={saveCompany}
                disabled={saving || !form.name.trim()}
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
