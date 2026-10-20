import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  Camera,
  Upload,
  Send,
  HelpCircle,
  RotateCw,
  XCircle,
  FileText,
  Video,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  AlertTriangle,
  Play,
  Check,
  BookOpen,
  Ruler,
  Image as ImageIcon,
} from 'lucide-react';
import {
  factoryPortalApi,
  FactoryPortalContext,
  FactoryPortalAssignment,
} from '../manufacturingApi';

export const FactoryPortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ token?: string }>();

  // Determine active token
  const tokenFromUrl = routeParams.token || searchParams.get('token');
  const [token, setToken] = useState<string>(() => {
    return tokenFromUrl || localStorage.getItem('maxp_factory_portal_token') || '';
  });

  const [inputToken, setInputToken] = useState<string>('');
  const [context, setContext] = useState<FactoryPortalContext | null>(null);
  const [assignments, setAssignments] = useState<FactoryPortalAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active Tab Filter
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');

  // Expanded materials drawer state per assignment ID
  const [expandedMaterials, setExpandedMaterials] = useState<Record<string, boolean>>({});

  // Active Modals
  const [activeModal, setActiveModal] = useState<{
    type: 'UPDATE' | 'MEDIA' | 'APPROVAL' | 'ISSUE';
    assignment: FactoryPortalAssignment;
  } | null>(null);

  // Form states for modals
  const [updateExecutedQty, setUpdateExecutedQty] = useState<number>(0);
  const [updateScrapQty, setUpdateScrapQty] = useState<number>(0);
  const [updateReworkQty, setUpdateReworkQty] = useState<number>(0);
  const [updateNotes, setUpdateNotes] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string>('');
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);

  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [issueText, setIssueText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync token from URL
  useEffect(() => {
    if (tokenFromUrl && tokenFromUrl !== token) {
      setToken(tokenFromUrl);
      localStorage.setItem('maxp_factory_portal_token', tokenFromUrl);
    }
  }, [tokenFromUrl]);

  // Load Portal Data
  const loadPortalData = async (activeToken: string) => {
    if (!activeToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setAuthError(null);
      const [ctx, asgs] = await Promise.all([
        factoryPortalApi.getContext(activeToken),
        factoryPortalApi.getAssignments(activeToken),
      ]);
      setContext(ctx);
      setAssignments(asgs);
      localStorage.setItem('maxp_factory_portal_token', activeToken);
    } catch (err: any) {
      setAuthError(
        err?.response?.data?.error ||
        err?.message ||
        'رابط البوابة غير صالح أو تم إيقافه من قِبل إدارة المصنع'
      );
      setContext(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadPortalData(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputToken.trim();
    if (!clean) return;
    setToken(clean);
    setSearchParams({ token: clean });
  };

  const toggleExpandMaterials = (asgId: string) => {
    setExpandedMaterials((prev) => ({ ...prev, [asgId]: !prev[asgId] }));
  };

  // Quick Action Handlers
  const handleConfirmReceipt = async (asg: FactoryPortalAssignment) => {
    try {
      setSubmitting(true);
      setActionError(null);
      await factoryPortalApi.confirmReceipt(token, asg.id);
      setActionSuccess(`تم تأكيد استلام أمر التشغيل "${asg.order?.orderNumber}" بنجاح`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadPortalData(token);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'تعذر تأكيد الاستلام');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (asg: FactoryPortalAssignment) => {
    try {
      setSubmitting(true);
      setActionError(null);
      await factoryPortalApi.startStage(token, asg.id);
      setActionSuccess(`تم تسجيل بدء مرحلة التشغيل "${asg.name}"`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadPortalData(token);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'تعذر تسجيل بدء المرحلة');
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateModal = (asg: FactoryPortalAssignment) => {
    setActiveModal({ type: 'UPDATE', assignment: asg });
    setUpdateExecutedQty(asg.completedQuantity || 0);
    setUpdateScrapQty(0);
    setUpdateReworkQty(0);
    setUpdateNotes('');
  };

  const handleSaveUpdate = async () => {
    if (!activeModal) return;
    try {
      setSubmitting(true);
      setActionError(null);
      await factoryPortalApi.updateStage(token, activeModal.assignment.id, {
        completedQuantity: Number(updateExecutedQty) || 0,
        scrapQuantity: Number(updateScrapQty) || 0,
        reworkQuantity: Number(updateReworkQty) || 0,
        notes: updateNotes.trim(),
      });
      setActionSuccess('تم تحديث كميات التشغيل بنجاح');
      setTimeout(() => setActionSuccess(null), 4000);
      setActiveModal(null);
      await loadPortalData(token);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'تعذر تحديث الكميات');
    } finally {
      setSubmitting(false);
    }
  };

  const openMediaModal = (asg: FactoryPortalAssignment) => {
    setActiveModal({ type: 'MEDIA', assignment: asg });
    setSelectedFile(null);
    setMediaCaption('');
    setMediaPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
    }
  };

  const handleUploadMedia = async () => {
    if (!activeModal) return;
    if (!selectedFile) {
      alert('يرجى اختيار صورة أو فيديو أولاً');
      return;
    }
    try {
      setSubmitting(true);
      setActionError(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (mediaCaption.trim()) {
        formData.append('caption', mediaCaption.trim());
      }
      await factoryPortalApi.uploadMedia(token, activeModal.assignment.id, formData);
      setActionSuccess('تم رفع الملف بنجاح وهو الآن قيد مراجعة الإدارة');
      setTimeout(() => setActionSuccess(null), 5000);
      setActiveModal(null);
      await loadPortalData(token);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'تعذر رفع الملف');
    } finally {
      setSubmitting(false);
    }
  };

  const openApprovalModal = (asg: FactoryPortalAssignment) => {
    setActiveModal({ type: 'APPROVAL', assignment: asg });
    setApprovalNotes('المصنع يطلب اعتماد المرحلة وإغلاق التشغيل بعد مطابقة العينات');
  };

  const handleSendApprovalRequest = async () => {
    if (!activeModal) return;
    try {
      setSubmitting(true);
      setActionError(null);
      await factoryPortalApi.requestApproval(token, activeModal.assignment.id, {
        notes: approvalNotes.trim(),
      });
      setActionSuccess('تم إرسال طلب الاعتماد إلى إدارة المصنع بنجاح');
      setTimeout(() => setActionSuccess(null), 4000);
      setActiveModal(null);
      await loadPortalData(token);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'تعذر إرسال طلب الاعتماد');
    } finally {
      setSubmitting(false);
    }
  };

  const openIssueModal = (asg: FactoryPortalAssignment) => {
    setActiveModal({ type: 'ISSUE', assignment: asg });
    setIssueText('');
  };

  const handleSendIssue = async () => {
    if (!activeModal) return;
    const cleanIssue = issueText.trim();
    if (!cleanIssue) {
      alert('يرجى كتابة تفاصيل الملاحظة أو المشكلة');
      return;
    }
    try {
      setSubmitting(true);
      setActionError(null);
      await factoryPortalApi.reportIssue(token, activeModal.assignment.id, {
        issue: cleanIssue,
      });
      setActionSuccess('تم تسجيل الملاحظة وإشعار الإدارة');
      setTimeout(() => setActionSuccess(null), 4000);
      setActiveModal(null);
      await loadPortalData(token);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'تعذر تسجيل الملاحظة');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      if (statusTab === 'ACTIVE') {
        return asg.status === 'IN_PROGRESS' || asg.status === 'PENDING';
      }
      if (statusTab === 'PENDING_REVIEW') {
        const hasUnderReview = asg.attachments?.some((a) => a.reviewStatus === 'UNDER_REVIEW');
        return hasUnderReview || asg.factoryNotes?.includes('APPROVAL_REQUEST');
      }
      if (statusTab === 'COMPLETED') {
        return asg.status === 'COMPLETED' || asg.factoryCompletedAt != null;
      }
      return true;
    });
  }, [assignments, statusTab]);

  // If no token or invalid, show the mobile token entry screen
  if (!token || authError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground flex flex-col justify-center items-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-xl space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground">بوابة المصنع الشريك</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              يرجى إدخال رمز الدخول الخاص بمصنعك للوصول إلى التكليفات المسندة وتحديث مراحل التشغيل
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs text-right flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-3 text-right">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                رمز الدخول (Token):
              </label>
              <input
                type="text"
                placeholder="أدخل الرمز أو الصق رابط البوابة هنا..."
                value={inputToken}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  if (val.includes('token=')) {
                    val = val.split('token=')[1]?.split('&')[0] || val;
                  }
                  setInputToken(val);
                }}
                className="w-full p-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!inputToken.trim()}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              دخول إلى التكليفات
            </button>
          </form>

          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
            إذا لم يكن لديك رمز وصول، تواصل مع مسؤول إدارة الإنتاج والتصنيع لتوليد الرابط الآمن.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground pb-12" dir="rtl">
      {/* Standalone Mobile-First Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/70 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                <span>{(context as any)?.factory?.name || context?.name || 'المصنع الشريك'}</span>
                {((context as any)?.factory?.code || context?.code) && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                    {(context as any)?.factory?.code || context?.code}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {(context as any)?.factory?.specialty || context?.specialty || 'بوابة التكليفات وتحديث مراحل التشغيل'}
              </p>
            </div>
          </div>

          <button
            onClick={() => loadPortalData(token)}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="تحديث البيانات"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto p-3.5 sm:p-5 space-y-4">
        {/* Alerts */}
        {actionSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Quick KPI Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'كافة التكليفات', count: assignments.length },
            {
              id: 'ACTIVE',
              label: 'جارية بالتشغيل',
              count: assignments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'PENDING').length,
            },
            {
              id: 'PENDING_REVIEW',
              label: 'بانتظار الاعتماد',
              count: assignments.filter((a) => a.attachments?.some((m) => m.reviewStatus === 'UNDER_REVIEW')).length,
            },
            {
              id: 'COMPLETED',
              label: 'مكتملة',
              count: assignments.filter((a) => a.status === 'COMPLETED' || a.factoryCompletedAt != null).length,
            },
          ].map((tab) => {
            const isActive = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Assignments List */}
        {loading ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-7 h-7 animate-spin text-primary" />
            <span className="text-sm">جارٍ تحميل تكليفات المصنع...</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-3">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">لا توجد تكليفات في هذا الفلتر</h3>
            <p className="text-xs text-muted-foreground">
              ستظهر هنا أي مراحل تشغيل جديدة يتم إسنادها لمصنعك من قِبل إدارة الإنتاج.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((asg) => {
              const isReceived = asg.factoryAckReceiptAt != null;
              const isSent = asg.sentToFactoryAt != null;
              const isCompleted = asg.status === 'COMPLETED' || asg.factoryCompletedAt != null;
              const isExpanded = Boolean(expandedMaterials[asg.id]);

              return (
                <div
                  key={asg.id}
                  className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all space-y-4 p-4"
                >
                  {/* Card Header: Order and Stage */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {asg.order?.orderNumber}
                        </span>
                        {asg.order?.brandName && (
                          <span className="text-xs font-semibold text-foreground">
                            {asg.order.brandName}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          · مرحلة #{asg.sequence}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground">
                        {asg.name}
                      </h3>
                      {asg.order?.productModel && (
                        <p className="text-xs text-muted-foreground">
                          الموديل: {asg.order.productModel}
                        </p>
                      )}
                    </div>

                    {/* Timeline Stage Badge */}
                    <div>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>مكتملة</span>
                        </span>
                      ) : isReceived ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                          <Play className="w-3 h-3" />
                          <span>قيد التشغيل</span>
                        </span>
                      ) : isSent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>بانتظار الاستلام</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                          <span>قيد التجهيز</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantities & Agreement Value Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/30 p-3 rounded-xl border border-border/50 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">الكمية المطلوبة:</span>
                      <strong className="text-sm font-bold text-foreground tabular-nums">
                        {asg.order?.plannedQuantity} {asg.order?.unit || 'قطعة'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block">الكمية المنفذة:</span>
                      <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {asg.completedQuantity} {asg.order?.unit || 'قطعة'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block">تاريخ التسليم المستهدف:</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {asg.order?.dueDate
                          ? new Date(asg.order.dueDate).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'غير محدد'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block">قيمة اتفاق المصنع:</span>
                      <strong className="text-sm font-bold text-primary tabular-nums">
                        {asg.agreement.partnerAgreedCost.toLocaleString('en-US')} {asg.agreement.currency}
                      </strong>
                      <span className="text-[10px] text-muted-foreground block">
                        ({asg.agreement.ratePerPiece} ج.م / للقطعة)
                      </span>
                    </div>
                  </div>

                  {/* Technical Pack & Size Chart Section (Wave 4) */}
                  {(asg.techPack || asg.sizeChart) && (
                    <div className="border border-border/70 rounded-xl overflow-hidden bg-card space-y-3 p-3.5 shadow-2xs">
                      {/* Tech Pack Info */}
                      {asg.techPack && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <BookOpen className="w-4 h-4 text-primary" />
                              <span className="font-bold text-xs text-foreground">
                                الملف الفني للموديل (Tech Pack): {asg.techPack.name}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                                {asg.techPack.code} V{asg.techPack.version}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              معتمد للتشغيل ✅
                            </span>
                          </div>

                          {/* Fabric Summary */}
                          {asg.techPack.fabricSummary && (
                            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px]">
                              <span className="font-bold text-primary block mb-0.5">مواصفات وتركيب الخامة:</span>
                              <span className="text-foreground leading-relaxed">{asg.techPack.fabricSummary}</span>
                            </div>
                          )}

                          {/* Technical Instructions & Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {asg.techPack.printDetails && (
                              <div className="p-2 rounded-lg bg-muted/30 border border-border/60">
                                <span className="font-bold text-muted-foreground block mb-0.5">الطباعة والتطريز:</span>
                                <span className="text-foreground">{asg.techPack.printDetails}</span>
                              </div>
                            )}
                            {asg.techPack.packagingDetails && (
                              <div className="p-2 rounded-lg bg-muted/30 border border-border/60">
                                <span className="font-bold text-muted-foreground block mb-0.5">التعبئة والتغليف:</span>
                                <span className="text-foreground">{asg.techPack.packagingDetails}</span>
                              </div>
                            )}
                            {asg.techPack.instructions && (
                              <div className="sm:col-span-2 p-2 rounded-lg bg-muted/30 border border-border/60">
                                <span className="font-bold text-muted-foreground block mb-0.5">تعليمات التشغيل:</span>
                                <span className="text-foreground">{asg.techPack.instructions}</span>
                              </div>
                            )}
                          </div>

                          {/* Attached Technical Sketches & PDFs */}
                          {asg.techPack.files && asg.techPack.files.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                                الرسومات الفنية وباترون الموديل المرفق:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {asg.techPack.files.map((file) => (
                                  <a
                                    key={file.id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-lg border border-border/70 bg-background hover:bg-muted/40 transition flex items-center gap-2 shadow-2xs group"
                                  >
                                    {file.kind === 'PDF' ? (
                                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                    )}
                                    <span className="truncate text-[11px] text-foreground font-medium group-hover:text-primary">
                                      {file.fileName}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Size Chart Info (Read-only matrix for factory) */}
                      {asg.sizeChart && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Ruler className="w-4 h-4 text-primary" />
                              <span className="font-bold text-xs text-foreground">
                                جدول القياسات المعتمد: {asg.sizeChart.name}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60 font-bold">
                                {asg.sizeChart.code} V{asg.sizeChart.version}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({asg.sizeChart.unit} — {asg.sizeChart.measurementMethod === 'FLAT' ? 'فلات نصف محيط' : 'دائري محيط كامل'})
                              </span>
                            </div>
                          </div>

                          {/* Responsive Read-only Table */}
                          {asg.sizeChart.rows && asg.sizeChart.rows.length > 0 ? (
                            <div className="rounded-lg border border-border/70 overflow-hidden bg-background">
                              <table className="w-full text-right text-[11px]">
                                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                                  <tr>
                                    <th className="p-2 font-semibold">المقاس (Size)</th>
                                    <th className="p-2 font-semibold">القياس (Measurement)</th>
                                    <th className="p-2 font-semibold text-center">المقاس المطلوب ({asg.sizeChart.unit})</th>
                                    <th className="p-2 font-semibold text-center">التفاوت المسموح ±</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {asg.sizeChart.rows
                                    .filter((r) => r.source === 'FACTORY' || r.source === 'CUSTOMER')
                                    .map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-muted/20">
                                        <td className="p-2 font-mono font-bold text-foreground">{row.sizeLabel}</td>
                                        <td className="p-2 font-medium text-foreground">{row.measurementKey}</td>
                                        <td className="p-2 text-center font-mono font-bold text-foreground tabular-nums">
                                          {row.value} {asg.sizeChart?.unit}
                                        </td>
                                        <td className="p-2 text-center font-mono text-muted-foreground tabular-nums">
                                          ±{row.tolerance}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">لا توجد قياسات مسجلة في هذا الجدول</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivered Materials Section (Toggle) */}
                  <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
                    <button
                      type="button"
                      onClick={() => toggleExpandMaterials(asg.id)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span>الخامات المسلمة للمصنع ({asg.deliveredMaterials?.length || 0})</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-border/60 bg-muted/20 text-xs">
                        {asg.deliveredMaterials && asg.deliveredMaterials.length > 0 ? (
                          <div className="divide-y divide-border/50">
                            {asg.deliveredMaterials.map((mat, idx) => (
                              <div key={idx} className="py-2 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-foreground">{mat.rawMaterialName}</span>
                                  {mat.batchNumber && (
                                    <span className="text-[10px] text-muted-foreground block">
                                      تشغيلة: {mat.batchNumber}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-foreground tabular-nums">
                                  {mat.quantity} {mat.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-2">
                            لم يتم تسجيل إذن صرف خامات لهذا الأمر حتى الآن.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Uploaded Media Gallery for this Stage */}
                  {asg.attachments && asg.attachments.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-border/50">
                      <span className="text-xs font-semibold text-foreground block">
                        الصور والمستندات المرفوعة لهذه المرحلة:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {asg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="rounded-xl border border-border/70 overflow-hidden bg-muted/30 p-2 space-y-1.5"
                          >
                            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/10 relative">
                              {att.kind === 'VIDEO' ? (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                                  <Video className="w-6 h-6" />
                                </div>
                              ) : (
                                <img src={att.url} alt={att.caption || ''} className="w-full h-full object-cover" />
                              )}
                            </div>

                            {/* Status badge */}
                            <div>
                              {att.reviewStatus === 'UNDER_REVIEW' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>بانتظار مراجعة الإدارة</span>
                                </span>
                              )}
                              {att.reviewStatus === 'APPROVED' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>معتمدة من الإدارة</span>
                                </span>
                              )}
                              {att.reviewStatus === 'PUBLISHED' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>معتمدة ومنشورة للعميل</span>
                                </span>
                              )}
                              {att.reviewStatus === 'REJECTED' && (
                                <div className="text-[10px] text-destructive space-y-0.5">
                                  <span className="font-bold flex items-center gap-1">
                                    <XCircle className="w-2.5 h-2.5" />
                                    <span>مرفوضة من الإدارة:</span>
                                  </span>
                                  <p className="line-clamp-2 leading-tight">{att.rejectReason}</p>
                                </div>
                              )}
                            </div>

                            {att.caption && (
                              <p className="text-[11px] text-muted-foreground truncate">{att.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stage Cycle Buttons (Mobile First Big Touch Targets) */}
                  <div className="pt-2 border-t border-border/70 space-y-2">
                    {/* Primary Lifecycle Step Button */}
                    {!isReceived ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmReceipt(asg)}
                        disabled={submitting || !isSent}
                        className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد استلام الخامات والتشغيل</span>
                      </button>
                    ) : asg.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => handleStart(asg)}
                        disabled={submitting}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm shadow hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>بدء مرحلة التشغيل الفعلي</span>
                      </button>
                    ) : null}

                    {/* Operational Action Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => openUpdateModal(asg)}
                        disabled={!isReceived}
                        className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-primary" />
                        <span>تحديث الكميات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openMediaModal(asg)}
                        className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>رفع صورة / فيديو</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openApprovalModal(asg)}
                        disabled={!isReceived}
                        className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>طلب اعتماد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openIssueModal(asg)}
                        className="py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>تسجيل ملاحظة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* UPDATE QUANTITIES MODAL */}
      {activeModal?.type === 'UPDATE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground">تحديث كميات التشغيل</h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  الكمية السليمة المنفذة حتى الآن (قطعة):
                </label>
                <input
                  type="number"
                  min="0"
                  value={updateExecutedQty}
                  onChange={(e) => setUpdateExecutedQty(Number(e.target.value))}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-sm font-bold tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">هالك / تالف (قطعة):</label>
                  <input
                    type="number"
                    min="0"
                    value={updateScrapQty}
                    onChange={(e) => setUpdateScrapQty(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">إعادة تشغيل (قطعة):</label>
                  <input
                    type="number"
                    min="0"
                    value={updateReworkQty}
                    onChange={(e) => setUpdateReworkQty(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg text-xs tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">ملاحظات التشغيل (اختياري):</label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="أي ملاحظات حول جودة خط الإنتاج أو أسباب الهالك..."
                  rows={2}
                  className="w-full p-2 bg-background border border-border rounded-lg text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveUpdate}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 shadow"
              >
                {submitting ? 'جارٍ الحفظ...' : 'حفظ التحديث'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MEDIA MODAL */}
      {activeModal?.type === 'MEDIA' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground">رفع صور أو فيديو لمرحلة التشغيل</h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 border-2 border-dashed border-border rounded-xl text-center space-y-2 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="portal-media-input"
                />
                <label htmlFor="portal-media-input" className="cursor-pointer block">
                  {mediaPreviewUrl ? (
                    <div className="max-h-48 rounded-lg overflow-hidden flex items-center justify-center">
                      {selectedFile?.type.startsWith('video/') ? (
                        <div className="text-xs p-4 bg-zinc-900 text-white rounded">
                          تم اختيار فيديو: {selectedFile.name}
                        </div>
                      ) : (
                        <img src={mediaPreviewUrl} alt="Preview" className="max-h-44 object-contain rounded" />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-4">
                      <Camera className="w-8 h-8 text-primary mx-auto" />
                      <span className="font-semibold text-foreground block">
                        انقر لالتقاط صورة بالكاميرا أو اختيار ملف
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        يدعم ملفات JPG, PNG, MP4 حتى 50 ميجابايت
                      </span>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">وصف المرفق (اختياري):</label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="مثال: عينة الخياطة النهائية، تشطيب الياقة..."
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>سيدخل المرفق تلقائياً تحت مراجعة الإدارة قبل عرضه للعميل.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleUploadMedia}
                disabled={submitting || !selectedFile}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow"
              >
                {submitting ? 'جارٍ الرفع...' : 'رفع المرفق للمراجعة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST APPROVAL MODAL */}
      {activeModal?.type === 'APPROVAL' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground">طلب اعتماد مرحلة التشغيل</h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                سيتم إرسال إشعار فوري لإدارة الإنتاج لاعتماد جودة المرحلة وإغلاق التشغيل.
              </p>

              <div>
                <label className="font-medium text-foreground block mb-1">رسالة الطلب:</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendApprovalRequest}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 shadow"
              >
                {submitting ? 'جارٍ الإرسال...' : 'إرسال طلب الاعتماد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT ISSUE MODAL */}
      {activeModal?.type === 'ISSUE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground">تسجيل ملاحظة أو عائق تشغيل</h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">تفاصيل المشكلة أو الاستفسار:</label>
                <textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="مثال: نقص في أكسسوارات معينة، استفسار عن مواصفة في الباترون، تأخر خامة..."
                  rows={3}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs resize-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendIssue}
                disabled={submitting || !issueText.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 shadow"
              >
                {submitting ? 'جارٍ التسجيل...' : 'إرسال الملاحظة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactoryPortalPage;
