import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  UserCheck,
  Truck,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Send,
  X,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import { formatDate } from './shippingOpsShared';
import { DateInput } from '../../components/ui/DateInput';

export interface RouteStop {
  id: string;
  seq: number;
  shipmentId?: string | null;
  address: string;
  city?: string | null;
  governorate: string;
  contactName: string;
  contactPhone: string;
  timeWindowFrom?: string | null;
  timeWindowTo?: string | null;
  status: 'PENDING' | 'DONE' | 'FAILED' | 'SKIPPED';
  notes?: string | null;
}

export interface RoutePlan {
  id: string;
  planNumber: string;
  name: string;
  planDate: string;
  status: 'DRAFT' | 'READY' | 'ASSIGNED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  branchId?: string | null;
  governorate?: string | null;
  courierId?: string | null;
  deliveryRunId?: string | null;
  totalStops: number;
  totalShipments: number;
  notes?: string | null;
  createdAt: string;
  stops?: RouteStop[];
  courier?: { id: string; name: string; phone: string; governorates?: string } | null;
  deliveryRun?: { id: string; runNumber: string; status: string } | null;
}

export const RoutePlansPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [plans, setPlans] = useState<RoutePlan[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Auxiliary data
  const [couriers, setCouriers] = useState<Array<{ id: string; name: string; phone?: string; zones?: string[]; currentLoad?: number }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  // Modals & Active View
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RoutePlan | null>(null);
  const [assigningPlan, setAssigningPlan] = useState<RoutePlan | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Stop input in detail drawer
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualContactName, setManualContactName] = useState('');
  const [manualContactPhone, setManualContactPhone] = useState('');

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    planDate: new Date().toISOString().slice(0, 10),
    governorate: 'القاهرة',
    branchId: '',
    suggestShipments: true,
  });

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/v1/route-plans?${params.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
        setTotalCount(data.total || 0);
      }
    } catch {
      toast.error('فشل في جلب خطط السير');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  const fetchAuxData = useCallback(async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        fetch('/api/v1/shipping-assign/couriers', { headers: authHeaders }),
        fetch('/api/v1/shipping-portal/branches', { headers: authHeaders }),
      ]);
      const [cData, bData] = await Promise.all([cRes.json(), bRes.json()]);
      if (cData.success) setCouriers(cData.couriers || cData.data || []);
      if (bData.success) setBranches(bData.branches || []);
    } catch (e) {
      console.warn('Aux fetch warning:', e);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  // Load single plan detail with stops
  const loadPlanDetail = async (planId: string) => {
    try {
      const res = await fetch(`/api/v1/route-plans/${planId}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.plan) {
        setSelectedPlan(data.plan);
      }
    } catch {
      toast.error('فشل في جلب تفاصيل خط السير');
    }
  };

  // Create Route Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('يرجى إدخال اسم خط السير');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/route-plans', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم إنشاء خط السير ${data.plan.planNumber} بنجاح (${data.plan.totalStops} وقفة)`);
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          planDate: new Date().toISOString().slice(0, 10),
          governorate: 'القاهرة',
          branchId: '',
          suggestShipments: true,
        });
        fetchPlans();
        loadPlanDetail(data.plan.id);
      } else {
        toast.error(data.error || 'فشل في إنشاء خط السير');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الإنشاء');
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Courier
  const handleAssignCourier = async () => {
    if (!assigningPlan || !selectedCourierId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/route-plans/${assigningPlan.id}/assign`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ courierId: selectedCourierId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إسناد المندوب لخط السير بنجاح');
        setAssigningPlan(null);
        setSelectedCourierId('');
        fetchPlans();
        if (selectedPlan?.id === assigningPlan.id) {
          loadPlanDetail(assigningPlan.id);
        }
      } else {
        toast.error(data.error || 'تعذر إسناد المندوب');
      }
    } catch (err: any) {
      toast.error(err.message || 'خطأ في عملية الإسناد');
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch to Delivery Run
  const handleDispatchPlan = async (planId: string) => {
    if (!confirm('هل تريد تحويل خط السير إلى رحلة توزيع رسمية (DeliveryRun) وإرسال الشحنات للمندوب؟')) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/route-plans/${planId}/dispatch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم تحويل خط السير إلى رحلة رقم ${data.deliveryRun?.runNumber || ''} بنجاح!`);
        fetchPlans();
        loadPlanDetail(planId);
      } else {
        toast.error(data.error || 'فشل في تحويل خط السير إلى رحلة');
      }
    } catch (err: any) {
      toast.error(err.message || 'خطأ أثناء تحويل الرحلة');
    } finally {
      setSubmitting(false);
    }
  };

  // Reorder Stops (move up/down or auto)
  const handleMoveStop = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedPlan?.stops) return;
    const currentStops = [...selectedPlan.stops];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentStops.length) return;

    // Swap
    const temp = currentStops[index];
    currentStops[index] = currentStops[targetIndex];
    currentStops[targetIndex] = temp;

    const payload = currentStops.map((st, idx) => ({ id: st.id, seq: idx + 1 }));
    try {
      const res = await fetch(`/api/v1/route-plans/${selectedPlan.id}/stops/reorder`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ stops: payload }),
      });
      const data = await res.json();
      if (data.success) {
        loadPlanDetail(selectedPlan.id);
      }
    } catch {
      toast.error('فشل في تحديث ترتيب الوقفة');
    }
  };

  const handleAutoReorder = async () => {
    if (!selectedPlan) return;
    try {
      const res = await fetch(`/api/v1/route-plans/${selectedPlan.id}/stops/reorder`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ auto: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم الترتيب التلقائي للوقفات حسب المحافظة والمدينة');
        loadPlanDetail(selectedPlan.id);
      }
    } catch {
      toast.error('فشل في الترتيب التلقائي');
    }
  };

  // Add Manual Stop
  const handleAddManualStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !manualAddress.trim() || !manualContactName.trim()) {
      toast.error('يرجى ملء الاسم والعنوان');
      return;
    }
    try {
      const res = await fetch(`/api/v1/route-plans/${selectedPlan.id}/stops`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          stops: [
            {
              address: manualAddress.trim(),
              city: manualCity.trim() || null,
              governorate: selectedPlan.governorate || 'القاهرة',
              contactName: manualContactName.trim(),
              contactPhone: manualContactPhone.trim(),
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تمت إضافة الوقفة بنجاح');
        setManualAddress('');
        setManualCity('');
        setManualContactName('');
        setManualContactPhone('');
        loadPlanDetail(selectedPlan.id);
        fetchPlans();
      }
    } catch {
      toast.error('فشل في إضافة الوقفة');
    }
  };

  const getStatusBadge = (status: RoutePlan['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">مسودة</span>;
      case 'READY':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">جاهز للإسناد</span>;
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">مسند لمندوب</span>;
      case 'DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">تم التوزيع (رحلة)</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">مكتمل</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">ملغي</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-6 space-y-4">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{isEn ? 'Planned Routes' : 'خطط السير المسبقة (Route Plans)'}</h1>
              <p className="text-xs text-slate-500">{isEn ? 'Pre-plan multi-stop delivery routes prior to courier dispatch' : 'تخطيط وترتيب مسارات التوزيع مسبقاً قبل إسنادها للمناديب'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'New Route Plan' : 'خطة سير جديدة'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm text-sm">
        <div className="flex items-center gap-2 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الخطة أو الاسم..."
            className="w-full bg-transparent outline-none text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <DateInput
            value={dateFilter}
            onChange={(val) => setDateFilter(val)}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs outline-none"
          >
            <option value="">جميع الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="READY">جاهز للإسناد</option>
            <option value="ASSIGNED">مسند لمندوب</option>
            <option value="DISPATCHED">تم التوزيع</option>
            <option value="COMPLETED">مكتمل</option>
          </select>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">رقم الخطة</th>
                <th className="px-4 py-3 font-semibold">الاسم والمحافظة</th>
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3 font-semibold">عدد الوقفات / الشحنات</th>
                <th className="px-4 py-3 font-semibold">المندوب المسند</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    جاري تحميل خطط السير...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    لا توجد خطط سير مسجلة حتى الآن. انقر على «خطة سير جديدة» للبدء.
                  </td>
                </tr>
              ) : (
                plans
                  .filter((p) => !search || p.planNumber.includes(search) || p.name.includes(search))
                  .map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {plan.planNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</div>
                        <div className="text-xs text-slate-400">{plan.governorate || 'محافظات متعددة'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {formatDate(plan.planDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">{plan.totalStops}</span> وقفة
                        <span className="text-slate-400 text-xs mr-2 font-mono tabular-nums">({plan.totalShipments} شحنة)</span>
                      </td>
                      <td className="px-4 py-3">
                        {plan.courier ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{plan.courier.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{plan.courier.phone}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">غير مسند</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(plan.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => loadPlanDetail(plan.id)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="عرض الوقفات والترتيب"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {plan.status !== 'DISPATCHED' && plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
                            <>
                              <button
                                onClick={() => {
                                  setAssigningPlan(plan);
                                  setSelectedCourierId(plan.courierId || '');
                                }}
                                className="p-1.5 text-slate-600 hover:text-amber-600 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="إسناد مندوب"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDispatchPlan(plan.id)}
                                disabled={!plan.courierId || plan.totalShipments === 0}
                                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                  plan.courierId && plan.totalShipments > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                                }`}
                                title={!plan.courierId ? 'أسند مندوباً أولاً' : 'تحويل لرحلة توزيع رسمية'}
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>تحويل لرحلة</span>
                              </button>
                            </>
                          )}

                          {plan.deliveryRun && (
                            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                              {plan.deliveryRun.runNumber}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Detail Drawer */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{selectedPlan.planNumber}</span>
                  {getStatusBadge(selectedPlan.status)}
                </div>
                <h2 className="text-base font-bold mt-1 text-slate-900 dark:text-slate-100">{selectedPlan.name}</h2>
                <div className="text-xs text-slate-400">
                  {selectedPlan.governorate} · {formatDate(selectedPlan.planDate)}
                  {selectedPlan.courier && ` · المندوب: ${selectedPlan.courier.name}`}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons in Drawer */}
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                الوقفات مرتبة تسلسلياً ({selectedPlan.stops?.length || 0})
              </div>
              <div className="flex items-center gap-2">
                {selectedPlan.status !== 'DISPATCHED' && selectedPlan.status !== 'COMPLETED' && (
                  <>
                    <button
                      onClick={handleAutoReorder}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg transition"
                      title="ترتيب تلقائي حسب المحافظة والمدينة"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ترتيب تلقائي بالمدينة</span>
                    </button>

                    <button
                      onClick={() => handleDispatchPlan(selectedPlan.id)}
                      disabled={!selectedPlan.courierId || selectedPlan.totalShipments === 0}
                      className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition ${
                        selectedPlan.courierId && selectedPlan.totalShipments > 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>تحويل لرحلة توزيع</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stops List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-2">
              {(!selectedPlan.stops || selectedPlan.stops.length === 0) ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  لا توجد وقفات في خط السير هذا بعد.
                </div>
              ) : (
                selectedPlan.stops.map((stop, idx) => (
                  <div key={stop.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-slate-700 dark:text-slate-300 text-xs flex-shrink-0">
                        {stop.seq}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {stop.contactName} {stop.contactPhone ? `(${stop.contactPhone})` : ''}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {stop.address} {stop.city ? `· ${stop.city}` : ''} ({stop.governorate})
                        </div>
                        {stop.shipmentId && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                            <Package className="w-3 h-3" />
                            <span>شحنة مرتبطة</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPlan.status !== 'DISPATCHED' && selectedPlan.status !== 'COMPLETED' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveStop(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                          title="تحريك لأعلى"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleMoveStop(idx, 'DOWN')}
                          disabled={idx === (selectedPlan.stops?.length || 0) - 1}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                          title="تحريك لأسفل"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Stop Form in Drawer */}
            {selectedPlan.status !== 'DISPATCHED' && selectedPlan.status !== 'COMPLETED' && (
              <form onSubmit={handleAddManualStop} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">إضافة وقفة يدوية للخطة:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="اسم المسؤول / العميل *"
                    value={manualContactName}
                    onChange={(e) => setManualContactName(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60 outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="الهاتف"
                    value={manualContactPhone}
                    onChange={(e) => setManualContactPhone(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60 outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="العنوان التفصيلي *"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="col-span-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60 outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="المدينة / المنطقة"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg transition"
                >
                  إضافة الوقفة
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Route Plan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">إنشاء خط سير مسبق (Route Plan)</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">اسم خط السير *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خط وسط البلد والمعادي - صباحي"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">المحافظة المستهدفة</label>
                  <select
                    value={createForm.governorate}
                    onChange={(e) => setCreateForm({ ...createForm, governorate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">تاريخ الخطة *</label>
                  <DateInput
                    value={createForm.planDate}
                    onChange={(val) => setCreateForm({ ...createForm, planDate: val })}
                    className="w-full"
                  />
                </div>
              </div>

              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">الفرع (اختياري)</label>
                  <select
                    value={createForm.branchId}
                    onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none text-xs sm:text-sm"
                  >
                    <option value="">جميع الفروع / غير محدد</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={createForm.suggestShipments}
                    onChange={(e) => setCreateForm({ ...createForm, suggestShipments: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>اقتراح وإضافة الشحنات المعلقة الجاهزة في هذه المحافظة تلقائياً كوقفات</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء خط السير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Courier */}
      {assigningPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">إسناد مندوب لخط السير</h3>
              <button onClick={() => setAssigningPlan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              الخطة: <span className="font-semibold text-slate-800 dark:text-slate-200">{assigningPlan.name}</span> ({assigningPlan.governorate})
              <div className="mt-1">شحنات الخطة: <span className="font-bold font-mono">{assigningPlan.totalShipments}</span> شحنة</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">اختر المندوب (المتاح والمغطي للمحافظة):</label>
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none text-xs sm:text-sm font-medium"
              >
                <option value="">-- اختر المندوب --</option>
                {couriers.map((c) => {
                  const zonesStr = Array.isArray(c.zones) ? c.zones.join('، ') : '';
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentLoad !== undefined ? `· الحمل: ${c.currentLoad}` : ''} {zonesStr ? `[${zonesStr}]` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningPlan(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAssignCourier}
                disabled={submitting || !selectedCourierId}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-40"
              >
                {submitting ? 'جاري الإسناد...' : 'تأكيد الإسناد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlansPage;
