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
import { toast } from 'sonner';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';
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
  CALIBRATION_DIAL_IN: { label: 'معايرة مطحنة (Dial-in)', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  SPILL_DROP: { label: 'انسكاب وسقوط (Spill/Drop)', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30' },
  EXPIRED_SPOILED: { label: 'تلف وانتهاء صلاحية', badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30' },
  QUALITY_TEST: { label: 'تذوق واختبار جودة', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  OTHER: { label: 'أخرى', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/30' }
};

export default function WasteTrackingPage() {
  const { formatPrice } = useCurrency();
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
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'فشل تحميل سجلات الهدر');
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

      if (prodData?.data) {
        setProducts(prodData.data);
      }
      if (whData?.data && Array.isArray(whData.data)) {
        setWarehouses(whData.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedReasonFilter]);

  useEffect(() => {
    fetchMeta();
  }, []);

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
        toast.success(data.message || 'تم تسجيل الهدر وخصم المخزون بنجاح');
        setShowLogModal(false);
        await fetchLogs();
      } else {
        toast.error(data?.message || 'فشل تسجيل الهدر');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الهدر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDialIn = async () => {
    const coffeeProd = products.find(p => p.name.includes('بن') || p.name.includes('قهوة') || p.name.toLowerCase().includes('coffee'));
    const targetWhId = warehouses[0]?.id;

    if (!coffeeProd || !targetWhId) {
      setShowLogModal(true);
      return;
    }

    try {
      const res = await companyAwareApi.post<any>('/cafe/waste', {
        productId: coffeeProd.id,
        warehouseId: targetWhId,
        quantity: 50,
        unit: 'G',
        reason: 'CALIBRATION_DIAL_IN',
        notes: 'معايرة سريعة لضبط استخلاص الإسبريسو الصباحي'
      });
      const data = res.data;
      if (data?.success) {
        toast.success('تم تسجيل معايرة المطحنة (50 جم) وخصم الرصيد بنجاح');
        await fetchLogs();
      } else {
        toast.error(data?.message || 'فشل تسجيل المعايرة');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'فشل تسجيل المعايرة السريعة');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6 space-y-4">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h1 className="text-xl font-bold tracking-tight text-pretty">
              سجل الهدر والتالف التشغيلي (Waste & Spoilage Log)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            توثيق هدر معايرة المطحنة، انسكاب المشروبات، والتالف مع الخصم التلقائي للمخزون
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickDialIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            <Flame className="w-3.5 h-3.5" />
            معايرة مطحنة (50 جم)
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            تسجيل هدر
          </button>
        </div>
      </div>

      {/* Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            <span>إجمالي الخسارة المالية</span>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </span>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-destructive">
            {formatPrice(totalWasteValue)}
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            <span>إجمالي الكميات المهدرة</span>
            <Scale className="w-4 h-4 text-amber-500" />
          </span>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
            {totalWasteQty.toLocaleString('ar-EG')} <span className="text-xs font-normal text-muted-foreground">وحدة</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            <span>عدد الحركات المسجلة</span>
            <AlertOctagon className="w-4 h-4 text-primary" />
          </span>
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
            {totalCount} <span className="text-xs font-normal text-muted-foreground">حالة هدر</span>
          </div>
        </div>
      </div>

      {/* Table Surface */}
      <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
        <div className="p-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20">
          <span className="text-xs font-semibold text-foreground">سجل حركات الهدر التفصيلية</span>
          <select
            value={selectedReasonFilter}
            onChange={(e) => setSelectedReasonFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="">جميع أسباب الهدر</option>
            {Object.entries(REASONS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">جاري تحميل سجلات الهدر...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center border-t border-border/30 p-6">
            <Trash2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-sm font-semibold mb-1">لا توجد سجلات هدر مسجلة حالياً</h3>
            <p className="text-xs text-muted-foreground mb-4">
              سجل حركات الهدر لمعايرة المطحنة أو التالف لخصمها من مخزون البار وحساب التكلفة بدقة.
            </p>
            <button
              onClick={() => setShowLogModal(true)}
              className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground font-medium"
            >
              تسجيل أول حركة هدر
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
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
              <tbody className="divide-y divide-border/30">
                {logs.map((log) => {
                  const reasonMeta = REASONS[log.reason] || REASONS.OTHER;
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                        {new Date(log.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{log.product?.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] border font-medium ${reasonMeta.badge}`}>
                          {reasonMeta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-destructive tabular-nums">
                        -{Number(log.quantity).toLocaleString()} {log.unit}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground tabular-nums">{formatPrice(Number(log.costPerUnit))}</td>
                      <td className="py-2.5 px-3 font-bold text-destructive tabular-nums">{formatPrice(Number(log.totalCost))}</td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-xs">{log.notes || '—'}</td>
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
