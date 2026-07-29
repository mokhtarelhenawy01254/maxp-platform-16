import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  BellIcon,
  BellSlashIcon,
} from "@heroicons/react/24/outline";

interface Template {
  id: string;
  name: string;
  content: string;
  eventType: string;
  isActive: boolean;
  buttons?: string;
  hasButtons?: boolean;
}

interface StatusWithTemplate {
  id: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  notifyCustomer: boolean;
  isSystemStatus: boolean;
  template: Template | null;
  hasTemplate: boolean;
}

interface TemplateFormState {
  name: string;
  content: string;
  isActive: boolean;
}

const emptyTemplateForm = (): TemplateFormState => ({
  name: "",
  content: "",
  isActive: true,
});

const DEFAULT_TEMPLATE_CONTENT = `مرحباً {{customerName}} 👋

نود إعلامك أن حالة طلبك رقم {{orderNumber}} قد تغيرت إلى: *{{status}}*

{{orderItems}}
شكراً لتعاملك معنا! ✨`;

export default function OrderStatusTemplatesPage() {
  const { t, i18n } = useTranslation();
  const [statuses, setStatuses] = useState<StatusWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusWithTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/order-status/with-templates");
      if (res.data?.success) {
        setStatuses(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch statuses with templates", err);
      toast.error(t("orders.loadError", "حدث خطأ في تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("orders.statusTemplatesTitle", "قوالب الواتساب للحالات")} | MaxP`;
    fetchData();
  }, [fetchData, t]);

  const openCreateDialog = (status: StatusWithTemplate) => {
    setSelectedStatus(status);
    setTemplateForm({
      name: `قالب ${status.name}`,
      content: DEFAULT_TEMPLATE_CONTENT,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (status: StatusWithTemplate) => {
    setSelectedStatus(status);
    setTemplateForm({
      name: status.template?.name || `قالب ${status.name}`,
      content: status.template?.content || DEFAULT_TEMPLATE_CONTENT,
      isActive: status.template?.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedStatus) return;
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "محتوى الرسالة مطلوب"));
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!selectedStatus.template?.id;
      const payload = {
        category: "ORDERS",
        eventType: selectedStatus.code,
        name: templateForm.name,
        content: templateForm.content,
        isActive: templateForm.isActive,
      };

      if (isEdit) {
        await apiClient.put(`/whatsapp/notifications/templates/${selectedStatus.template!.id}`, payload);
        toast.success(t("orders.templateUpdated", "تم تحديث القالب بنجاح"));
      } else {
        await apiClient.post("/whatsapp/notifications/templates", payload);
        toast.success(t("orders.templateCreated", "تم إنشاء القالب بنجاح"));
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to save template", err);
      toast.error(err?.response?.data?.message || t("orders.templateSaveError", "حدث خطأ في حفظ القالب"));
    } finally {
      setSaving(false);
    }
  };

  const toggleNotify = async (status: StatusWithTemplate) => {
    setTogglingId(status.id);
    try {
      await apiClient.put(`/order-status/${status.id}`, {
        notifyCustomer: !status.notifyCustomer,
      });
      setStatuses((prev) =>
        prev.map((s) =>
          s.id === status.id ? { ...s, notifyCustomer: !s.notifyCustomer } : s
        )
      );
      toast.success(
        status.notifyCustomer
          ? t("orders.notifyDisabled", "تم إيقاف الإشعار لهذه الحالة")
          : t("orders.notifyEnabled", "تم تفعيل الإشعار لهذه الحالة")
      );
    } catch (err: any) {
      console.error("Failed to toggle notifyCustomer", err);
      toast.error(err?.response?.data?.message || t("orders.toggleError", "حدث خطأ في تحديث الإشعار"));
    } finally {
      setTogglingId(null);
    }
  };

  const statusesWithoutTemplate = statuses.filter((s) => !s.hasTemplate);
  const statusesWithTemplate = statuses.filter((s) => s.hasTemplate);
  const hasGaps = statusesWithoutTemplate.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("orders.statusTemplatesTitle", "قوالب الواتساب للحالات")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("orders.statusTemplatesDesc", "إدارة قوالب رسائل الواتساب المرتبطة بحالات الطلبات")}
        </p>
      </div>

      {hasGaps && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            {t("orders.statusTemplatesGap", {
              defaultValue: "{{count}} حالة بدون قالب واتساب",
              count: statusesWithoutTemplate.length,
            })}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
          <p>{t("common.loading", "جار التحميل...")}</p>
        </div>
      ) : statuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-20 text-center dark:border-white/10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
            <DocumentTextIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-300">
            {t("orders.noStatuses", "لا توجد حالات طلبات")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {statuses.map((status) => {
            const hasTemplate = status.hasTemplate;
            return (
              <div
                key={status.id}
                className="group rounded-xl border border-slate-200/70 bg-white p-4 transition hover:shadow-sm dark:border-white/10 dark:bg-slate-900/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: status.color || "#6B7280" }}
                    >
                      {status.sortOrder}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {status.name}
                        </span>
                        {status.isSystemStatus && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {t("orders.system", "نظامي")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{status.code}</span>
                        <button
                          onClick={() => toggleNotify(status)}
                          disabled={togglingId === status.id}
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                            status.notifyCustomer
                              ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
                          }`}
                        >
                          {togglingId === status.id ? (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : status.notifyCustomer ? (
                            <BellIcon className="h-3.5 w-3.5" />
                          ) : (
                            <BellSlashIcon className="h-3.5 w-3.5" />
                          )}
                          {status.notifyCustomer
                            ? t("orders.notifyOn", "الإشعار مفعل")
                            : t("orders.notifyOff", "الإشعار متوقف")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {hasTemplate ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        {t("orders.hasTemplate", "يوجد قالب")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <XCircleIcon className="h-3.5 w-3.5" />
                        {t("orders.noTemplate", "بدون قالب")}
                      </span>
                    )}

                    {hasTemplate ? (
                      <button
                        onClick={() => openEditDialog(status)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        {t("common.edit", "تعديل")}
                      </button>
                    ) : (
                      <button
                        onClick={() => openCreateDialog(status)}
                        disabled={!status.notifyCustomer}
                        title={
                          !status.notifyCustomer
                            ? t("orders.enableNotifyFirst", "فعّل إرسال الإشعار أولاً من إعدادات الحالة")
                            : ""
                        }
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          status.notifyCustomer
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        }`}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        {t("orders.createTemplate", "إضافة قالب")}
                      </button>
                    )}
                  </div>
                </div>

                {hasTemplate && status.template?.content && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30">
                    <p className="mb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {t("orders.templatePreview", "معاينة القالب")}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                      {status.template.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && selectedStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedStatus.template?.id
                ? t("orders.editTemplateFor", "تعديل قالب: {{name}}", { name: selectedStatus.name })
                : t("orders.createTemplateFor", "إنشاء قالب: {{name}}", { name: selectedStatus.name })}
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("orders.eventType", "نوع الحدث")}
                </label>
                <input
                  type="text"
                  value={selectedStatus.code}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("orders.templateName", "اسم القالب")}
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder={t("orders.templateNamePlaceholder", "مثال: قالب تأكيد الطلب")}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("orders.messageContent", "محتوى الرسالة")}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, content: e.target.value }))}
                  rows={8}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder={t("orders.messageContentPlaceholder", "اكتب رسالتك هنا...")}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {t("orders.templateVariables", "المتغيرات المتاحة:")} {"{{customerName}}, {{orderNumber}}, {{status}}, {{orderItems}}, {{total}}"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="template-active"
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="template-active" className="text-sm text-slate-700 dark:text-slate-300">
                  {t("orders.templateActive", "قالب نشط")}
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("common.cancel", "إلغاء")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !templateForm.content.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {t("common.save", "حفظ")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
