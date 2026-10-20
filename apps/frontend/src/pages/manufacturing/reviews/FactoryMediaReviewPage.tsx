import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Globe,
  Clock,
  Building2,
  ClipboardList,
  AlertCircle,
  Filter,
  RotateCw,
  Search,
  ExternalLink,
  MessageSquare,
  FileText,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  ManufacturingAttachment,
  AttachmentReviewStatus,
} from '../manufacturingApi';

export const FactoryMediaReviewPage: React.FC = () => {
  const [attachments, setAttachments] = useState<ManufacturingAttachment[]>([]);
  const [underReviewCount, setUnderReviewCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('UNDER_REVIEW');
  const [factorySearch, setFactorySearch] = useState<string>('');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Rejection Modal
  const [rejectingItem, setRejectingItem] = useState<ManufacturingAttachment | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submittingReject, setSubmittingReject] = useState<boolean>(false);

  // Preview Modal
  const [previewMedia, setPreviewMedia] = useState<ManufacturingAttachment | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.listReviews({
        reviewStatus: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setAttachments(res.attachments || []);
      setUnderReviewCount(res.underReviewCount || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحميل قائمة المرفقات للمراجعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const filteredAttachments = useMemo(() => {
    return attachments.filter((att) => {
      if (factorySearch.trim()) {
        const q = factorySearch.toLowerCase();
        const fName = att.partnerFactory?.name?.toLowerCase() || '';
        const fCode = att.partnerFactory?.code?.toLowerCase() || '';
        if (!fName.includes(q) && !fCode.includes(q)) return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const oNum = att.order?.orderNumber?.toLowerCase() || '';
        const sName = att.stage?.name?.toLowerCase() || '';
        if (!oNum.includes(q) && !sName.includes(q)) return false;
      }
      return true;
    });
  }, [attachments, factorySearch, orderSearch]);

  const handleApprove = async (att: ManufacturingAttachment) => {
    try {
      await manufacturingApi.approveReview(att.id);
      setSuccessMsg(`تم اعتماد المرفق الخاص بأمر "${att.order?.orderNumber || ''}" بنجاح`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر اعتماد المرفق');
    }
  };

  const openRejectModal = (att: ManufacturingAttachment) => {
    setRejectingItem(att);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const cleanReason = rejectReason.trim();
    if (!cleanReason) {
      alert('سبب الرفض إلزامي. يرجى توضيح سبب عدم مطابقة الصورة للمواصفات.');
      return;
    }
    try {
      setSubmittingReject(true);
      await manufacturingApi.rejectReview(rejectingItem.id, cleanReason);
      setSuccessMsg('تم تسجيل رفض المرفق وإخطار المصنع بسبب الرفض');
      setTimeout(() => setSuccessMsg(null), 4000);
      setRejectingItem(null);
      await fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر رفض المرفق');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handlePublish = async (att: ManufacturingAttachment) => {
    try {
      await manufacturingApi.publishReview(att.id);
      setSuccessMsg(`تم نشر المرفق ليظهر في سجلات العميل`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر نشر المرفق');
    }
  };

  const handleHide = async (att: ManufacturingAttachment) => {
    try {
      await manufacturingApi.hideReview(att.id);
      setSuccessMsg('تم سحب وإخفاء المرفق');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر إخفاء المرفق');
    }
  };

  const renderStatusBadge = (status: AttachmentReviewStatus) => {
    switch (status) {
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>معتمد</span>
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
            <Globe className="w-3 h-3" />
            <span>منشور للعميل</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
            <XCircle className="w-3 h-3" />
            <span>مرفوض</span>
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <EyeOff className="w-3 h-3" />
            <span>مخفي</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <ManufacturingHeader
        title="مراجعة واعتماد مرفقات وتحديثات المصانع"
        subtitle="نظام فحص وتدقيق صور وفيديوهات مراحل التشغيل الخارجية قبل اعتمادها ونشرها للعميل"
        actions={
          <button
            onClick={fetchReviews}
            title="تحديث القائمة"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-all"
          >
            <RotateCw className="w-4 h-4 text-muted-foreground" />
            <span>تحديث</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'UNDER_REVIEW', label: 'قيد المراجعة', badge: underReviewCount },
              { id: 'ALL', label: 'كافة الحالات' },
              { id: 'APPROVED', label: 'معتمدة' },
              { id: 'PUBLISHED', label: 'منشورة للعميل' },
              { id: 'REJECTED', label: 'مرفوضة' },
              { id: 'HIDDEN', label: 'مخفية' },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="فلترة باسم المصنع الشريك أو الكود..."
                value={factorySearch}
                onChange={(e) => setFactorySearch(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="فلترة برقم أمر التشغيل (MO-...) أو المرحلة..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-7 h-7 animate-spin text-primary" />
            <span className="text-sm">جارٍ تحميل المرفقات للمراجعة...</span>
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-bold text-base text-foreground">لا توجد مرفقات مطابقة في هذا الفلتر</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              كافة الصور والمرفقات تمت مراجعتها بالكامل أو لا توجد ملفات جديدة مرفوعة من المصانع الشركاء حالياً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttachments.map((att) => {
              const isVideo = att.kind === 'VIDEO';
              return (
                <div
                  key={att.id}
                  className="rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm"
                >
                  {/* Media Visual Area */}
                  <div
                    className="relative bg-muted/60 aspect-[16/10] overflow-hidden group cursor-pointer"
                    onClick={() => setPreviewMedia(att)}
                  >
                    {isVideo ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white">
                        <Video className="w-10 h-10 mb-2 opacity-80" />
                        <span className="text-xs text-zinc-300">انقر لمعاينة الفيديو</span>
                      </div>
                    ) : (
                      <img
                        src={att.url}
                        alt={att.caption || 'مرفق المرحلة'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback placeholder if image not found
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23999"><text x="10" y="55" font-size="14">صورة معمل</text></svg>';
                        }}
                      />
                    )}

                    <div className="absolute top-2.5 right-2.5">
                      {renderStatusBadge(att.reviewStatus)}
                    </div>

                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[11px] backdrop-blur-sm flex items-center gap-1">
                      {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                      <span>{isVideo ? 'فيديو' : 'صورة'}</span>
                    </div>
                  </div>

                  {/* Body Context */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Factory & Order Badge */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{att.partnerFactory?.name || 'مصنع خارجي'}</span>
                        </div>
                        <div className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border/50">
                          {att.order?.orderNumber || 'أمر تشغيل'}
                        </div>
                      </div>

                      {/* Stage info */}
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                        <span>المرحلة: <strong className="text-foreground">{att.stage?.name || 'مرحلة تشغيل'}</strong></span>
                      </div>

                      {/* Caption */}
                      {att.caption && (
                        <div className="text-xs bg-muted/30 p-2 rounded-lg border border-border/50 text-foreground flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="line-clamp-2 leading-relaxed">{att.caption}</p>
                        </div>
                      )}

                      {/* Rejection Alert Box */}
                      {att.reviewStatus === 'REJECTED' && att.rejectReason && (
                        <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-1">
                          <div className="font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>سبب الرفض:</span>
                          </div>
                          <p className="leading-relaxed">{att.rejectReason}</p>
                        </div>
                      )}

                      {/* Audit Details */}
                      <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
                        <div>
                          تاريخ الرفع:{' '}
                          <span className="tabular-nums">
                            {new Date(att.createdAt).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {att.reviewedBy && (
                          <div>
                            تمت المراجعة بواسطة: <strong className="text-foreground">{att.reviewedBy}</strong>
                          </div>
                        )}
                        {att.publishedBy && (
                          <div>
                            نُشر بواسطة: <strong className="text-foreground">{att.publishedBy}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="pt-3 border-t border-border/60 flex items-center gap-1.5">
                      {att.reviewStatus === 'UNDER_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleApprove(att)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>اعتماد</span>
                          </button>
                          <button
                            onClick={() => openRejectModal(att)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 active:scale-[0.98] transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </>
                      )}

                      {att.reviewStatus === 'APPROVED' && (
                        <>
                          <button
                            onClick={() => handlePublish(att)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
                            title="نشر الصورة في بوابات وتقارير العميل"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>نشر للعميل</span>
                          </button>
                          <button
                            onClick={() => openRejectModal(att)}
                            className="py-1.5 px-2.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium transition-all"
                            title="إلغاء الاعتماد ورفض الصورة"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {att.reviewStatus === 'PUBLISHED' && (
                        <button
                          onClick={() => handleHide(att)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>سحب وإخفاء المرفق</span>
                        </button>
                      )}

                      {att.reviewStatus === 'REJECTED' && (
                        <button
                          onClick={() => handleApprove(att)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 text-xs font-semibold transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>إعادة اعتماد المرفق</span>
                        </button>
                      )}

                      {att.reviewStatus === 'HIDDEN' && (
                        <button
                          onClick={() => handlePublish(att)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>إعادة النشر للعميل</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPreviewMedia(att)}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title="معاينة بكامل الشاشة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal with Mandatory Reason */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-xl bg-destructive/10">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">رفض مرفق المرحلة</h3>
                <p className="text-xs text-muted-foreground">
                  أمر التشغيل: {rejectingItem.order?.orderNumber} · المصنع: {rejectingItem.partnerFactory?.name}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>سبب الرفض (إلزامي):</span>
                <span className="text-[11px] text-destructive">مطلوب</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="وضح للمصنع أسباب عدم القبول (مثال: عيب في خياطة الجيب، زاوية الإضاءة غير واضحة، يلزم إعادة تصوير الياقة)..."
                rows={3}
                className="w-full p-3 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive resize-none leading-relaxed"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                disabled={submittingReject}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submittingReject || !rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-all shadow"
              >
                {submittingReject ? 'جارٍ تسجيل الرفض...' : 'تأكيد الرفض وإشعار المصنع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-muted/60 border-b border-border flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                معاينة المرفق: {previewMedia.order?.orderNumber} — {previewMedia.stage?.name}
              </span>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-black/30">
              {previewMedia.kind === 'VIDEO' ? (
                <video src={previewMedia.url} controls className="max-h-[75vh] w-auto rounded-lg" autoPlay />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.caption || 'معاينة'}
                  className="max-h-[75vh] w-auto object-contain rounded-lg"
                />
              )}
            </div>
            {previewMedia.caption && (
              <div className="p-3 bg-card border-t border-border text-xs text-foreground">
                <span className="font-medium text-muted-foreground">ملاحظة المصنع: </span>
                {previewMedia.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FactoryMediaReviewPage;
