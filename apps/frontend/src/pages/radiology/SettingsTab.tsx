import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes, FileText, Loader2, Pencil, Plus, RefreshCw, Tag, Trash2, X as XMarkIcon } from "lucide-react";
import { api, fetchJson, RadiologyReportTemplate, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface TemplateForm {
  id?: string;
  name: string;
  body: string;
}

interface TagForm {
  id?: string;
  name: string;
}

interface ExamTag {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Modality {
  category: string;
  count: number;
}

const emptyForm = (): TemplateForm => ({ name: "", body: "" });
const emptyTagForm = (): TagForm => ({ name: "" });

export default function SettingsTab() {
  const [templates, setTemplates] = useState<RadiologyReportTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<TemplateForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [tags, setTags] = useState<ExamTag[] | null>(null);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagModal, setTagModal] = useState<TagForm | null>(null);
  const [savingTag, setSavingTag] = useState(false);

  const [modalities, setModalities] = useState<Modality[] | null>(null);
  const [modalitiesLoading, setModalitiesLoading] = useState(true);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<RadiologyReportTemplate[]>(api("report-templates"));
      setTemplates(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل القوالب");
    }
  }, []);

  const refreshTags = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<ExamTag[]>(api("exam-tags"));
      setTags(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل تاجات الإكزام");
    }
  }, []);

  const refreshModalities = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchJson<Modality[]>(api("modalities"));
      setModalities(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل الموديولات");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    setTagsLoading(true);
    refreshTags().finally(() => setTagsLoading(false));
    setModalitiesLoading(true);
    refreshModalities().finally(() => setModalitiesLoading(false));
  }, [refresh, refreshTags, refreshModalities]);

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { toast.error("اسم القالب مطلوب"); return; }
    if (!modal.body.trim()) { toast.error("نص القالب مطلوب"); return; }
    setSaving(true);
    try {
      const payload = { name: modal.name.trim(), body: modal.body.trim() };
      if (modal.id) {
        await fetchJson(api(`report-templates/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("report-templates"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(modal.id ? "تم تحديث القالب" : "تم إنشاء القالب");
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: RadiologyReportTemplate) => {
    if (!window.confirm(`حذف القالب "${t.name}"؟`)) return;
    try {
      await fetchJson(api(`report-templates/${t.id}`), { method: "DELETE" });
      toast.success("تم حذف القالب");
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  };

  const saveTag = async () => {
    if (!tagModal || savingTag) return;
    if (!tagModal.name.trim()) { toast.error("اسم التاج مطلوب"); return; }
    setSavingTag(true);
    try {
      const payload = { name: tagModal.name.trim() };
      if (tagModal.id) {
        await fetchJson(api(`exam-tags/${tagModal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("exam-tags"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(tagModal.id ? "تم تحديث التاج" : "تم إنشاء التاج");
      setTagModal(null);
      await refreshTags({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSavingTag(false);
    }
  };

  const removeTag = async (t: ExamTag) => {
    if (!window.confirm(`حذف التاج "${t.name}"؟`)) return;
    try {
      await fetchJson(api(`exam-tags/${t.id}`), { method: "DELETE" });
      toast.success("تم حذف التاج");
      await refreshTags({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">الإعدادات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">قوالب التقارير الجاهزة لاستخدامها عند كتابة التقرير</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
          <button onClick={() => setModal(emptyForm())} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />قالب جديد
          </button>
        </div>
      </div>

      {loading && !templates ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : templates === null || templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          لا توجد قوالب تقارير بعد — أنشئ قالباً جاهزاً لتسريع كتابة التقارير
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{t.name}</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setModal({ id: t.id, name: t.name, body: t.body })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(t)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-4">{t.body}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Tag className="w-5 h-5" />تاجات الإكزام</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">تاجات لتصنيف الفحوصات والدراسات</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refreshTags()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw className="w-4 h-4" />تحديث
            </button>
            <button onClick={() => setTagModal(emptyTagForm())} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" />تاج جديد
            </button>
          </div>
        </div>

        {tagsLoading && !tags ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : tags === null || tags.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
            <Tag className="w-10 h-10 mx-auto mb-3" />
            لا توجد تاجات بعد — أنشئ تاجاً لتصنيف الفحوصات
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tags.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold">{t.name}</h3>
                    {!t.isActive && <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full">معطل</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setTagModal({ id: t.id, name: t.name })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => removeTag(t)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Boxes className="w-5 h-5" />الموديولات</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">أجهزة الأشعة المتاحة حسب أنواع الفحوصات</p>
          </div>
          <button onClick={() => refreshModalities()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
        </div>

        {modalitiesLoading && !modalities ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : modalities === null || modalities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
            <Boxes className="w-10 h-10 mx-auto mb-3" />
            لا توجد موديولات — أضف أنواع فحوصات بالفئة أولاً
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {modalities.map(m => (
              <div key={m.category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <h3 className="font-bold mb-1">{m.category}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{m.count} نوع فحص</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-w-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل القالب" : "قالب تقرير جديد"}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">اسم القالب *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: أشعة صدر عادية" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">نص القالب *</label>
                <textarea className={`${MODAL_INPUT_CLS} min-h-[200px] resize-y`} value={modal.body} onChange={e => setModal({ ...modal, body: e.target.value })} placeholder="نص التقرير الافتراضي..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {tagModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setTagModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{tagModal.id ? "تعديل التاج" : "تاج جديد"}</h3>
              <button onClick={() => setTagModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">اسم التاج *</label>
              <input className={MODAL_INPUT_CLS} value={tagModal.name} onChange={e => setTagModal({ ...tagModal, name: e.target.value })} placeholder="مثال: طوارئ، مقطعية" onKeyDown={e => { if (e.key === "Enter") saveTag(); }} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setTagModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={saveTag} disabled={savingTag} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {savingTag && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
