import React, { useEffect, useState } from "react";
import {
  TableCellsIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";

interface PreviewRow {
  [key: string]: any;
}

const GoogleSheetsIntegration: React.FC = () => {
  const [sheetUrl, setSheetUrl] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importType, setImportType] = useState<"products" | "orders">("products");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  const token = tokenManager.getAccessToken();
  const importTypeLabel = importType === "products" ? "المنتجات" : "الطلبات";
  const importUnitLabel = importType === "products" ? "منتج" : "طلب";
  const requirementsText =
    importType === "products"
      ? "الأعمدة المطلوبة: name, price, stock, sku, category, description, images."
      : "الأعمدة المطلوبة: customer_name أو customer_phone، مع items أو (product_name + product_price + quantity). صيغة items: اسم|سعر|كمية|SKU مفصولة بـ ;";

  const loadWebhookSettings = async () => {
    if (!token) return;
    setLoadingWebhook(true);
    try {
      const response = await fetch("/api/v1/settings/company", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        const settings = data.data?.settings || {};
        const savedUrl = settings.googleSheetsWebhookUrl || "";
        setWebhookUrl(savedUrl);
        setWebhookEnabled(settings.googleSheetsWebhookEnabled ?? !!savedUrl);
      }
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل إعدادات الـ Webhook");
    } finally {
      setLoadingWebhook(false);
    }
  };

  const saveWebhookSettings = async () => {
    if (!token) return;
    setSavingWebhook(true);
    try {
      const response = await fetch("/api/v1/settings/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          settings: {
            googleSheetsWebhookUrl: webhookUrl.trim(),
            googleSheetsWebhookEnabled: webhookEnabled && !!webhookUrl.trim()
          }
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "تعذر حفظ الإعدادات");
      }

      toast.success("تم حفظ إعدادات الـ Webhook");
    } catch (error: any) {
      toast.error(error.message || "فشل حفظ إعدادات الـ Webhook");
    } finally {
      setSavingWebhook(false);
    }
  };

  useEffect(() => {
    loadWebhookSettings();
  }, [token]);

  const fetchPreview = async () => {
    if (!sheetUrl.trim()) {
      toast.error("أدخل رابط Google Sheets أولاً");
      return;
    }

    setLoadingPreview(true);
    setImportResult(null);
    try {
      const response = await fetch("/api/v1/google-sheets/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "فشل جلب البيانات");
      }

      setColumns(data.data.columns || []);
      setPreviewRows(data.data.sample || []);
      setTotalRows(data.data.totalRows || 0);
      toast.success("تم جلب المعاينة بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء جلب البيانات");
      setColumns([]);
      setPreviewRows([]);
      setTotalRows(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const importSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error("أدخل رابط Google Sheets أولاً");
      return;
    }

    setImporting(true);
    try {
      const endpoint =
        importType === "products"
          ? "/api/v1/google-sheets/import/products"
          : "/api/v1/google-sheets/import/orders";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "فشل الاستيراد");
      }

      setImportResult(data.data);
      toast.success(`تم استيراد ${importTypeLabel} بنجاح`);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  const downloadFile = async (url: string, fallbackName: string) => {
    setExporting(true);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("تعذر تنزيل الملف");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء التنزيل");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
            <TableCellsIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              الربط مع Google Sheets
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              استيراد المنتجات أو الطلبات مباشرة من Google Sheets
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            نوع الاستيراد:
          </span>
          <button
            onClick={() => setImportType("products")}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              importType === "products"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            منتجات
          </button>
          <button
            onClick={() => setImportType("orders")}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              importType === "orders"
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            طلبات
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              رابط Google Sheets
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              dir="ltr"
            />
          </div>
          <div className="flex flex-col gap-2 justify-end">
            <button
              onClick={fetchPreview}
              disabled={loadingPreview}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loadingPreview ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="w-5 h-5" />
              )}
              جلب المعاينة
            </button>
            <button
              onClick={importSheet}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {importing ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="w-5 h-5" />
              )}
              استيراد {importTypeLabel}
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
          شارك الملف كـ "Anyone with link" ثم ألصق الرابط هنا. {requirementsText}
        </div>

        {totalRows !== null && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            إجمالي الصفوف في الملف: {totalRows}
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              معاينة البيانات
            </h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full text-sm text-right">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {previewRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2 text-gray-700 dark:text-gray-200">
                          {String(row[col] ?? "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importResult && (
          <div className="mt-6 p-4 rounded-lg border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-medium">نتيجة الاستيراد</span>
            </div>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
              تم استيراد {importResult.imported} {importUnitLabel}، تخطي {importResult.skipped}، فشل {importResult.failed}.
            </div>
          </div>
        )}

        <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Webhook تلقائي للطلبات</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                عند تفعيل الـ Webhook سيتم إرسال كل طلب جديد مباشرة إلى Google Sheets.
              </p>
            </div>
            <button
              onClick={saveWebhookSettings}
              disabled={savingWebhook || loadingWebhook}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {savingWebhook ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                رابط Webhook (Google Apps Script)
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="googleSheetsWebhookEnabled"
                type="checkbox"
                checked={webhookEnabled}
                onChange={(e) => setWebhookEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label
                htmlFor="googleSheetsWebhookEnabled"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                تفعيل الإرسال التلقائي
              </label>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            سيتم إرسال بيانات الطلب بصيغة JSON وتشمل الحقول الأساسية وعناصر الطلب داخل `itemsText`.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <ArrowUpTrayIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              التصدير إلى Google Sheets
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              نزّل ملف CSV أو Excel وافتحه داخل Google Sheets
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">تصدير المنتجات</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              ملف CSV جاهز يمكن فتحه مباشرة في Google Sheets.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => downloadFile("/api/v1/google-sheets/export/products", "products.csv")}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                تنزيل CSV
              </button>
              <button
                onClick={() => downloadFile("/api/v1/google-sheets/template/products", "products-template.csv")}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              >
                <TableCellsIcon className="w-4 h-4" />
                تنزيل قالب جاهز
              </button>
            </div>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">تصدير الطلبات</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              يمكنك تنزيل CSV مباشرة أو Excel من النظام.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => downloadFile("/api/v1/google-sheets/export/orders", "orders.csv")}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                تنزيل CSV
              </button>
              <button
                onClick={() => downloadFile("/api/v1/google-sheets/template/orders", "orders-template.csv")}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <TableCellsIcon className="w-4 h-4" />
                تنزيل قالب جاهز
              </button>
              <button
                onClick={() => downloadFile("/api/v1/orders/export", "orders.xlsx")}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                تنزيل Excel
              </button>
            </div>
          </div>
        </div>

        {exporting && (
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            جاري تجهيز الملف...
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <ExclamationTriangleIcon className="w-4 h-4" />
          بعد التنزيل: افتح Google Sheets واختر "File → Import" ثم ارفع الملف.
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegration;
