import { useState, useEffect } from 'react';
import {
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Scale,
  Calendar,
  AlertOctagon,
  TrendingDown,
  Warehouse as WarehouseIcon,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { config } from '../../config';
import { authService } from '../../services/authService';
import { companyAwareApi } from '../../services/companyAwareApi';
import CreateWasteModal from './CreateWasteModal';

interface WasteLog {
  id: string;
  quantity: number;
  unit: string;
  reason: string;
  costPerUnit: number;
  totalCost: number;
  notes?: string;
  loggedBy?: string;
  createdAt: string;
  product: { id: string; name: string; sku?: string; unit?: string };
  warehouse: { id: string; name: string; code: string };
}

interface ProductItem {
  id: string;
  name: string;
  cost?: number;
  unit?: string;
  sku?: string;
}

const REASONS: Record<string, { label: string; badge: string }> = {
  CALIBRATION_DIAL_IN: { label: 'معايرة مطحنة (Dial-in)', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  SPILL_DROP: { label: 'انسكاب وسقوط (Spill/Drop)', badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  EXPIRED_SPOILED: { label: 'تلف وانتهاء صلاحية', badge: 'bg-red-500/10 text-red-500 border-red-500/20' },
  QUALITY_TEST: { label: 'تذوق واختبار جودة', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  OTHER: { label: 'أخرى', badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
};

export default function WasteTrackingPage() {
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [totalWasteValue, setTotalWasteValue] = useState(0);
  const [totalWasteQty, setTotalWasteQty] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReasonFilter, setSelectedReasonFilter] = useState('');

  // Form State
  const [formProductId, setFormProductId] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formQuantity, setFormQuantity] = useState('50');
  const [formUnit, setFormUnit] = useState('G');
  const [formReason, setFormReason] = useState('CALIBRATION_DIAL_IN');
  const [formNotes, setFormNotes] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedReasonFilter) params.append('reason', selectedReasonFilter);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await companyAwareApi.get<any>(`/cafe/waste${queryString}`);
      const data = res.data;
      if (data?.success && data.data) {
        setLogs(data.data.logs || []);
        setTotalWasteValue(data.data.totalWasteValue || 0);
        setTotalWasteQty(data.data.totalWasteQuantity || 0);
        setTotalCount(data.data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [prodRes, whRes] = await Promise.all([
        companyAwareApi.get<any>('/products?limit=150'),
        companyAwareApi.get<any>('/warehouses')
      ]);
      const prodData = prodRes.data;
      const whData = whRes.data;

      if (prodData?.success && prodData.data) {
        const rawOnly = prodData.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          cost: Number(p.cost || 0),
          unit: p.unit || 'G',
          sku: p.sku || ''
        }));
        setProducts(rawOnly);
        if (rawOnly.length > 0) {
          setFormProductId(rawOnly[0].id);
          setFormUnit(rawOnly[0].unit || 'G');
        }
      }

      if (whData?.success && whData.data) {
        setWarehouses(whData.data);
        if (whData.data.length > 0) setFormWarehouseId(whData.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchMeta();
  }, [selectedReasonFilter]);

  const handleRecordWaste = async (formData: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unit: string;
    reason: string;
    notes?: string;
  }) => {
    try {
      setSubmitting(true);
      const res = await companyAwareApi.post<any>('/cafe/waste', formData);
      const data = res.data;
      if (data?.success) {
        setShowLogModal(false);
        await fetchLogs();
      } else {
        alert(data?.message || 'فشل تسجيل الهدر');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الهدر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDialIn = async () => {
    const coffeeProd = products.find(p => p.name.includes('بن') || p.name.includes('قهوة') || p.name.toLowerCase().includes('coffee'));
    if (!coffeeProd || !formWarehouseId) {
      setShowLogModal(true);
      return;
    }
    if (!window.confirm(`هل تريد تسجيل هدر معايرة مطحنة 50 جم لـ "${coffeeProd.name}" فوراً؟`)) return;

    try {
      const res = await companyAwareApi.post<any>('/cafe/waste', {
        productId: coffeeProd.id,
        warehouseId: formWarehouseId,
        quantity: 50,
        unit: 'G',
        reason: 'CALIBRATION_DIAL_IN',
        notes: 'معايرة سريعة لضبط استخلاص الإسبريسو الصباحي'
      });
      const data = res.data;
      if (data?.success) {
        await fetchLogs();
      } else {
        alert(data?.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-3 sm:p-6 space-y-4">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            سجل الهدر والتالف التشغيلي
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            توثيق هدر معايرة المطحنة، انسكاب المشروبات، والتالف مع الخصم التلقائي للمخزون
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickDialIn}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 active:scale-95 transition-all"
          >
            <Flame className="w-3.5 h-3.5" />
            معايرة مطحنة (50 جم)
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            تسجيل هدر
          </button>
        </div>
      </div>

      {/* Bento Telemetry Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/10">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            إجمالي الخسارة المالية
          </span>
          <span className="text-lg sm:text-2xl font-bold tabular-nums text-rose-400">
            {totalWasteValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} <span className="text-xs text-neutral-500 font-normal">ج.م</span>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/10">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            إجمالي الكميات المهدرة
          </span>
          <span className="text-lg sm:text-2xl font-bold tabular-nums text-white">
            {totalWasteQty.toLocaleString('ar-EG')} <span className="text-xs text-neutral-500 font-normal">وحدة</span>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/10 col-span-2 sm:col-span-1">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
            <AlertOctagon className="w-3.5 h-3.5 text-blue-500" />
            عدد الحركات المسجلة
          </span>
          <span className="text-lg sm:text-2xl font-bold tabular-nums text-white">
            {totalCount} <span className="text-xs text-neutral-500 font-normal">حالة هدر</span>
          </span>
        </div>
      </div>

      {/* Table Surface */}
      <div className="rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden">
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-neutral-300">سجل حركات الهدر التفصيلية</span>
          <select
            value={selectedReasonFilter}
            onChange={(e) => setSelectedReasonFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-neutral-200 outline-none"
          >
            <option value="">جميع أسباب الهدر</option>
            {Object.entries(REASONS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">جاري تحميل سجلات الهدر...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">لا توجد سجلات هدر مسجلة حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-900 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">المادة الخام</th>
                  <th className="py-2.5 px-3">سبب الهدر</th>
                  <th className="py-2.5 px-3">الكمية</th>
                  <th className="py-2.5 px-3">تكلفة الوحدة</th>
                  <th className="py-2.5 px-3">إجمالي الخسارة</th>
                  <th className="py-2.5 px-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const reasonMeta = REASONS[log.reason] || REASONS.OTHER;
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 text-neutral-400 tabular-nums">
                        {new Date(log.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">{log.product?.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] border font-medium ${reasonMeta.badge}`}>
                          {reasonMeta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-rose-400 tabular-nums">
                        -{Number(log.quantity).toLocaleString()} {log.unit}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 tabular-nums">{Number(log.costPerUnit).toFixed(2)} ج.م</td>
                      <td className="py-2.5 px-3 font-bold text-rose-500 tabular-nums">{Number(log.totalCost).toFixed(2)} ج.م</td>
                      <td className="py-2.5 px-3 text-neutral-400 truncate max-w-xs">{log.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Waste Modal */}
      {showLogModal && (
        <CreateWasteModal
          products={products}
          warehouses={warehouses}
          reasons={REASONS}
          submitting={submitting}
          onClose={() => setShowLogModal(false)}
          onSubmit={handleRecordWaste}
        />
      )}
    </div>
  );
}
