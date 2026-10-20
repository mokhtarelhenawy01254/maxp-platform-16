import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  Edit2,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  Power,
  RotateCw,
  Link2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, PartnerFactory } from '../manufacturingApi';
import { PartnerFactoryModal } from './PartnerFactoryModal';

const SPECIALTIES = [
  'خياطة وتجميع',
  'طباعة وسلك سكرين',
  'تطريز ديجيتال',
  'صباغة وتجهيز أقمشة',
  'كي وتشطيب وتغليف',
  'قص وتفصيل',
  'إنتاج وتشغيل كامل',
];

export const PartnerFactoriesPage: React.FC = () => {
  const [factories, setFactories] = useState<PartnerFactory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFactory, setEditingFactory] = useState<PartnerFactory | null>(null);

  // Copy feedback state
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchFactories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await manufacturingApi.listPartnerFactories();
      setFactories(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحميل بيانات المصانع الشركاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  const getFullPortalUrl = (token?: string | null) => {
    if (!token) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/factory-portal?token=${token}`;
  };

  const handleCopyPortalLink = async (factory: PartnerFactory) => {
    try {
      let token = factory.accessToken;
      if (!token) {
        const res = await manufacturingApi.generatePortalLink(factory.id);
        token = res.accessToken;
        await fetchFactories();
      }
      const url = getFullPortalUrl(token);
      await navigator.clipboard.writeText(url);
      setCopyFeedbackId(factory.id);
      setActionSuccess(`تم نسخ رابط بوابة المصنع (${factory.name}) بنجاح`);
      setTimeout(() => setCopyFeedbackId(null), 3000);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر نسخ الرابط');
    }
  };

  const handleGeneratePortalLink = async (factory: PartnerFactory) => {
    try {
      await manufacturingApi.generatePortalLink(factory.id);
      setActionSuccess(`تم توليد رابط جديد لبوابة ${factory.name}`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchFactories();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر توليد الرابط');
    }
  };

  const handleRotatePortalLink = async (factory: PartnerFactory) => {
    if (!confirm(`هل أنت متأكد من رغبتك في تجديد رابط بوابة "${factory.name}"؟ الرابط القديم سيتوقف فوراً.`)) {
      return;
    }
    await handleGeneratePortalLink(factory);
  };

  const handleTogglePortal = async (factory: PartnerFactory) => {
    try {
      const nextState = !factory.portalEnabled;
      await manufacturingApi.togglePortalLink(factory.id, nextState);
      setActionSuccess(nextState ? `تم تفعيل بوابة ${factory.name}` : `تم إيقاف بوابة ${factory.name}`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchFactories();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر تغيير حالة البوابة');
    }
  };

  const filteredFactories = useMemo(() => {
    return factories.filter((f) => {
      if (statusFilter === 'ACTIVE' && !f.isActive) return false;
      if (statusFilter === 'INACTIVE' && f.isActive) return false;
      if (specialtyFilter && f.specialty !== specialtyFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = f.name?.toLowerCase().includes(q);
        const matchCode = f.code?.toLowerCase().includes(q);
        const matchContact = f.contactPerson?.toLowerCase().includes(q);
        const matchPhone = f.phone?.includes(q);
        if (!matchName && !matchCode && !matchContact && !matchPhone) return false;
      }
      return true;
    });
  }, [factories, search, specialtyFilter, statusFilter]);

  // Overall KPI metrics
  const totalCount = factories.length;
  const activeCount = factories.filter((f) => f.isActive).length;
  const totalAssignedStages = factories.reduce(
    (sum, f) => sum + (f.metrics?.totalStagesCount || 0),
    0
  );
  const totalCompletedStages = factories.reduce(
    (sum, f) => sum + (f.metrics?.completedStagesCount || 0),
    0
  );

  const openCreateModal = () => {
    setEditingFactory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (factory: PartnerFactory) => {
    setEditingFactory(factory);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (factory: PartnerFactory) => {
    try {
      if (factory.isActive) {
        await manufacturingApi.deletePartnerFactory(factory.id);
      } else {
        await manufacturingApi.updatePartnerFactory(factory.id, { isActive: true });
      }
      await fetchFactories();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر تغيير حالة المصنع');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <ManufacturingHeader
        title="المصانع الشركاء ومقاولو الباطن"
        subtitle="إدارة جهات التنفيذ الخارجية وإسناد مراحل التشغيل ومتابعة مؤشرات الإنجاز"
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow hover:bg-primary/95 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مصنع شريك</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border border-border/70 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
              <span>إجمالي المصانع الشركاء</span>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">مصنع مسجل بالنظام</div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
              <span>المصانع النشطة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {activeCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">جاهزة لاستقبال المراحل</div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
              <span>المراحل المسندة خارجياً</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
              {totalAssignedStages}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">عبر كافة أوامر التشغيل</div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
              <span>المراحل المكتملة</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalCompletedStages}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">تم تسليمها وإغلاقها</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-xl border border-border/70 bg-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث بالاسم، الكود، جهة الاتصال، أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="py-2 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">كافة التخصصات</option>
              {SPECIALTIES.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">كل الحالات</option>
              <option value="ACTIVE">نشط فقط</option>
              <option value="INACTIVE">معطل فقط</option>
            </select>
          </div>

          <button
            onClick={fetchFactories}
            title="تحديث البيانات"
            className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground self-end md:self-auto"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Success / Action Notification */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Table / Empty State */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">جارٍ تحميل قائمة المصانع الشركاء...</span>
          </div>
        ) : filteredFactories.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-foreground">لا يوجد مصانع مطابقة للبحث</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              لم نجد أي مصانع شركاء بهذه المعايير. يمكنك مسح الفلاتر أو إضافة مصنع شريك جديد لبدء إسناد المراحل.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مصنع شريك جديد</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-xs font-semibold">
                    <th className="py-3 px-4">المصنع الشريك</th>
                    <th className="py-3 px-4">التخصص</th>
                    <th className="py-3 px-4">مسؤول التواصل</th>
                    <th className="py-3 px-4">المراحل المسندة</th>
                    <th className="py-3 px-4">إجمالي تكلفة العمالة</th>
                    <th className="py-3 px-4">بوابة المصنع (رابط آمن)</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredFactories.map((factory) => {
                    const metrics = factory.metrics || {
                      totalStagesCount: 0,
                      activeStagesCount: 0,
                      completedStagesCount: 0,
                      totalLaborCost: 0,
                    };

                    const isPortalReady = Boolean(factory.portalEnabled && factory.accessToken);
                    const isCopied = copyFeedbackId === factory.id;

                    return (
                      <tr
                        key={factory.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-2">
                                <span>{factory.name}</span>
                                {factory.code && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                    {factory.code}
                                  </span>
                                )}
                              </div>
                              {factory.address && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-muted-foreground/70" />
                                  <span>{factory.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {factory.specialty ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border/60">
                              {factory.specialty}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-xs">
                            {factory.contactPerson && (
                              <div className="font-medium text-foreground">
                                {factory.contactPerson}
                              </div>
                            )}
                            {factory.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground dir-ltr text-right">
                                <Phone className="w-3 h-3" />
                                <span className="tabular-nums">{factory.phone}</span>
                              </div>
                            )}
                            {!factory.contactPerson && !factory.phone && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs space-y-0.5">
                            <div className="font-semibold text-foreground tabular-nums">
                              {metrics.totalStagesCount} مرحلة
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {metrics.activeStagesCount} جارية · {metrics.completedStagesCount} تامة
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold tabular-nums text-foreground">
                          {metrics.totalLaborCost.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          <span className="text-xs font-normal text-muted-foreground">ج.م</span>
                        </td>

                        {/* Factory Portal Link Column */}
                        <td className="py-3 px-4">
                          {isPortalReady ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleCopyPortalLink(factory)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                    isCopied
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                                  }`}
                                  title="نسخ الرابط لمشاركته مع المصنع عبر واتساب أو البريد"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>تم النسخ!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>نسخ الرابط</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleRotatePortalLink(factory)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                  title="تجديد / تدوير الرابط (إلغاء القديم وتوليد رابط جديد)"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={() => handleTogglePortal(factory)}
                                  className="p-1 rounded text-amber-600 hover:bg-amber-500/10"
                                  title="إيقاف البوابة مؤقتاً"
                                >
                                  <Power className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="text-[10px] text-muted-foreground">
                                {factory.portalLastAccessAt ? (
                                  <span>
                                    آخر دخول: {new Date(factory.portalLastAccessAt).toLocaleDateString('ar-EG', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                ) : (
                                  <span>لم يتم الدخول بعد</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGeneratePortalLink(factory)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>توليد رابط البوابة</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {factory.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>نشط</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              <span>معطل</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(factory)}
                              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              title="تعديل بيانات المصنع"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(factory)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                factory.isActive
                                  ? 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10'
                                  : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                              }`}
                              title={factory.isActive ? 'تعطيل المصنع' : 'تفعيل المصنع'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <PartnerFactoryModal
        isOpen={isModalOpen}
        editingFactory={editingFactory}
        specialties={SPECIALTIES}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchFactories}
      />
    </div>
  );
};

export default PartnerFactoriesPage;
