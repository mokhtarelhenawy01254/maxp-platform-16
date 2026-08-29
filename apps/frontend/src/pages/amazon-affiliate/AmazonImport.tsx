import React, { useState } from "react";
import { toast } from "sonner";
import {
  importAmazonProducts,
  resolveAmazonProduct,
  type AmazonResolvePreview,
} from "../../services/amazonAffiliateService";

const AmazonImportPage: React.FC = () => {
  const [urls, setUrls] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number; status: string; errors?: string[] } | null>(null);

  const [previewInput, setPreviewInput] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<AmazonResolvePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!previewInput.trim()) return;
    setPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const data = await resolveAmazonProduct(previewInput.trim());
      setPreview(data);
      if (!data.data) {
        setPreviewError("تعذر جلب بيانات المنتج — هيتسجل ببيانات عامة ويمكنك تعديلها لاحقًا.");
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "فشل فحص الرابط — تأكد أنه رابط منتج أمازون صالح";
      setPreviewError(message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    const lines = urls
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("أدخل رابط أو ASIN واحد على الأقل");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const data = await importAmazonProducts(lines);
      setResult({ succeeded: data.succeeded, failed: data.failed, status: data.status, errors: data.errors });
      if (data.succeeded > 0) toast.success(`تم استيراد ${data.succeeded} منتج بنجاح`);
      if (data.failed > 0) toast.error(`فشل ${data.failed} منتج`);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "فشل الاستيراد";
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">استيراد منتجات أمازون</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">استيراد بالرابط أو ASIN</h2>
        <p className="mb-4 text-sm text-gray-500">
          الصق روابط منتجات أمازون أو أكواد ASIN — كل سطر منتج. يمكنك الاستيراد من أي سوق أمازون (amazon.eg،
          amazon.sa، amazon.com ...).
        </p>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          dir="ltr"
          rows={6}
          placeholder={"https://www.amazon.eg/dp/B0XXXXXXX\nhttps://www.amazon.sa/dp/B0YYYYYYY\nB0ZZZZZZZZ"}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={importing}
            className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {importing ? "جارِ الاستيراد..." : "استيراد المنتجات"}
          </button>
          {result && (
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${result.failed === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              نجح: {result.succeeded} — فشل: {result.failed} ({result.status})
            </span>
          )}
        </div>
        {result?.errors && result.errors.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-red-600">
            {result.errors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">فحص منتج قبل الاستيراد</h2>
        <p className="mb-4 text-sm text-gray-500">
          الصق رابط أو ASIN وشوف البيانات اللي هتتسجل (الاسم والسعر والصورة) قبل ما تستورده.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            dir="ltr"
            value={previewInput}
            onChange={(e) => setPreviewInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResolve()}
            placeholder="https://www.amazon.eg/dp/B0XXXXXXX أو ASIN"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
          />
          <button
            onClick={handleResolve}
            disabled={previewing}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {previewing ? "جارِ الفحص..." : "فحص"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 flex gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
            {preview.data?.imageUrl && (
              <img src={preview.data.imageUrl} alt={preview.data?.name || "product"} className="h-20 w-20 rounded-lg object-contain" />
            )}
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{preview.data?.name || "بدون اسم (سيتم التسجيل ببيانات عامة)"}</p>
              <p className="text-gray-600">
                {preview.data?.price != null ? `${preview.data.price} ${preview.data.currency || ""}` : "السعر غير متاح"}
              </p>
              <p className="text-xs text-gray-400" dir="ltr">{preview.asin} · {preview.marketplace}</p>
              {preview.amazonUrl && (
                <a href={preview.amazonUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline" dir="ltr">
                  {preview.amazonUrl}
                </a>
              )}
            </div>
          </div>
        )}
        {previewError && <p className="mt-3 text-xs text-amber-600">{previewError}</p>}
      </section>
    </div>
  );
};

export default AmazonImportPage;