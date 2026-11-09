import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import courierPortalApi, { getCourierToken } from './services/courierPortalApi';
import CourierDeliverySheet from './CourierDeliverySheet';
import CourierShipmentCard from './CourierShipmentCard';
import CourierBarcodeScannerModal from './CourierBarcodeScannerModal';
import { useOfflineQueue } from './services/offlineQueue';

type FilterTab = 'ALL' | 'PENDING' | 'DELIVERED' | 'RETURNED';

export const CourierRunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { queueCount } = useOfflineQueue();

  const [run, setRun] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [tab, setTab] = useState<FilterTab>('ALL');

  // Delivery action sheet state
  const [activeShipment, setActiveShipment] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const fetchRun = useCallback(async () => {
    if (!id) return;
    if (!getCourierToken()) {
      navigate('/courier-portal/login', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const res = await courierPortalApi.getRun(id);
      if (res.success && res.data) {
        setRun(res.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        navigate('/courier-portal/login', { replace: true });
        return;
      }
      toast.error('تعذر تحميل بيانات المأمورية');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const shipments: any[] = useMemo(() => run?.shipments || [], [run]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const isDelivered = s.status === 'DELIVERED';
      const isReturned = ['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status);
      const isPending = !isDelivered && !isReturned;

      if (tab === 'PENDING' && !isPending) return false;
      if (tab === 'DELIVERED' && !isDelivered) return false;
      if (tab === 'RETURNED' && !isReturned) return false;

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const customerName = (s.order?.customerName || '').toLowerCase();
        const customerPhone = (s.order?.customerPhone || '').toLowerCase();
        const orderNumber = (s.order?.orderNumber || s.trackingNumber || '').toLowerCase();
        const address = (s.destinationAddress || s.order?.customerAddress || '').toLowerCase();

        return (
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          orderNumber.includes(query) ||
          address.includes(query)
        );
      }

      return true;
    });
  }, [shipments, tab, search]);

  const counts = useMemo(() => {
    let pending = 0;
    let delivered = 0;
    let returned = 0;
    for (const s of shipments) {
      if (s.status === 'DELIVERED') delivered++;
      else if (['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)) returned++;
      else pending++;
    }
    return { all: shipments.length, pending, delivered, returned };
  }, [shipments]);

  const formatWhatsAppUrl = (phone: string, text?: string) => {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('00')) clean = clean.substring(2);
    if (clean.startsWith('01') && clean.length === 11) clean = `2${clean}`;
    const query = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${query}`;
  };

  const getMapUrl = (address: string, city?: string) => {
    const full = [address, city, 'مصر'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`;
  };

  const handleOpenSheet = (shipment: any) => {
    setActiveShipment(shipment);
    setIsSheetOpen(true);
  };

  const handleActionComplete = (result: {
    status: string;
    collectedAmount?: number;
    shipmentId: string;
    queued?: boolean;
  }) => {
    if (run) {
      const updatedShipments = run.shipments.map((s: any) => {
        if (s.id === result.shipmentId) {
          return {
            ...s,
            status: result.status,
            collectedAmount: result.collectedAmount,
          };
        }
        return s;
      });
      setRun({ ...run, shipments: updatedShipments });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetchRun();
    }
  };

  if (loading && !run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          المأمورية غير موجودة أو انتهت صلاحيتها
        </p>
        <Link to="/courier-portal" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20" dir="rtl">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-3.5 py-2.5 shadow-xs">
        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              to="/courier-portal"
              aria-label="الرجوع"
              className="p-1.5 -mr-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {run.runNumber}
                </span>
                {run.otpRequired && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] rounded border border-amber-200">
                    <ShieldCheckIcon className="w-3 h-3" />
                    كود OTP مطلوب
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {counts.delivered} مسلّم من {counts.all} طرد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {queueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                {queueCount} أوفلاين
              </span>
            )}
            <button
              onClick={() => fetchRun()}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              aria-label="تحديث المانيفست"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar & Barcode Scanner Button */}
        <div className="w-full max-w-[1800px] mx-auto mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم العميل، الهاتف، أو رقم الطلب..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            aria-label="مسح الباركود بالكاميرا"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap active:scale-95"
          >
            <CameraIcon className="w-4 h-4" />
            <span>مسح باركود</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="w-full max-w-[1800px] mx-auto mt-2 flex gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <button
            onClick={() => setTab('ALL')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
              tab === 'ALL'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>الكل</span>
            <span className="font-mono text-[11px] opacity-80">({counts.all})</span>
          </button>
          <button
            onClick={() => setTab('PENDING')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
              tab === 'PENDING'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>متبقي</span>
            <span className="font-mono text-[11px] opacity-80">({counts.pending})</span>
          </button>
          <button
            onClick={() => setTab('DELIVERED')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
              tab === 'DELIVERED'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>مسلّم</span>
            <span className="font-mono text-[11px] opacity-80">({counts.delivered})</span>
          </button>
          <button
            onClick={() => setTab('RETURNED')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
              tab === 'RETURNED'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>مرتجع</span>
            <span className="font-mono text-[11px] opacity-80">({counts.returned})</span>
          </button>
        </div>
      </header>

      {/* Shipments List */}
      <main className="w-full max-w-[1800px] mx-auto p-3.5 sm:p-6 space-y-3">
        {filteredShipments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
            لا توجد شحنات تطابق هذا البحث أو الفلتر
          </div>
        ) : (
          filteredShipments.map((s) => (
            <CourierShipmentCard
              key={s.id}
              shipment={s}
              onOpenSheet={handleOpenSheet}
              formatWhatsAppUrl={formatWhatsAppUrl}
              getMapUrl={getMapUrl}
            />
          ))
        )}
      </main>

      {/* Delivery Action Bottom Sheet */}
      {activeShipment && (
        <CourierDeliverySheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          runId={run.id}
          shipment={activeShipment}
          otpRequired={Boolean(run.otpRequired)}
          onActionComplete={handleActionComplete}
        />
      )}

      {/* Barcode Scanner Modal */}
      <CourierBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        shipments={shipments}
        onShipmentScanned={(scannedShipment) => {
          setActiveShipment(scannedShipment);
          setIsSheetOpen(true);
        }}
      />
    </div>
  );
};

export default CourierRunPage;
