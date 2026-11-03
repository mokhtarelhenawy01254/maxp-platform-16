import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building2,
  Phone,
  MapPin,
  Clock,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import {
  PickupRequest,
  ShippingBranch,
  getPickupStatusBadge,
  formatDate,
} from './shippingOpsShared';
import { DateInput } from '../../components/ui/DateInput';

export const PickupsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dropdown data
  const [branches, setBranches] = useState<ShippingBranch[]>([]);
  const [merchants, setMerchants] = useState<Array<{ id: string; name: string }>>([]);
  const [couriers, setCouriers] = useState<Array<{ id: string; name: string; phone?: string }>>([]);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<PickupRequest | null>(null);
  const [schedulingPickup, setSchedulingPickup] = useState<PickupRequest | null>(null);
  const [assigningPickup, setAssigningPickup] = useState<PickupRequest | null>(null);
  const [completingPickup, setCompletingPickup] = useState<PickupRequest | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    contactName: '',
    contactPhone: '',
    pickupAddress: '',
    governorate: 'القاهرة',
    city: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    timeSlot: '10:00 - 14:00',
    expectedParcels: 1,
    notes: '',
    merchantId: '',
    branchId: '',
  });

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleSlot, setScheduleSlot] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [actualParcelsCount, setActualParcelsCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchPickups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('limit', '25');

      const res = await fetch(`/api/v1/shipping-portal/pickups?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setPickups(data.pickups || []);
        setTotalCount(data.total || 0);
      }
    } catch {
      toast.error('فشل في جلب طلبات الاستلام');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  const fetchAuxData = useCallback(async () => {
    try {
      const [brRes, mRes, cRes] = await Promise.all([
        fetch('/api/v1/shipping-portal/branches', { headers: authHeaders }),
        fetch('/api/v1/shipping-portal/merchants', { headers: authHeaders }),
        fetch('/api/couriers', { headers: authHeaders }).catch(() => ({ json: () => ({ success: false }) })),
      ]);
      const [brData, mData, cData] = await Promise.all([brRes.json(), mRes.json(), cRes.json()]);
      if (brData.success) setBranches(brData.branches || []);
      if (mData.success) setMerchants(mData.data || []);
      if (cData && (cData.couriers || cData.data)) setCouriers(cData.couriers || cData.data || []);
    } catch (e) {
      console.warn('Aux fetch warning:', e);
    }
  }, []);

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  // Handle Create Pickup
  const handleCreatePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.contactName || !createForm.contactPhone || !createForm.pickupAddress) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/shipping-portal/pickups', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم إنشاء طلب الاستلام برقم ${data.pickup.pickupNumber}`);
        setShowCreateModal(false);
        fetchPickups();
        setCreateForm({
          contactName: '',
          contactPhone: '',
          pickupAddress: '',
          governorate: 'القاهرة',
          city: '',
          scheduledDate: new Date().toISOString().slice(0, 10),
          timeSlot: '10:00 - 14:00',
          expectedParcels: 1,
          notes: '',
          merchantId: '',
          branchId: '',
        });
      } else {
        toast.error(data.error || 'فشل إنشاء طلب الاستلام');
      }
    } catch {
      toast.error('حدث خطأ بالاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Schedule
  const handleScheduleSubmit = async () => {
    if (!schedulingPickup || !scheduleDate) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/shipping-portal/pickups/${schedulingPickup.id}/schedule`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ scheduledDate: scheduleDate, timeSlot: scheduleSlot }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تمت جدولة موعد الاستلام بنجاح');
        setSchedulingPickup(null);
        fetchPickups();
      } else {
        toast.error(data.error || 'فشل تحديث الجدولة');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assign
  const handleAssignSubmit = async () => {
    if (!assigningPickup || !selectedCourierId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/shipping-portal/pickups/${assigningPickup.id}/assign`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ courierId: selectedCourierId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إسناد المندوب بنجاح');
        setAssigningPickup(null);
        fetchPickups();
      } else {
        toast.error(data.error || 'فشل إسناد المندوب');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Complete
  const handleCompleteSubmit = async () => {
    if (!completingPickup) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/shipping-portal/pickups/${completingPickup.id}/complete`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ actualParcels: actualParcelsCount }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم تأكيد اكتمال الاستلام');
        setCompletingPickup(null);
        fetchPickups();
      } else {
        toast.error(data.error || 'فشل إكمال الطلب');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancel
  const handleCancelPickup = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء طلب الاستلام؟')) return;
    try {
      const res = await fetch(`/api/v1/shipping-portal/pickups/${id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إلغاء طلب الاستلام');
        fetchPickups();
      } else {
        toast.error(data.error || 'فشل الإلغاء');
      }
    } catch {
      toast.error('حدث خطأ بالاتصال');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isEn ? 'Pickup Requests' : 'طلبات الاستلام (Pickup)'}
            </h1>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
              {totalCount}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isEn ? 'Coordinate merchant and customer warehouse parcel intake' : 'إدارة ومتابعة طلبات استلام الشحنات من التجار والمخازن'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? 'New Pickup Request' : 'طلب استلام جديد'}</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isEn ? 'Search by pickup #, name, phone, address...' : 'البحث برقم الطلب، الاسم، الهاتف، العنوان...'}
            className="w-full rtl:pr-9 ltr:pl-9 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
          >
            <option value="">{isEn ? 'All Statuses' : 'جميع الحالات'}</option>
            <option value="REQUESTED">{isEn ? 'Requested' : 'مطلوب'}</option>
            <option value="SCHEDULED">{isEn ? 'Scheduled' : 'مجدول'}</option>
            <option value="ASSIGNED">{isEn ? 'Assigned' : 'تم الإسناد'}</option>
            <option value="COMPLETED">{isEn ? 'Completed' : 'مكتمل'}</option>
            <option value="CANCELLED">{isEn ? 'Cancelled' : 'ملغي'}</option>
          </select>

          <button
            onClick={fetchPickups}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pickups Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">{isEn ? 'Pickup #' : 'رقم الطلب'}</th>
                <th className="px-4 py-3">{isEn ? 'Contact' : 'مسؤول الاستلام'}</th>
                <th className="px-4 py-3">{isEn ? 'Governorate / Address' : 'العنوان والمحافظة'}</th>
                <th className="px-4 py-3">{isEn ? 'Schedule' : 'الموعد'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Parcels (Exp/Act)' : 'الطرود (متوقع/فعلي)'}</th>
                <th className="px-4 py-3">{isEn ? 'Courier' : 'المندوب'}</th>
                <th className="px-4 py-3">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && pickups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading pickup requests...' : 'جاري تحميل طلبات الاستلام...'}</span>
                  </td>
                </tr>
              ) : pickups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>{isEn ? 'No pickup requests found' : 'لا توجد طلبات استلام مسجلة'}</span>
                  </td>
                </tr>
              ) : (
                pickups.map((p) => {
                  const badge = getPickupStatusBadge(p.status, isEn);
                  const isPending = p.status === 'REQUESTED' || p.status === 'SCHEDULED';
                  const isAssigned = p.status === 'ASSIGNED';
                  const isFinished = p.status === 'COMPLETED' || p.status === 'CANCELLED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => setSelectedPickup(p)}
                          className="hover:underline text-right"
                        >
                          {p.pickupNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{p.contactName}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.contactPhone}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.governorate}</span>
                        <div className="text-xs text-slate-500 truncate" title={p.pickupAddress}>
                          {p.pickupAddress}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        <div>{formatDate(p.scheduledDate)}</div>
                        {p.timeSlot && <div className="text-slate-400 text-[11px]">{p.timeSlot}</div>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.expectedParcels}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{p.actualParcels ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.assignedCourier ? (
                          <div className="font-medium text-indigo-600 dark:text-indigo-400">
                            {p.assignedCourier.name}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedPickup(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  setSchedulingPickup(p);
                                  setScheduleDate(p.scheduledDate.slice(0, 10));
                                  setScheduleSlot(p.timeSlot || '10:00 - 14:00');
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                                title="جدولة"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setAssigningPickup(p);
                                  setSelectedCourierId(p.assignedCourierId || '');
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                                title="إسناد مندوب"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {isAssigned && (
                            <button
                              onClick={() => {
                                setCompletingPickup(p);
                                setActualParcelsCount(p.expectedParcels || 1);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition font-medium"
                              title="تأكيد الاكتمال"
                            >
                              <PackageCheck className="w-4 h-4" />
                            </button>
                          )}

                          {!isFinished && (
                            <button
                              onClick={() => handleCancelPickup(p.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="إلغاء الطلب"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div>
            <span>{isEn ? 'Total Pickups:' : 'إجمالي الطلبات:'} </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{isEn ? 'Previous' : 'السابق'}</span>
            </button>
            <span className="font-medium px-2 tabular-nums">{page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={pickups.length < 25 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <span>{isEn ? 'Next' : 'التالي'}</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create Pickup Request */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">{isEn ? 'New Pickup Request' : 'طلب استلام طرود جديد'}</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePickup} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Contact Name *' : 'اسم مسؤول الاستلام *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.contactName}
                    onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: أحمد عبد الله"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Contact Phone *' : 'رقم هاتف الاستلام *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.contactPhone}
                    onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="01012345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isEn ? 'Pickup Address *' : 'عنوان المخزن / الاستلام التفصيلي *'}
                </label>
                <input
                  type="text"
                  required
                  value={createForm.pickupAddress}
                  onChange={(e) => setCreateForm({ ...createForm, pickupAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="الشارع، رقم المبنى، علامة مميزة..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Governorate *' : 'المحافظة *'}
                  </label>
                  <select
                    value={createForm.governorate}
                    onChange={(e) => setCreateForm({ ...createForm, governorate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g.id} value={g.nameAr}>
                        {isEn ? g.nameEn : g.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'City / District' : 'المدينة / المنطقة'}
                  </label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none"
                    placeholder="مثال: التجمع الخامس"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Scheduled Date *' : 'تاريخ الاستلام *'}
                  </label>
                  <DateInput
                    
                    required
                    value={createForm.scheduledDate}
                    onChange={(e) => setCreateForm({ ...createForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Time Slot' : 'الفترة الزمنية'}
                  </label>
                  <select
                    value={createForm.timeSlot}
                    onChange={(e) => setCreateForm({ ...createForm, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none text-xs"
                  >
                    <option value="10:00 - 14:00">10:00 ص - 02:00 م (صباحي)</option>
                    <option value="14:00 - 18:00">02:00 م - 06:00 م (مسائي)</option>
                    <option value="18:00 - 22:00">06:00 م - 10:00 م (ليلي)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Expected Parcels' : 'الطرود المتوقعة'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.expectedParcels}
                    onChange={(e) => setCreateForm({ ...createForm, expectedParcels: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Merchant (Optional)' : 'التاجر / العميل (اختياري)'}
                  </label>
                  <select
                    value={createForm.merchantId}
                    onChange={(e) => setCreateForm({ ...createForm, merchantId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none text-xs"
                  >
                    <option value="">{isEn ? 'Direct Pickup (No Merchant)' : 'استلام مباشر بدون تاجر'}</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {isEn ? 'Receiving Branch' : 'فرع الاستلام / الهاَب'}
                  </label>
                  <select
                    value={createForm.branchId}
                    onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none text-xs"
                  >
                    <option value="">{isEn ? 'Auto / Main Hub' : 'تلقائي / الهاَب الرئيسي'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isEn ? 'Notes' : 'ملاحظات وتوجيهات للمندوب'}
                </label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none text-xs"
                  placeholder="أية تعليمات خاصة بالاستلام..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'جاري الإنشاء...' : 'تأكيد طلب الاستلام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Pickup */}
      {schedulingPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>جدولة موعد الاستلام</span>
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">تاريخ الاستلام</label>
                <DateInput
                  
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">الفترة الزمنية</label>
                <select
                  value={scheduleSlot}
                  onChange={(e) => setScheduleSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="10:00 - 14:00">10:00 ص - 02:00 م (صباحي)</option>
                  <option value="14:00 - 18:00">02:00 م - 06:00 م (مسائي)</option>
                  <option value="18:00 - 22:00">06:00 م - 10:00 م (ليلي)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSchedulingPickup(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                حفظ الجدولة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Courier */}
      {assigningPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <span>إسناد المندوب للاستلام</span>
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">اختر المندوب</label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="">اختر مندوباً من القائمة...</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setAssigningPickup(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={submitting || !selectedCourierId}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
              >
                تأكيد الإسناد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete Pickup */}
      {completingPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              <span>تأكيد استلام الطرود</span>
            </h3>
            <div className="space-y-3 text-sm">
              <p className="text-xs text-slate-500">
                أدخل عدد الطرود الفعلي التي تم استلامها من العميل/المخزن:
              </p>
              <div>
                <label className="block text-xs font-medium mb-1">الطرود المستلمة فعلياً</label>
                <input
                  type="number"
                  min="1"
                  value={actualParcelsCount}
                  onChange={(e) => setActualParcelsCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-bold text-lg tabular-nums"
                />
                <span className="text-[11px] text-slate-400">
                  العدد المتوقع المسجل في الطلب: {completingPickup.expectedParcels}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setCompletingPickup(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleCompleteSubmit}
                disabled={submitting}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
              >
                تأكيد الاكتمال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Pickup Details */}
      {selectedPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="font-mono font-bold text-lg text-blue-600">
                    {selectedPickup.pickupNumber}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPickup(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Status & Badge */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">حالة الطلب</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPickupStatusBadge(selectedPickup.status, isEn).badgeClass}`}>
                  {getPickupStatusBadge(selectedPickup.status, isEn).label}
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-slate-500">مسؤول الاستلام</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {selectedPickup.contactName}
                    </div>
                    <div className="font-mono text-slate-500">{selectedPickup.contactPhone}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-slate-500">العنوان والمحافظة</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedPickup.governorate} {selectedPickup.city ? `- ${selectedPickup.city}` : ''}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">{selectedPickup.pickupAddress}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-slate-500">الموعد المحدد</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(selectedPickup.scheduledDate)}
                    </div>
                    {selectedPickup.timeSlot && (
                      <div className="text-slate-500">{selectedPickup.timeSlot}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Boxes className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-slate-500">إحصاء الطرود</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      متوقع: {selectedPickup.expectedParcels} | فعلي: {selectedPickup.actualParcels ?? 'لم يتم بعد'}
                    </div>
                  </div>
                </div>

                {selectedPickup.branch && (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500">فرع الاستلام / الهاَب</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedPickup.branch.name} ({selectedPickup.branch.code})
                      </div>
                    </div>
                  </div>
                )}

                {selectedPickup.notes && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-300">
                    <span className="font-bold block mb-1">ملاحظات:</span>
                    {selectedPickup.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedPickup(null)}
                className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupsPage;
