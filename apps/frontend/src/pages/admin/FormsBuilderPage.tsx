import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Plus, FileText, Eye, BarChart3, Copy, Trash2, Loader2, Users, MousePointerClick, TrendingUp, ExternalLink, X } from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormDefinition {
  id: string;
  title: string;
  slug: string;
  description?: string;
  fields: FormField[];
  pixelId?: string;
  pixelToken?: string;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  _count?: { submissions: number };
  thankYouTitle?: string;
  thankYouBody?: string;
  submitLabel?: string;
}

interface Submission {
  id: string;
  data: Record<string, string>;
  customerId?: string;
  ip?: string;
  createdAt: string;
  customer?: { id: string; firstName: string; lastName: string; phone: string };
}

interface Analytics {
  totalViews: number;
  totalSubmissions: number;
  todaySubmissions: number;
  conversionRate: number;
  last7Days: { date: string; submissions: number }[];
}

const FIELD_TYPES = [
  { value: "text", label: "نص", labelEn: "Text" },
  { value: "email", label: "بريد إلكتروني", labelEn: "Email" },
  { value: "phone", label: "رقم هاتف", labelEn: "Phone" },
  { value: "textarea", label: "نص طويل", labelEn: "Textarea" },
  { value: "select", label: "اختيار من قائمة", labelEn: "Select" },
];

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data;
};

function FieldBuilder({ fields, onChange }: { fields: FormField[]; onChange: (f: FormField[]) => void }) {
  const addField = () => {
    const newField: FormField = { id: `field_${Date.now()}`, type: "text", label: "", required: false };
    onChange([...fields, newField]);
  };
  const removeField = (id: string) => onChange(fields.filter((f) => f.id !== id));
  const updateField = (id: string, updates: Partial<FormField>) => onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <span className="text-gray-400 text-sm mt-2 min-w-[20px]">{i + 1}</span>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="اسم الحقل" className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600" />
            <select value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FormField["type"] })} className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600">
              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={field.placeholder || ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="نص تلميحي" className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600" />
            {field.type === "select" && (
              <input value={(field.options || []).join(", ")} onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="خيارات (مفصولة بفواصل)" className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600" />
            )}
          </div>
          <label className="flex items-center gap-1 text-xs whitespace-nowrap mt-1">
            <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="rounded" />
            إجباري
          </label>
          <button onClick={() => removeField(field.id)} className="text-red-500 hover:text-red-700 mt-1"><X size={16} /></button>
        </div>
      ))}
      <button onClick={addField} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">+ إضافة حقل</button>
    </div>
  );
}

function FormModal({ form, onClose, onSave }: { form?: FormDefinition | null; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState(form?.title || "");
  const [slug, setSlug] = useState(form?.slug || "");
  const [description, setDescription] = useState(form?.description || "");
  const [fields, setFields] = useState<FormField[]>(form?.fields || []);
  const [pixelId, setPixelId] = useState(form?.pixelId || "");
  const [pixelToken, setPixelToken] = useState(form?.pixelToken || "");
  const [thankYouTitle, setThankYouTitle] = useState(form?.thankYouTitle || "شكراً لك!");
  const [thankYouBody, setThankYouBody] = useState(form?.thankYouBody || "سيتم التواصل معك قريباً");
  const [submitLabel, setSubmitLabel] = useState(form?.submitLabel || "إرسال");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return tToast.error("FormsBuilderPage.msg_da6d");
    if (!slug.trim()) return tToast.error("FormsBuilderPage.msg_a286");
    if (fields.length === 0) return tToast.error("FormsBuilderPage.msg_ed2d");
    if (fields.some((f) => !f.label.trim())) return tToast.error("FormsBuilderPage.msg_6b79");

    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", ...tokenManager.createAuthHeaders() };
      const body = { title: title.trim(), slug: slug.trim(), description, fields, pixelId: pixelId.trim() || undefined, pixelToken: pixelToken.trim() || undefined, thankYouTitle, thankYouBody, submitLabel };
      if (form) {
        await fetchJson(buildApiUrl(`/forms/${form.id}`), { method: "PUT", headers, body: JSON.stringify(body) });
        tToast.success("FormsBuilderPage.success_update_4ef5");
      } else {
        await fetchJson(buildApiUrl("/forms"), { method: "POST", headers, body: JSON.stringify(body) });
        tToast.success("FormsBuilderPage.success_create_ad1a");
      }
      onSave();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const genSlug = (t: string) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">{form ? "تعديل النموذج" : "نموذج جديد"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">عنوان النموذج</label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); if (!form) setSlug(genSlug(e.target.value)); }} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الرابط المختصر</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 whitespace-nowrap">/forms/</span>
                <input value={slug} onChange={(e) => setSlug(genSlug(e.target.value))} className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 font-mono text-sm" dir="ltr" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">معرّف Facebook Pixel</label>
              <input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="مثال: 1234567890" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 font-mono text-sm" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نص زر الإرسال</label>
              <input value={submitLabel} onChange={(e) => setSubmitLabel(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نص شكراً</label>
              <input value={thankYouTitle} onChange={(e) => setThankYouTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رسالة شكر</label>
            <input value={thankYouBody} onChange={(e) => setThankYouBody(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">الحقول</label>
              <span className="text-xs text-gray-400">{fields.length} حقل</span>
            </div>
            <FieldBuilder fields={fields} onChange={setFields} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin inline" /> : null} {form ? "تحديث" : "إنشاء"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionModal({ formId, onClose }: { formId: string; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const headers = tokenManager.createAuthHeaders();
        const data = await fetchJson(buildApiUrl(`/forms/${formId}/submissions`), { headers });
        setSubmissions(data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [formId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">الردود</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">لا توجد ردود بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-right p-2">#</th>
                    {Object.keys(submissions[0]?.data || {}).slice(0, 4).map((k) => <th key={k} className="text-right p-2">{k}</th>)}
                    <th className="text-right p-2">العميل</th>
                    <th className="text-right p-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={s.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 text-gray-400">{i + 1}</td>
                      {Object.values(s.data).slice(0, 4).map((v, j) => <td key={j} className="p-2">{String(v).substring(0, 30)}</td>)}
                      <td className="p-2">{s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : "-"}</td>
                      <td className="p-2 text-gray-500 text-xs">{new Date(s.createdAt).toLocaleDateString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsModal({ formId, onClose }: { formId: string; onClose: () => void }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const headers = tokenManager.createAuthHeaders();
        const data = await fetchJson(buildApiUrl(`/forms/${formId}/analytics`), { headers });
        setAnalytics(data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [formId]);

  const maxVal = Math.max(...(analytics?.last7Days?.map((d) => d.submissions) || [1]), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">التحليلات</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                  <MousePointerClick size={20} className="mx-auto mb-1 text-blue-500" />
                  <div className="text-2xl font-bold">{analytics.totalViews}</div>
                  <div className="text-xs text-gray-500">زيارات</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                  <Users size={20} className="mx-auto mb-1 text-green-500" />
                  <div className="text-2xl font-bold">{analytics.totalSubmissions}</div>
                  <div className="text-xs text-gray-500">تسجيلات</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                  <TrendingUp size={20} className="mx-auto mb-1 text-purple-500" />
                  <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
                  <div className="text-xs text-gray-500">تحويل</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
                  <BarChart3 size={20} className="mx-auto mb-1 text-orange-500" />
                  <div className="text-2xl font-bold">{analytics.todaySubmissions}</div>
                  <div className="text-xs text-gray-500">اليوم</div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-3">آخر 7 أيام</h3>
                <div className="flex items-end gap-2 h-32">
                  {analytics.last7Days.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${(d.submissions / maxVal) * 100}%`, minHeight: d.submissions > 0 ? "4px" : "0" }} />
                      <span className="text-xs text-gray-400">{d.submissions}</span>
                      <span className="text-[10px] text-gray-400">{new Date(d.date).toLocaleDateString("ar-EG", { weekday: "short" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const FormsBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState<FormDefinition | null>(null);
  const [submissionsFormId, setSubmissionsFormId] = useState<string | null>(null);
  const [analyticsFormId, setAnalyticsFormId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadForms = useCallback(async () => {
    try {
      const headers = tokenManager.createAuthHeaders();
      const data = await fetchJson(buildApiUrl("/forms"), { headers });
      setForms(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadForms(); }, [loadForms]);

  const handleDelete = async (form: FormDefinition) => {
    if (!confirm(`حذف النموذج "${form.title}"؟`)) return;
    try {
      const headers = { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" };
      await fetchJson(buildApiUrl(`/forms/${form.id}`), { method: "DELETE", headers });
      tToast.success("FormsBuilderPage.success_delete_49c8");
      loadForms();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyPublicUrl = (slug: string) => {
    const cid = user?.companyId ? `?companyId=${user.companyId}` : "";
    navigator.clipboard.writeText(`${window.location.origin}/forms/${slug}${cid}`);
    tToast.success("FormsBuilderPage.msg_d548");
  };

  const filtered = forms.filter((f) => f.title.includes(search) || f.slug.includes(search));

  const totalViews = forms.reduce((s, f) => s + f.viewCount, 0);
  const totalSubmissions = forms.reduce((s, f) => s + (f._count?.submissions || 0), 0);
  const totalForms = forms.length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">نماذج التسجيل</h1>
          <p className="text-sm text-gray-500">إنشاء وإدارة نماذج جمع البيانات مع ربط Facebook Pixel</p>
        </div>
        <button onClick={() => { setEditForm(null); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          <Plus size={18} /> نموذج جديد
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700">
          <FileText size={20} className="text-blue-500 mb-1" />
          <div className="text-2xl font-bold">{totalForms}</div>
          <div className="text-sm text-gray-500">إجمالي النماذج</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700">
          <MousePointerClick size={20} className="text-purple-500 mb-1" />
          <div className="text-2xl font-bold">{totalViews}</div>
          <div className="text-sm text-gray-500">إجمالي الزيارات</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700">
          <Users size={20} className="text-green-500 mb-1" />
          <div className="text-2xl font-bold">{totalSubmissions}</div>
          <div className="text-sm text-gray-500">إجمالي التسجيلات</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في النماذج..." className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={48} className="mx-auto mb-2 opacity-50" />
            <p>{search ? "لا توجد نتائج" : "لا توجد نماذج بعد. أنشئ أول نموذج!"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 text-gray-500">
                  <th className="text-right p-3">النموذج</th>
                  <th className="text-right p-3">الرابط</th>
                  <th className="text-center p-3">الزيارات</th>
                  <th className="text-center p-3">التسجيلات</th>
                  <th className="text-center p-3">التحويل</th>
                  <th className="text-center p-3">الحالة</th>
                  <th className="text-left p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((form) => {
                  const subs = form._count?.submissions || 0;
                  const conv = form.viewCount > 0 ? ((subs / form.viewCount) * 100).toFixed(1) : "0";
                  return (
                    <tr key={form.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-3 font-medium">{form.title}</td>
                      <td className="p-3">
                        <button onClick={() => copyPublicUrl(form.slug)} className="text-blue-600 hover:text-blue-800 text-xs font-mono flex items-center gap-1" dir="ltr">
                          /forms/{form.slug} <Copy size={12} />
                        </button>
                      </td>
                      <td className="p-3 text-center">{form.viewCount}</td>
                      <td className="p-3 text-center">{subs}</td>
                      <td className="p-3 text-center">{conv}%</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${form.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                          {form.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditForm(form); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="تعديل"><FileText size={16} /></button>
                          <button onClick={() => setSubmissionsFormId(form.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="الردود"><Users size={16} /></button>
                          <button onClick={() => setAnalyticsFormId(form.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="التحليلات"><BarChart3 size={16} /></button>
                          <a href={`/forms/${form.slug}${user?.companyId ? `?companyId=${user.companyId}` : ""}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="عرض"><ExternalLink size={16} /></a>
                          <button onClick={() => handleDelete(form)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500" title="حذف"><Trash2 size={16} /></button>
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

      {showModal && <FormModal form={editForm} onClose={() => { setShowModal(false); setEditForm(null); }} onSave={() => { setShowModal(false); setEditForm(null); loadForms(); }} />}
      {submissionsFormId && <SubmissionModal formId={submissionsFormId} onClose={() => setSubmissionsFormId(null)} />}
      {analyticsFormId && <AnalyticsModal formId={analyticsFormId} onClose={() => setAnalyticsFormId(null)} />}
    </div>
  );
};

export default FormsBuilderPage;
