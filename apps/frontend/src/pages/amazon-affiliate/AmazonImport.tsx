import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  DownloadCloud, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Sparkles,
  Layers
} from "lucide-react";
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
        setPreviewError("تعذر جلب تفاصيل المنتج الدقيقة من المصدر — سيتم تسجيله ببيانات افتراضية قابلة للتعديل لاحقاً.");
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "فشل فحص الرابط — يرجى التأكد من صلاحية رابط المنتج أو كود ASIN التابع لأمازون";
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
      toast.error("يرجى إدخال رابط أو كود ASIN واحد على الأقل للبدء");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const data = await importAmazonProducts(lines);
      setResult({ succeeded: data.succeeded, failed: data.failed, status: data.status, errors: data.errors });
      if (data.succeeded > 0) toast.success(`تم استيراد ${data.succeeded} منتج بنجاح إلى كتالوج المتجر`);
      if (data.failed > 0) toast.error(`فشل استيراد ${data.failed} منتج — يرجى مراجعة الأخطاء`);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "فشلت عملية الاستيراد";
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/amazon-affiliate/products"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">استيراد منتجات أمازون</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                إضافة سريعة للمنتجات عبر روابط صفحات الشراء أو أكواد ASIN المباشرة
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/amazon-affiliate/products"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span>عرض المنتجات المستوردة</span>
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Bulk Import Section */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <DownloadCloud className="w-4 h-4 text-primary" />
              <span>الاستيراد الجماعي بالروابط أو ASIN</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              يدعم amazon.eg, amazon.sa, amazon.com وغيرها
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            الصق روابط المنتجات أو أكواد الـ ASIN — سطر واحد لكل منتج. سيقوم النظام باستخلاص البيانات وربطها بمعرف الإحالة الخاص بك تلقائياً.
          </p>

          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            dir="ltr"
            rows={5}
            placeholder={"https://www.amazon.eg/dp/B0BMKLJW22\nhttps://www.amazon.sa/dp/B08N5WRWNW\nB07VGRJDFY"}
            className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-sm"
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
              <span>{importing ? "جارِ استيراد المنتجات..." : "بدء استيراد المنتجات"}</span>
            </button>

            {result && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                result.failed === 0 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}>
                {result.failed === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>نجح: {result.succeeded} — فشل: {result.failed} ({result.status})</span>
              </span>
            )}
          </div>

          {result?.errors && result.errors.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
              <span className="text-[11px] font-bold text-destructive block">تفاصيل أخطاء الاستيراد:</span>
              <ul className="space-y-0.5 text-[11px] text-destructive/80 font-mono">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Live Preview / Resolver Section */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Search className="w-4 h-4 text-primary" />
              <span>فحص ومعاينة المنتج قبل الاستيراد</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              تحقق من صحة الرابط وجلب الاسم والسعر التقديري
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResolve()}
              placeholder="https://www.amazon.eg/dp/B0XXXXXXX أو ASIN"
              className="flex-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-mono text-left focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleResolve}
              disabled={previewing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/20 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 text-muted-foreground ${previewing ? 'animate-spin' : ''}`} />
              <span>{previewing ? "جارِ الفحص..." : "فحص الرابط"}</span>
            </button>
          </div>

          {preview && (
            <div className="flex items-start gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
              {preview.data?.imageUrl ? (
                <img 
                  src={preview.data.imageUrl} 
                  alt={preview.data?.name || "product"} 
                  className="h-20 w-20 rounded-lg object-contain bg-background border border-border/40 shrink-0" 
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-background border border-border/40 flex items-center justify-center text-muted-foreground shrink-0">
                  <Package className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-1.5 min-w-0 flex-1">
                <p className="font-bold text-xs text-foreground leading-snug">
                  {preview.data?.name || "بدون اسم محدد (سيتم الاستيراد بالبيانات العامة المتاحة)"}
                </p>
                <p className="text-xs font-semibold font-mono tabular-nums text-primary">
                  {preview.data?.price != null ? `${preview.data.price} ${preview.data.currency || ""}` : "السعر غير محدد"}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono" dir="ltr">
                  <span>{preview.asin}</span>
                  <span>·</span>
                  <span>{preview.marketplace}</span>
                </div>
                {preview.amazonUrl && (
                  <a 
                    href={preview.amazonUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono" 
                    dir="ltr"
                  >
                    <span className="truncate max-w-sm">{preview.amazonUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {previewError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmazonImportPage;