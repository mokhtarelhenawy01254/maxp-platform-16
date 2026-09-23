import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardDocumentCheckIcon,
  PlayIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';

interface AuditItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  expectedQuantity: number;
  actualQuantity: number | null;
  varianceQuantity: number;
  unitCost: number;
  varianceCost: number;
  isReconciled: boolean;
  notes?: string;
}

interface AuditSession {
  id: string;
  sessionNumber: string;
  title: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED';
  startedAt: string;
  approvedAt?: string;
  totalExpectedValue: number;
  totalActualValue: number;
  totalVarianceValue: number;
  warehouse: {
    id: string;
    name: string;
  };
  items: AuditItem[];
}

interface WarehouseOption {
  id: string;
  name: string;
}

export const StockCountSessionPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [currentSession, setCurrentSession] = useState<AuditSession | null>(null);
  const [counts, setCounts] = useState<{ [itemId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Start new session state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [isStartingNew, setIsStartingNew] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, warehousesRes] = await Promise.all([
        companyAwareApi.get('/cafe/audits'),
        companyAwareApi.get('/warehouses')
      ]);

      if (sessionsRes.data?.success) {
        setSessions(sessionsRes.data.data.sessions || []);
      }
      if (warehousesRes.data?.data) {
        setWarehouses(warehousesRes.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل تحميل بيانات الجرد');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const res = await companyAwareApi.get(`/cafe/audits/${sessionId}`);
      if (res.data?.success) {
        const session: AuditSession = res.data.data;
        setCurrentSession(session);
        // Pre-fill local counts
        const initialCounts: { [id: string]: string } = {};
        session.items.forEach((item) => {
          initialCounts[item.id] = item.actualQuantity !== null ? String(item.actualQuantity) : '';
        });
        setCounts(initialCounts);
      }
    } catch (err: any) {
      toast.error('فشل فتح تفاصيل الجلسة');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      toast.error('يرجى اختيار المخزن المطلوب جرده');
      return;
    }

    try {
      setSaving(true);
      const res = await companyAwareApi.post('/cafe/audits', {
        warehouseId: selectedWarehouseId,
        title: sessionTitle || undefined
      });

      if (res.data?.success) {
        toast.success('تم بدء جلسة الجرد وأخذ لقطة فورية للأرصدة');
        setIsStartingNew(false);
        handleOpenSession(res.data.data.id);
        loadInitialData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل بدء الجلسة');
    } finally {
      setSaving(false);
    }
  };

  const handleCountChange = (itemId: string, value: string) => {
    setCounts((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSaveCounts = async (isFinalSubmission = false) => {
    if (!currentSession) return;
    try {
      setSaving(true);
      const itemsPayload = Object.entries(counts).map(([id, actualQuantity]) => ({
        id,
        actualQuantity: actualQuantity === '' ? null : Number(actualQuantity)
      }));

      const res = await companyAwareApi.put(`/cafe/audits/${currentSession.id}/counts`, {
        items: itemsPayload,
        isFinalSubmission
      });

      if (res.data?.success) {
        toast.success(isFinalSubmission ? 'تم تقديم الجرد للاعتماد' : 'تم حفظ أرقام الجرد بنجاح');
        setCurrentSession(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حفظ أرقام الجرد');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndReconcile = async () => {
    if (!currentSession) return;
    if (!window.confirm('هل أنت متأكد من اعتماد الجرد؟ سيتم تعديل أرصدة المخزن تلقائياً وفق الفروقات.')) {
      return;
    }

    try {
      setSaving(true);
      const res = await companyAwareApi.post(`/cafe/audits/${currentSession.id}/approve`);
      if (res.data?.success) {
        toast.success('تم اعتماد الجرد وتسوية فوارق المخزن آلياً');
        setCurrentSession(res.data.data);
        loadInitialData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل اعتماد وتسوية الجرد');
    } finally {
      setSaving(false);
    }
  };

  // Live variance computations for current session
  const sessionStats = useMemo(() => {
    if (!currentSession) return { countedCount: 0, totalVarianceCost: 0, shortages: 0, surpluses: 0 };
    let countedCount = 0;
    let totalVarianceCost = 0;
    let shortages = 0;
    let surpluses = 0;

    currentSession.items.forEach((item) => {
      const valStr = counts[item.id];
      if (valStr !== undefined && valStr !== '') {
        countedCount++;
        const act = Number(valStr);
        const exp = Number(item.expectedQuantity || 0);
        const diff = act - exp;
        const diffCost = diff * Number(item.unitCost || 0);
        totalVarianceCost += diffCost;
        if (diff < 0) shortages++;
        if (diff > 0) surpluses++;
      }
    });

    return { countedCount, totalVarianceCost, shortages, surpluses };
  }, [currentSession, counts]);

  const filteredItems = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.items.filter((item) =>
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productSku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentSession, searchTerm]);

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-pretty">
              جلسات الجرد الفعلي والتسوية (Physical Stock Count)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مطابقة المخزون الفعلي بالدفتري، حصر الهدر والعجز، وتسوية الفروق بضغطة زر
          </p>
        </div>

        {!currentSession && (
          <button
            onClick={() => setIsStartingNew(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-[0.97]"
          >
            <PlayIcon className="w-4 h-4" />
            بدء جلسة جرد جديدة
          </button>
        )}
      </div>

      {/* Start Session Modal */}
      {isStartingNew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-card border border-border w-full max-w-md rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-semibold">بدء جلسة جرد لمخزن</h3>
              <button onClick={() => setIsStartingNew(false)}>
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleStartNewSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">المخزن المطلوب جرده *</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border"
                >
                  <option value="">اختر المخزن…</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">عنوان الجلسة</label>
                <input
                  type="text"
                  placeholder="مثال: جرد نهاية الوردية الصباحية"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStartingNew(false)}
                  className="px-3 py-1.5 text-xs rounded border border-border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {saving ? 'جاري البدء…' : 'تأكيد وأخذ لقطة الأرصدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE SESSION VIEW */}
      {currentSession ? (
        <div className="space-y-3">
          {/* Session Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {currentSession.sessionNumber}
                </span>
                <h2 className="text-sm font-semibold">{currentSession.title}</h2>
                <span className="text-xs px-2 py-0.5 rounded border border-border font-medium">
                  {currentSession.status}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                المخزن: {currentSession.warehouse?.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentSession(null)}
                className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
              >
                العودة للقائمة
              </button>
              {currentSession.status !== 'APPROVED' && (
                <>
                  <button
                    onClick={() => handleSaveCounts(false)}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
                  >
                    حفظ كمسودة
                  </button>
                  <button
                    onClick={handleApproveAndReconcile}
                    disabled={saving || sessionStats.countedCount < currentSession.items.length}
                    className="px-3.5 py-1.5 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <CheckIcon className="w-4 h-4" />
                    اعتماد وتسوية المخزن
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded border border-border/60 bg-card text-center">
              <span className="text-[10px] text-muted-foreground block">الأصناف المعدودة</span>
              <span className="text-sm font-bold tabular-nums">
                {sessionStats.countedCount} / {currentSession.items.length}
              </span>
            </div>
            <div className="p-2.5 rounded border border-border/60 bg-card text-center">
              <span className="text-[10px] text-muted-foreground block">أصناف بها عجز</span>
              <span className="text-sm font-bold text-destructive tabular-nums">
                {sessionStats.shortages} صنف
              </span>
            </div>
            <div className="p-2.5 rounded border border-border/60 bg-card text-center">
              <span className="text-[10px] text-muted-foreground block">أصناف بها زيادة</span>
              <span className="text-sm font-bold text-blue-500 tabular-nums">
                {sessionStats.surpluses} صنف
              </span>
            </div>
            <div className="p-2.5 rounded border border-border/60 bg-card text-center">
              <span className="text-[10px] text-muted-foreground block">صافي الفارق المالي</span>
              <span className={`text-sm font-bold tabular-nums ${sessionStats.totalVarianceCost < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {formatPrice(sessionStats.totalVarianceCost)}
              </span>
            </div>
          </div>

          {/* Search bar inside session */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="تصفية الأصناف بالاسم أو الباركود…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-1.5 text-xs rounded bg-muted/40 border border-border"
            />
          </div>

          {/* Counting Table */}
          <div className="border border-border/60 rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5 text-center">الرصيد الدفتري</th>
                  <th className="p-2.5 text-center">العد الفعلي *</th>
                  <th className="p-2.5 text-center">الفارق</th>
                  <th className="p-2.5 text-center">التكلفة والفرق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredItems.map((item) => {
                  const valStr = counts[item.id] || '';
                  const act = valStr !== '' ? Number(valStr) : null;
                  const exp = Number(item.expectedQuantity || 0);
                  const diff = act !== null ? act - exp : null;
                  const diffCost = diff !== null ? diff * Number(item.unitCost || 0) : null;

                  return (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <div className="font-medium text-foreground">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-[10px] text-muted-foreground font-mono">{item.productSku}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-muted-foreground">
                        {exp}
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          step="any"
                          disabled={currentSession.status === 'APPROVED'}
                          value={valStr}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          placeholder="أدخل الفعلي"
                          className="w-24 px-2 py-1 text-center font-mono text-xs rounded border border-border bg-background focus:ring-1 focus:ring-primary tabular-nums"
                        />
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums">
                        {diff === null ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-500 font-bold">مطابق (0)</span>
                        ) : diff < 0 ? (
                          <span className="text-destructive font-bold">{diff} (عجز)</span>
                        ) : (
                          <span className="text-blue-500 font-bold">+{diff} (زيادة)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums">
                        {diffCost !== null ? (
                          <span className={diffCost < 0 ? 'text-destructive' : 'text-emerald-500'}>
                            {formatPrice(diffCost)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SESSIONS LIST VIEW */
        <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="p-3">رقم الجلسة</th>
                <th className="p-3">المخزن</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3 text-center">إجمالي الفارق المالي</th>
                <th className="p-3 text-left">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    لا توجد جلسات جرد سابقة. اضغط على "بدء جلسة جرد جديدة" للبدء.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono font-medium text-primary">{s.sessionNumber}</td>
                    <td className="p-3 font-medium">{s.warehouse?.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(s.startedAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-3 text-center font-mono tabular-nums">
                      {formatPrice(s.totalVarianceValue || 0)}
                    </td>
                    <td className="p-3 text-left">
                      <button
                        onClick={() => handleOpenSession(s.id)}
                        className="px-2.5 py-1 text-xs rounded bg-muted hover:bg-muted/80"
                      >
                        فتح الجلسة
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockCountSessionPage;
