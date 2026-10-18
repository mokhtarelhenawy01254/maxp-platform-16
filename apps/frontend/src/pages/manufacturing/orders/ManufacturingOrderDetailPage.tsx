import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RotateCw, ArrowRight } from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, ProductionOrder } from '../manufacturingApi';

// Tabs
import { OrderStagesTab } from './tabs/OrderStagesTab';
import { OrderMaterialIssuesTab } from './tabs/OrderMaterialIssuesTab';
import { OrderGoodsReceiptsTab } from './tabs/OrderGoodsReceiptsTab';
import { OrderCostAnalysisTab } from './tabs/OrderCostAnalysisTab';
import { OrderJournalEntriesTab } from './tabs/OrderJournalEntriesTab';
import { OrderAttachmentsTab } from './tabs/OrderAttachmentsTab';

// Modals & Header
import { OrderCockpitHeader } from './cockpit/OrderCockpitHeader';
import { OrderLifecycleModals } from './cockpit/OrderLifecycleModals';

type OrderTab = 'stages' | 'issues' | 'receipts' | 'costing' | 'entries' | 'attachments';

export const ManufacturingOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderTab>('stages');

  // Dialogs
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [autoIssue, setAutoIssue] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [costWarnings, setCostWarnings] = useState<any[]>([]);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await manufacturingApi.getOrderById(id);
      setOrder(data);
      if (data?.costWarnings && data.costWarnings.length > 0) {
        setCostWarnings(data.costWarnings);
      }
    } catch (err: any) {
      console.error('Failed to load order', err);
      setError('تعذر تحميل تفاصيل أمر الإنتاج');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleRelease = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const updated = await manufacturingApi.releaseOrder(id);
      setOrder(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل اعتماد أمر الإنتاج');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartOrder = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await manufacturingApi.startOrder(id, { autoIssue });
      setOrder(res.data);
      if (res.costWarnings && res.costWarnings.length > 0) {
        setCostWarnings(res.costWarnings);
      }
      setStartDialogOpen(false);
      await loadOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل بدء تشغيل الأمر');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من إقفال أمر الإنتاج؟ سيتم تثبيت التكاليف الفعلية ومقارنتها بالقياسية.')) {
      return;
    }
    try {
      setActionLoading(true);
      const updated = await manufacturingApi.completeOrder(id);
      setOrder(updated);
      await loadOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل إقفال أمر الإنتاج');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!id || !cancelReason.trim()) return;
    try {
      setActionLoading(true);
      const updated = await manufacturingApi.cancelOrder(id, { reason: cancelReason.trim() });
      setOrder(updated);
      setCancelDialogOpen(false);
      setCancelReason('');
      await loadOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'فشل إلغاء أمر الإنتاج');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RotateCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">جارٍ تحميل بيانات أمر الإنتاج...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6" dir="rtl">
        <div className="max-w-md mx-auto p-6 rounded-xl bg-card border border-border/70 text-center space-y-3">
          <p className="text-xs text-destructive">{error || 'لم يتم العثور على أمر الإنتاج'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold"
          >
            العودة لقائمة الأوامر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16" dir="rtl">
      <ManufacturingHeader
        title={`أمر إنتاج: ${order.orderNumber}`}
        subtitle={`موديل: ${order.bom?.name || '—'} (${order.bom?.code || ''})`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrder}
              disabled={actionLoading}
              title="تحديث البيانات"
              className="p-2 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <Link
              to="/manufacturing/orders"
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border/70 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للأوامر</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Cockpit Status & Action Bar */}
        <OrderCockpitHeader
          order={order}
          actionLoading={actionLoading}
          onRelease={handleRelease}
          onOpenStartDialog={() => setStartDialogOpen(true)}
          onCompleteOrder={handleCompleteOrder}
          onOpenCancelDialog={() => setCancelDialogOpen(true)}
          costWarnings={costWarnings}
        />

        {/* 5-Tab Navigation Strip */}
        <div className="border-b border-border/70 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2.5 border-b-2 transition ${
              activeTab === 'stages'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            مراحل الإنتاج ({order.stages?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2.5 border-b-2 transition ${
              activeTab === 'issues'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            سندات صرف الخامات ({order.materialIssues?.length || order._count?.materialIssues || 0})
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2.5 border-b-2 transition ${
              activeTab === 'receipts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            استلام الإنتاج التام ({order.goodsReceipts?.length || order._count?.goodsReceipts || 0})
          </button>
          <button
            onClick={() => setActiveTab('costing')}
            className={`px-4 py-2.5 border-b-2 transition ${
              activeTab === 'costing'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            تحليل التكاليف والانحراف
          </button>
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-4 py-2.5 border-b-2 transition ${
              activeTab === 'entries'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            القيود المحاسبية لـ WIP
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-2.5 border-b-2 transition ${
              activeTab === 'attachments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            الصور والملفات
          </button>
        </div>

        {/* Tab 1: Stages Progress */}
        {activeTab === 'stages' && <OrderStagesTab order={order} onRefresh={loadOrder} />}

        {/* Tab 2: Material Issues */}
        {activeTab === 'issues' && (
          <OrderMaterialIssuesTab
            order={order}
            onRefresh={loadOrder}
            onShowWarnings={setCostWarnings}
          />
        )}

        {/* Tab 3: Goods Receipts */}
        {activeTab === 'receipts' && <OrderGoodsReceiptsTab order={order} onRefresh={loadOrder} />}

        {/* Tab 4: 3-Way Cost Analysis */}
        {activeTab === 'costing' && <OrderCostAnalysisTab order={order} />}

        {/* Tab 5: Linked Journal Entries */}
        {activeTab === 'entries' && <OrderJournalEntriesTab order={order} />}

        {/* Tab 6: Attachments & Gallery */}
        {activeTab === 'attachments' && <OrderAttachmentsTab order={order} onRefresh={loadOrder} />}
      </div>

      {/* Lifecycle Dialogs */}
      <OrderLifecycleModals
        startDialogOpen={startDialogOpen}
        onCloseStartDialog={() => setStartDialogOpen(false)}
        autoIssue={autoIssue}
        onChangeAutoIssue={setAutoIssue}
        onConfirmStart={handleStartOrder}
        cancelDialogOpen={cancelDialogOpen}
        onCloseCancelDialog={() => setCancelDialogOpen(false)}
        cancelReason={cancelReason}
        onChangeCancelReason={setCancelReason}
        onConfirmCancel={handleCancelOrder}
        actionLoading={actionLoading}
      />
    </div>
  );
};

export default ManufacturingOrderDetailPage;
