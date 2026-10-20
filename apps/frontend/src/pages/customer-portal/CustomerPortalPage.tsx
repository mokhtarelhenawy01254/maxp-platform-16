import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  FileText,
  Calendar,
  AlertTriangle,
  RotateCw,
  ShieldCheck,
  CreditCard,
  Ruler,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  X,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  customerPortalApi,
  CustomerPortalOrderDetails,
  CustomerPortalContext,
  CustomerOrderStatus,
  CustomerOrderPaymentStatus,
} from '../manufacturing/manufacturingApi';

export const CustomerPortalPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ token?: string }>();

  // Resolve active token from either query param or path param
  const tokenFromUrl = routeParams.token || searchParams.get('token') || '';
  const [token, setToken] = useState<string>(tokenFromUrl);

  const [loading, setLoading] = useState<boolean>(true);
  const [orderDetails, setOrderDetails] = useState<CustomerPortalOrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lightbox modal for viewing published media
  const [activeMediaUrl, setActiveMediaUrl] = useState<{ url: string; caption?: string | null; kind: string } | null>(null);

  // Collapsible sections
  const [techPackExpanded, setTechPackExpanded] = useState<boolean>(false);
  const [sizeChartExpanded, setSizeChartExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (tokenFromUrl && tokenFromUrl !== token) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!token) {
        setLoading(false);
        setError('رمز الدخول لبوابة العميل مطلوب. يرجى استخدام الرابط المرسل إليك من قِبل إدارة الشركة.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await customerPortalApi.getOrderDetails(token);
        setOrderDetails(data);
      } catch (err: any) {
        console.error('Failed to load customer portal order data:', err);
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'رابط البوابة غير صالح أو انتهت صلاحيته.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [token]);

  const getStatusBadge = (status: CustomerOrderStatus) => {
    const config: Record<CustomerOrderStatus, { label: string; class: string }> = {
      DRAFT: { label: 'مسودة عقد', class: 'bg-muted text-muted-foreground border-border' },
      CONFIRMED: { label: 'مؤكد ومعتمد', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      IN_PRODUCTION: { label: 'قيد الإنتاج والتشغيل', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
      READY: { label: 'جاهز للتسليم', class: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
      DELIVERED: { label: 'تم التسليم بالكامل', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
      CANCELLED: { label: 'ملغي', class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
    };
    const c = config[status] || { label: status, class: 'bg-muted text-muted-foreground border-border' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.class}`}>
        {c.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: CustomerOrderPaymentStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" />
            <span>مدفوع</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>مستحق</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground border">
            <span>ملغي</span>
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-foreground flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-3 max-w-sm p-6 rounded-2xl bg-card border border-border/80 shadow-sm">
          <RotateCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-semibold text-foreground">جاري تحميل بيانات الطلب ومراحل الإنتاج...</p>
          <p className="text-xs text-muted-foreground">بوابة متابعة العميل الآمنة</p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-foreground flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-foreground">تعذر فتح بوابة العميل</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {error || 'رابط المتابعة غير صالح أو قد تم إيقافه من قِبل الإدارة.'}
            </p>
          </div>
          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground">
              يرجى التواصل مع ممثل خدمة العملاء الخاص بك لتزويدك برابط مباشر نشط.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    orderNumber,
    brandName,
    customerName,
    status,
    currency,
    contractedDeliveryDate,
    expectedDeliveryDate,
    isDelayed,
    progress,
    variantMatrix,
    updates,
    techPack,
    sizeChart,
    payments,
  } = orderDetails;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-950 text-foreground font-sans antialiased selection:bg-primary/20" dir="rtl">
      {/* Top Daylight Surface Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base sm:text-lg text-foreground tracking-tight">
                  {orderNumber}
                </span>
                {getStatusBadge(status)}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                <span>{brandName ? `${brandName}` : 'طلب عميل'}</span>
                {customerName && <span className="mr-1.5 text-foreground/80">• {customerName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-left">
            <span className="hidden sm:inline-block text-[11px] text-muted-foreground px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              بوابة العميل المعتمدة
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
        {/* Progress & Delivery Cockpit Card */}
        <section className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                التقدم العام للطلب
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-black text-3xl sm:text-4xl text-foreground tabular-nums tracking-tight">
                  {progress.percent}%
                </span>
                <span className="text-xs text-muted-foreground">
                  (أنجزت {progress.completedStages} من أصل {progress.totalStages || progress.stages.length} مرحلة معتمدة)
                </span>
              </div>
            </div>

            {/* Delivery Dates Box */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center gap-4">
              <div>
                <span className="text-[11px] text-muted-foreground block mb-0.5">موعد التسليم المتعاقد</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {contractedDeliveryDate
                      ? new Date(contractedDeliveryDate).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'قيد التحديد'}
                  </span>
                </div>
              </div>

              {expectedDeliveryDate && contractedDeliveryDate && (
                <div className="border-r border-neutral-200 dark:border-neutral-700 pr-4">
                  <span className="text-[11px] text-muted-foreground block mb-0.5">الموعد المتوقع</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>
                      {new Date(expectedDeliveryDate).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {isDelayed && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>تأخير متوقع</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${Math.max(5, progress.percent)}%` }}
              />
            </div>
          </div>

          {/* Stages Horizontal / Vertical Stepper */}
          {progress.stages.length > 0 && (
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <span className="text-xs font-bold text-foreground block">مراحل خط الإنتاج</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {progress.stages.map((stg, idx) => {
                  const isCompleted = stg.status === 'COMPLETED' || stg.status === 'FINISHED';
                  const isInProgress = stg.status === 'IN_PROGRESS';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                        isCompleted
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-200'
                          : isInProgress
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200/70 dark:border-neutral-700/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold truncate">{stg.name}</span>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : isInProgress ? (
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 shrink-0" />
                        )}
                      </div>

                      <div className="text-[11px] flex items-center justify-between font-mono">
                        <span>
                          {isCompleted ? 'مكتملة بالكامل' : isInProgress ? 'جارية حالياً' : 'مجدولة'}
                        </span>
                        {stg.completedQuantity > 0 && (
                          <span className="font-semibold text-foreground tabular-nums">
                            {stg.completedQuantity} ق
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Quantities & Variant Matrix (Product Breakdown) */}
        {variantMatrix.length > 0 && (
          <section className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">بيان المقاسات والألوان والكميات المعتمدة</h3>
                <p className="text-[11px] text-muted-foreground">تفاصيل الإنتاج الفعلي حسب التشكيلة التعاقدية</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-200/80 dark:border-neutral-800 text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">المقاس</th>
                    <th className="py-2.5 px-3 font-semibold">اللون</th>
                    <th className="py-2.5 px-3 font-semibold text-center">الكمية التعاقدية</th>
                    <th className="py-2.5 px-3 font-semibold text-center">الكمية المنفذة المعتمدة</th>
                    <th className="py-2.5 px-3 font-semibold text-left">نسبة الإنجاز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                  {variantMatrix.map((item, idx) => {
                    const rowPercent = item.quantity > 0 ? Math.min(100, Math.round((item.completedQuantity / item.quantity) * 100)) : 0;
                    return (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        <td className="py-2.5 px-3 font-bold text-foreground">{item.size}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{item.color}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-foreground tabular-nums">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          {item.completedQuantity.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-foreground tabular-nums">
                            {rowPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Published Media Gallery (PUBLISHED ONLY) */}
        <section className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">آخر التحديثات المصورة المنشورة</h3>
                <p className="text-[11px] text-muted-foreground">لقطات حية معتمدة من خط الإنتاج ومراحل الفحص والجودة</p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
              {updates.length} تحديث
            </span>
          </div>

          {updates.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700/70 space-y-1.5">
              <Sparkles className="w-6 h-6 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">لا توجد تحديثات مصورة منشورة حالياً</p>
              <p className="text-[11px] text-muted-foreground">
                يقوم فريق الإدارة بنشر صور وفيديوهات الفحص المعتمدة تباعاً مع تقدم كل مرحلة تشغيل.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {updates.map((update) => (
                <div
                  key={update.id}
                  onClick={() => setActiveMediaUrl({ url: update.url, caption: update.caption, kind: update.kind })}
                  className="group relative rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 cursor-pointer shadow-2xs hover:shadow-md transition"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    {update.kind === 'VIDEO' ? (
                      <video src={update.url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img
                        src={update.url}
                        alt={update.caption || 'تحديث مصور'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-90 p-2.5 flex flex-col justify-end text-white">
                    <p className="text-[11px] font-bold line-clamp-2 leading-tight">
                      {update.caption || 'تحديث مرحلي معتمد'}
                    </p>
                    <span className="text-[9px] text-white/80 mt-1 font-mono">
                      {new Date(update.publishedAt).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="absolute top-2 left-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Technical Product Specifications & Size Charts (APPROVED ONLY) */}
        {(techPack || sizeChart) && (
          <section className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">الملفات الفنية والمقاسات المعتمدة</h3>
                <p className="text-[11px] text-muted-foreground">الملف الفني للموديل وجداول القياسات المصادق عليها</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* Tech Pack Block */}
              {techPack && (
                <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
                  <div
                    onClick={() => setTechPackExpanded(!techPackExpanded)}
                    className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{techPack.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            معتمد v{techPack.version}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          كود: {techPack.code} {techPack.season && `• موسم: ${techPack.season}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        {techPack.files.length} مرفقات
                      </span>
                      {techPackExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {techPackExpanded && (
                    <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200/70 dark:border-neutral-800 space-y-3">
                      {techPack.instructions && (
                        <div className="text-xs text-muted-foreground leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg">
                          <strong className="text-foreground block mb-1">تعليمات التشغيل المعتمدة:</strong>
                          {techPack.instructions}
                        </div>
                      )}

                      {techPack.files.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                          {techPack.files.map((file) => (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700 hover:border-primary flex items-center gap-2 text-xs transition"
                            >
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span className="truncate flex-1 font-medium">{file.fileName}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Size Chart Block */}
              {sizeChart && (
                <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
                  <div
                    onClick={() => setSizeChartExpanded(!sizeChartExpanded)}
                    className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Ruler className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{sizeChart.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            معتمد ({sizeChart.unit})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          كود: {sizeChart.code} • طريقة القياس: {sizeChart.measurementMethod === 'FLAT' ? 'على مسطح (Flat)' : 'على المانيكان'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        {sizeChart.rows.length} نقطة قياس
                      </span>
                      {sizeChartExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {sizeChartExpanded && (
                    <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200/70 dark:border-neutral-800 overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 text-muted-foreground">
                            <th className="py-2 px-3 font-semibold">المقاس</th>
                            <th className="py-2 px-3 font-semibold">نقطة القياس</th>
                            <th className="py-2 px-3 font-semibold text-center">القيمة ({sizeChart.unit})</th>
                            <th className="py-2 px-3 font-semibold text-center">سماحية (±)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-mono">
                          {sizeChart.rows.map((row) => (
                            <tr key={row.id} className="hover:bg-neutral-50/50">
                              <td className="py-2 px-3 font-bold text-foreground">{row.sizeLabel}</td>
                              <td className="py-2 px-3 text-muted-foreground">{row.measurementKey}</td>
                              <td className="py-2 px-3 text-center font-bold text-foreground tabular-nums">
                                {row.value}
                              </td>
                              <td className="py-2 px-3 text-center text-muted-foreground tabular-nums">
                                ±{row.tolerance}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Commercial Payment Schedule (70/20/10) */}
        <section className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">جدول الدفعات المالية للعقد</h3>
                <p className="text-[11px] text-muted-foreground">متابعة الدفعات المستحقة والمسددة وفق جدول التعاقد</p>
              </div>
            </div>

            <div className="text-left font-mono">
              <span className="text-[11px] text-muted-foreground block">إجمالي العقد</span>
              <span className="font-bold text-sm text-foreground tabular-nums">
                {payments.totalAmount.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Payment Stats Strip */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 text-center font-mono">
            <div>
              <span className="text-[10px] text-muted-foreground block">المسدد فعلياً</span>
              <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                {payments.paidAmount.toLocaleString()} {currency}
              </span>
            </div>

            <div className="border-r border-l border-neutral-200 dark:border-neutral-700 px-2">
              <span className="text-[10px] text-muted-foreground block">المتبقي للتحصيل</span>
              <span className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400 tabular-nums">
                {payments.remainingAmount.toLocaleString()} {currency}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">نسبة السداد</span>
              <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums">
                {payments.percentPaid}%
              </span>
            </div>
          </div>

          {/* Payments List Table */}
          {payments.items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              لم يتم تسجيل دفعات تفصيلية بعد. يرجى مراجعة إدارة الحسابات.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-200/80 text-muted-foreground">
                    <th className="py-2 px-3 font-semibold">الدفعة</th>
                    <th className="py-2 px-3 font-semibold text-center">النسبة</th>
                    <th className="py-2 px-3 font-semibold">المبلغ</th>
                    <th className="py-2 px-3 font-semibold">موعد الاستحقاق</th>
                    <th className="py-2 px-3 font-semibold text-left">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                  {payments.items.map((payment) => (
                    <tr key={payment.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 px-3 font-bold text-foreground">
                        {payment.label || (payment.kind === 'DEPOSIT' ? 'مقدم التعاقد' : payment.kind === 'FINAL' ? 'الدفعة النهائية' : 'دفعة تشغيل')}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground tabular-nums">
                        {payment.percent ? `${payment.percent}%` : '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground tabular-nums">
                        {payment.amount.toLocaleString()} {currency}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-sans text-[11px]">
                        {payment.dueDate
                          ? new Date(payment.dueDate).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'عند الإنجاز'}
                      </td>
                      <td className="py-3 px-3 text-left">
                        {getPaymentStatusBadge(payment.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer Security Notice */}
        <footer className="text-center py-6 text-[11px] text-muted-foreground border-t border-neutral-200/60 dark:border-neutral-800 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>بوابة العميل الرقمية المعتمدة — منصة MaxP للتصنيع</span>
          </p>
          <p>يتم تحديث نسب الإنجاز والمراحل تلقائياً فور اعتمادها من قِبل إدارة الجودة والإنتاج.</p>
        </footer>
      </main>

      {/* Lightbox Modal */}
      {activeMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveMediaUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveMediaUrl(null)}
              className="absolute -top-10 left-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {activeMediaUrl.kind === 'VIDEO' ? (
              <video
                src={activeMediaUrl.url}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-xl shadow-2xl"
              />
            ) : (
              <img
                src={activeMediaUrl.url}
                alt={activeMediaUrl.caption || 'تحديث مصور'}
                className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}

            {activeMediaUrl.caption && (
              <p className="mt-3 text-sm text-white font-medium text-center bg-black/60 px-4 py-2 rounded-lg">
                {activeMediaUrl.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortalPage;
