import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, XCircle, Clock, RefreshCw, Check, Ban } from 'lucide-react';
import { toast } from 'sonner';
import {
  PackageOpenRequestItem,
  PackageOpenStatus,
  formatDateTime,
} from './shippingServicesTypes';
import { ApproveOpenPackageModal, RejectOpenPackageModal } from './OpenPackageActionModals';

interface OpenPackageRequestsTabProps {
  authHeaders: Record<string, string>;
  isEn?: boolean;
}

export const OpenPackageRequestsTab: React.FC<OpenPackageRequestsTabProps> = ({
  authHeaders,
  isEn,
}) => {
  const [requests, setRequests] = useState<PackageOpenRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [approvingItem, setApprovingItem] = useState<PackageOpenRequestItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<PackageOpenRequestItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('shipmentId', search);

      const res = await fetch(
        `/api/v1/shipping-portal/open-package-requests?${params.toString()}`,
        { headers: authHeaders }
      );
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      } else {
        toast.error(data.message || (isEn ? 'Failed to fetch requests' : 'فشل في جلب طلبات فتح الشحنة'));
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, statusFilter, search, isEn]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (fee: number) => {
    if (!approvingItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/v1/shipping-portal/open-package-requests/${approvingItem.id}/approve`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ fee }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(isEn ? 'Package open request approved' : 'تمت الموافقة على فتح الشحنة بنجاح');
        setApprovingItem(null);
        fetchRequests();
      } else {
        toast.error(data.message || (isEn ? 'Approval failed' : 'فشل في اعتماد الطلب'));
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'خطأ في الاتصال بالخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (rejectionReason: string) => {
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      toast.error(isEn ? 'Rejection reason is required' : 'سبب الرفض مطلوب');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/v1/shipping-portal/open-package-requests/${rejectingItem.id}/reject`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(isEn ? 'Package open request rejected' : 'تم رفض طلب فتح الشحنة');
        setRejectingItem(null);
        fetchRequests();
      } else {
        toast.error(data.message || (isEn ? 'Rejection failed' : 'فشل في رفض الطلب'));
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'خطأ في الاتصال بالخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status: PackageOpenStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <Clock className="w-3 h-3 text-amber-600" />
            {isEn ? 'Pending Review' : 'قيد المراجعة'}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {isEn ? 'Approved' : 'تمت الموافقة'}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <XCircle className="w-3 h-3 text-rose-600" />
            {isEn ? 'Rejected' : 'مرفوض'}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const barcode = r.shipment?.barcode || r.shipment?.trackingNumber || r.shipmentId || '';
    const requester = r.requestedBy || '';
    return barcode.toLowerCase().includes(term) || requester.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? 'Search barcode or requester...' : 'ابحث بالباركود أو صاحب الطلب...'}
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {st === 'ALL'
                  ? isEn ? 'All' : 'الكل'
                  : st === 'PENDING'
                  ? isEn ? 'Pending' : 'قيد المراجعة'
                  : st === 'APPROVED'
                  ? isEn ? 'Approved' : 'المقبولة'
                  : isEn ? 'Rejected' : 'المرفوضة'}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchRequests()}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isEn ? 'Refresh' : 'تحديث'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5 font-medium">{isEn ? 'Barcode / Shipment' : 'الباركود / الشحنة'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Requested By' : 'مقدم الطلب'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Reason' : 'سبب الفتح'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="p-2.5 font-medium text-left">{isEn ? 'Fee' : 'الرسوم المقررة'}</th>
                <th className="p-2.5 font-medium">{isEn ? 'Reviewed By / At' : 'المراجعة'}</th>
                <th className="p-2.5 font-medium text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {isEn ? 'Loading package open requests...' : 'جارٍ تحميل طلبات فتح الشحنة...'}
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    {isEn ? 'No requests found' : 'لا توجد طلبات فتح شحنة'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <div className="font-mono font-medium text-slate-900 dark:text-white">
                        {req.shipment?.barcode || req.shipment?.trackingNumber || req.shipmentId}
                      </div>
                      {req.shipment?.recipientName && (
                        <div className="text-[11px] text-slate-400">{req.shipment.recipientName}</div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{req.requestedBy}</div>
                      <span className="text-[10px] text-slate-400">
                        {req.requestedByType === 'CLIENT'
                          ? isEn ? 'Merchant' : 'عميل الشحن'
                          : req.requestedByType === 'COURIER'
                          ? isEn ? 'Courier' : 'المندوب'
                          : isEn ? 'Admin' : 'الإدارة'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="text-slate-700 dark:text-slate-300 line-clamp-2 max-w-xs">
                        {req.reason || '—'}
                      </div>
                      {req.rejectionReason && (
                        <div className="text-[11px] text-rose-500 mt-0.5 line-clamp-1">
                          {isEn ? 'Reason:' : 'سبب الرفض:'} {req.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5">{renderStatusBadge(req.status)}</td>
                    <td className="p-2.5 text-left font-bold tabular-nums text-slate-900 dark:text-white">
                      {req.fee != null ? `${Number(req.fee).toFixed(2)} ج.م` : '—'}
                    </td>
                    <td className="p-2.5">
                      {req.reviewedBy ? (
                        <div>
                          <div className="text-slate-800 dark:text-slate-200 font-medium">{req.reviewedBy}</div>
                          <div className="text-[10px] text-slate-400">{formatDateTime(req.reviewedAt)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{formatDateTime(req.createdAt)}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {req.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setApprovingItem(req)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isEn ? 'Approve' : 'موافقة'}</span>
                          </button>
                          <button
                            onClick={() => setRejectingItem(req)}
                            className="px-2 py-1 border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            <span>{isEn ? 'Reject' : 'رفض'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ApproveOpenPackageModal
        isOpen={Boolean(approvingItem)}
        onClose={() => setApprovingItem(null)}
        item={approvingItem}
        onConfirm={handleApprove}
        loading={actionLoading}
        isEn={isEn}
      />

      <RejectOpenPackageModal
        isOpen={Boolean(rejectingItem)}
        onClose={() => setRejectingItem(null)}
        item={rejectingItem}
        onConfirm={handleReject}
        loading={actionLoading}
        isEn={isEn}
      />
    </div>
  );
};
