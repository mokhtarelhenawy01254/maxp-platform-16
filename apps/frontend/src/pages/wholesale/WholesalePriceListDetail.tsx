import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Tag,
  Plus,
  Trash2,
  ArrowRight,
  Save,
  Layers,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  X,
  Clock,
  Check,
  History,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

interface PriceListItem {
  id?: string;
  productId: string;
  productName: string;
  sku?: string;
  price: number;
}

interface PriceListData {
  id?: string;
  name: string;
  nameEn?: string;
  currency: string;
  isActive: boolean;
  items: PriceListItem[];
}

interface ChangeRequestItem {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  field: string;
  oldValue?: string | null;
  newValue: string;
  reason: string;
  requestedBy: string;
  approvedBy?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt?: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  performedBy: string;
  createdAt: string;
}

export default function WholesalePriceListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  // Mode: View (read-only) by default for existing price lists; Edit mode for new or on toggle
  const [isEditing, setIsEditing] = useState(isNew);

  const [form, setForm] = useState<PriceListData>({
    name: "",
    nameEn: "",
    currency: "EGP",
    isActive: true,
    items: [],
  });

  const [initialForm, setInitialForm] = useState<PriceListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Price Change Request Modal state
  const [isPriceChangeModalOpen, setIsPriceChangeModalOpen] = useState(false);
  const [selectedItemForChange, setSelectedItemForChange] = useState<PriceListItem | null>(null);
  const [requestedPrice, setRequestedPrice] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [submittingPriceChange, setSubmittingPriceChange] = useState(false);
  const [priceChangeError, setPriceChangeError] = useState<string | null>(null);

  // Change Requests & Audit Logs for this price list
  const [changeRequests, setChangeRequests] = useState<ChangeRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadPriceList = async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get(`/wholesale/price-lists/${id}`);
      const data = res?.data?.data;
      if (data) {
        const loaded: PriceListData = {
          id: data.id,
          name: data.name || "",
          nameEn: data.nameEn || "",
          currency: data.currency || "EGP",
          isActive: data.isActive ?? true,
          items: (data.items || []).map((it: any) => ({
            id: it.id,
            productId: it.productId,
            productName: it.product?.name || it.productName || "صنف",
            sku: it.variant?.sku || it.product?.sku || it.sku || "",
            price: Number(it.price || 0),
          })),
        };
        setForm(loaded);
        setInitialForm(loaded);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تحميل قائمة الأسعار");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditsAndRequests = async () => {
    if (isNew || !id) return;
    try {
      setLoadingAudits(true);
      const [crRes, auditRes] = await Promise.all([
        apiClient.get(`/wholesale/change-requests?entityType=PRICE_LIST_ITEM&limit=50`),
        apiClient.get(`/wholesale/audit-logs?entityType=PRICE_LIST_ITEM&limit=50`),
      ]);
      setChangeRequests(crRes?.data?.data || []);
      setAuditLogs(auditRes?.data?.data || []);
    } catch (err) {
      console.error("Failed to load price change requests or audits", err);
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    void loadPriceList();
    void loadAuditsAndRequests();
  }, [id, isNew]);

  const handleCancelEdit = () => {
    if (initialForm) {
      setForm(initialForm);
    }
    setIsEditing(false);
    setError(null);
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", productName: "", sku: "", price: 0 }],
    }));
  };

  const updateItem = (index: number, field: keyof PriceListItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        await apiClient.post("/wholesale/price-lists", form);
        navigate("/wholesale/price-lists");
      } else {
        const { items, ...payload } = form;
        await apiClient.put(`/wholesale/price-lists/${id}`, payload);
        setInitialForm({ ...form });
        setIsEditing(false);
        setSuccessMessage("تم حفظ تعديلات قائمة الأسعار بنجاح");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل حفظ قائمة الأسعار");
    } finally {
      setSaving(false);
    }
  };

  // Open Price Change Request Modal for a specific item
  const openPriceChangeModal = (item: PriceListItem) => {
    setSelectedItemForChange(item);
    setRequestedPrice(String(item.price || ""));
    setChangeReason("");
    setPriceChangeError(null);
    setIsPriceChangeModalOpen(true);
  };

  // Submit Price Change Request
  const handleSubmitPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForChange?.id) {
      setPriceChangeError("يجب حفظ الصنف أولاً قبل تقديم طلب تعديل السعر");
      return;
    }
    const cleanReason = changeReason.trim();
    if (!cleanReason) {
      setPriceChangeError("سبب تعديل السعر إلزامي");
      return;
    }
    if (!requestedPrice || isNaN(Number(requestedPrice)) || Number(requestedPrice) <= 0) {
      setPriceChangeError("يرجى إدخال سعر صحيح أكبر من صفر");
      return;
    }
    try {
      setSubmittingPriceChange(true);
      setPriceChangeError(null);
      await apiClient.post("/wholesale/change-requests", {
        entityType: "PRICE_LIST_ITEM",
        entityId: selectedItemForChange.id,
        field: "price",
        newValue: requestedPrice,
        reason: cleanReason,
      });
      setIsPriceChangeModalOpen(false);
      setSelectedItemForChange(null);
      setRequestedPrice("");
      setChangeReason("");
      setSuccessMessage("تم تقديم طلب تعديل السعر بنجاح وهو بانتظار موافقة الإدارة (wholesale.approve)");
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setPriceChangeError(err?.response?.data?.message || "فشل إرسال طلب تعديل السعر");
    } finally {
      setSubmittingPriceChange(false);
    }
  };

  // Approve Change Request
  const handleApproveRequest = async (crId: string) => {
    try {
      setActionProcessingId(crId);
      await apiClient.post(`/wholesale/change-requests/${crId}/approve`);
      setSuccessMessage("تمت الموافقة على تعديل السعر وتحديث الصنف فوراً");
      void loadPriceList();
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل اعتماد طلب تعديل السعر");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (crId: string) => {
    setRejectTargetId(crId);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  // Confirm Reject
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;
    try {
      setActionProcessingId(rejectTargetId);
      await apiClient.post(`/wholesale/change-requests/${rejectTargetId}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      setIsRejectModalOpen(false);
      setRejectTargetId(null);
      setRejectReason("");
      setSuccessMessage("تم رفض طلب تعديل السعر بنجاح");
      void loadAuditsAndRequests();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل رفض طلب تعديل السعر");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Filter change requests that belong to items in this price list
  const itemIdsSet = new Set((form.items || []).map((it) => it.id).filter(Boolean));
  const relevantChangeRequests = changeRequests.filter(
    (cr) => cr.entityType === "PRICE_LIST_ITEM" && itemIdsSet.has(cr.entityId)
  );
  const relevantAuditLogs = auditLogs.filter(
    (l) => l.entityType === "PRICE_LIST_ITEM" && itemIdsSet.has(l.entityId)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex flex-col items-center justify-center gap-3 text-muted-foreground font-sans">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل مصفوفة الأسعار...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card text-foreground font-sans rtl" dir="rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  form.isActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {form.isActive ? "قائمة مفعلة ونشطة" : "قائمة معطلة مؤقتاً"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              {isNew ? "NEW_DRAFT" : `PL_ID: ${id}`}
            </span>
            {!isNew && (
              <>
                <span className="text-border">|</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] font-mono ${
                    isEditing ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isEditing ? "وضع التعديل" : "وضع العرض (قراءة فقط)"}
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>
              المنتجات المسجلة: <strong className="text-foreground">{form.items.length}</strong>
            </span>
            <span className="text-border">|</span>
            <span>
              العملة: <strong className="text-foreground">{form.currency}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            to="/wholesale/price-lists"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            العودة إلى مصفوفة قوائم الأسعار
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  هيكل تسعير الجملة
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isNew ? "new-pricelist" : `pl-${id?.slice(0, 8)}`}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {isNew ? "إنشاء قائمة أسعار جملة جديدة" : `قائمة الأسعار: ${form.name || "—"}`}
              </h1>
              <p className="text-xs text-muted-foreground">
                تحديد الأسعار الحصرية وهوامش الخصم لتطبيقها تلقائياً على طلبات التجار والموزعين
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2">
              {!isNew && (
                <>
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8 px-3 text-xs font-mono gap-1.5 border-primary/40 text-primary hover:bg-primary/5 active:scale-[0.98]"
                    >
                      <Pencil className="size-3.5" />
                      <span>تعديل القائمة</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-8 px-3 text-xs font-mono gap-1.5 border-border/70 text-muted-foreground active:scale-[0.98]"
                    >
                      <X className="size-3.5" />
                      <span>إلغاء التعديل</span>
                    </Button>
                  )}
                </>
              )}

              {(isEditing || isNew) && (
                <Button
                  type="submit"
                  form="wholesale-pricelist-form"
                  disabled={saving}
                  size="sm"
                  className="h-8 px-3 text-xs font-mono gap-1.5 bg-primary text-primary-foreground active:scale-[0.98]"
                >
                  <Save className="size-3.5" />
                  <span>{saving ? "جاري الحفظ..." : "حفظ قائمة الأسعار"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form id="wholesale-pricelist-form" onSubmit={handleSubmit} className="space-y-6">
          {/* General Info Card */}
          <div className="bg-card border border-border/70 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  بيانات القائمة العامة
                </h2>
              </div>
              {!isNew && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {isEditing ? "وضع التعديل نشط" : "وضع العرض (للقراءة فقط)"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">اسم القائمة (بالعربية) *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: أسعار كبار الموزعين - قطاع الصعيد"
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary read-only:bg-muted/30"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">الاسم بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={form.nameEn || ""}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  placeholder="Tier 1 VIP Wholesale"
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono read-only:bg-muted/30"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">العملة المعتمدة</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  disabled={!isEditing}
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  disabled={!isEditing}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-border/80 text-primary focus:ring-primary disabled:opacity-60"
                />
                <span className="font-medium text-foreground">
                  تفعيل القائمة وإتاحتها للتطبيق الفوري على حسابات التجار
                </span>
              </label>
            </div>
          </div>

          {/* Products Table Card */}
          <div className="bg-card border border-border/70 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  جدول تسعير الأصناف والمنتجات
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-muted-foreground font-mono tabular-nums">
                  {form.items.length} صنف
                </span>
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة منتج
                </button>
              )}
            </div>

            {form.items.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-md">
                <Package className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">
                  لم يتم إدراج أي منتجات في هذه القائمة بعد.{" "}
                  {isEditing && 'اضغط "إضافة منتج" لإدراج الأصناف وتحديد أسعار الجملة.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-end gap-3 rounded-md border border-border/70 bg-muted/10 p-3 text-xs hover:border-border transition-colors"
                  >
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">معرف المنتج / SKU</label>
                      <input
                        type="text"
                        value={item.productId}
                        onChange={(e) => updateItem(i, "productId", e.target.value)}
                        placeholder="PRD-102"
                        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary read-only:bg-muted/30"
                        readOnly={!isEditing}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="flex-[2] min-w-[200px] space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">اسم الصنف / المنتج *</label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(i, "productName", e.target.value)}
                        placeholder="قميص أكسفورد أبيض كلاسيك"
                        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary read-only:bg-muted/30"
                        readOnly={!isEditing}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="w-32 space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        سعر الجملة ({form.currency}) *
                      </label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary read-only:bg-muted/30"
                        step="0.01"
                        readOnly={!isEditing}
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Sensitive Price Change Request Button (available on saved items) */}
                    {!isNew && item.id && (
                      <button
                        type="button"
                        onClick={() => openPriceChangeModal(item)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="تقديم طلب تعديل سعر معتمد لهذا الصنف"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    )}

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted/40 rounded transition-colors"
                        title="حذف هذا الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Section: Price Change Requests & Approvals */}
        {!isNew && (
          <div className="bg-card border border-border/70 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  طلبات تعديل أسعار القائمة والموافقات وسجل التدقيق
                </h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {relevantChangeRequests.length} طلب
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadAuditsAndRequests()}
                className="h-7 text-xs font-mono gap-1"
              >
                <RefreshCw className="size-3" />
                <span>تحديث</span>
              </Button>
            </div>

            {loadingAudits ? (
              <div className="flex justify-center p-8 text-xs font-mono text-muted-foreground">
                <RefreshCw className="size-4 animate-spin ml-2 text-primary" />
                <span>جاري تحميل طلبات الأسعار وسجل التدقيق...</span>
              </div>
            ) : relevantChangeRequests.length === 0 ? (
              <div className="text-center py-6 font-mono text-xs text-muted-foreground">
                لا توجد طلبات تعديل أسعار مسجلة لأصناف هذه القائمة بعد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-right">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">معرف الصنف</th>
                      <th className="p-2.5">السعر السابق</th>
                      <th className="p-2.5">السعر المطلوب</th>
                      <th className="p-2.5">السبب الإلزامي</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {relevantChangeRequests.map((cr) => (
                      <tr key={cr.id} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(cr.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="p-2.5 font-bold text-foreground">
                          {cr.entityId?.slice(0, 10)}...
                        </td>
                        <td className="p-2.5 text-muted-foreground">{cr.oldValue} ج.م</td>
                        <td className="p-2.5 font-bold text-primary">{cr.newValue} ج.م</td>
                        <td className="p-2.5 text-foreground max-w-xs break-words">{cr.reason}</td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              cr.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : cr.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-red-500/10 text-red-600 border-red-500/30"
                            }`}
                          >
                            {cr.status === "PENDING" ? "معلق" : cr.status === "APPROVED" ? "معتمد" : "مرفوض"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          {cr.status === "PENDING" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                disabled={actionProcessingId === cr.id}
                                onClick={() => handleApproveRequest(cr.id)}
                                className="h-6 px-2.5 text-[11px] font-mono bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                title="موافقة وتحديث سعر الصنف فوراً"
                              >
                                <Check className="size-3" />
                                <span>موافقة</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionProcessingId === cr.id}
                                onClick={() => openRejectModal(cr.id)}
                                className="h-6 px-2.5 text-[11px] font-mono text-red-600 hover:bg-red-500/10 border-red-500/30 gap-1"
                              >
                                <X className="size-3" />
                                <span>رفض</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price Change Request Modal */}
      {isPriceChangeModalOpen && selectedItemForChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">طلب تعديل سعر الصنف (موافقة)</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setIsPriceChangeModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-3 bg-muted/40 border border-border/60 rounded-lg text-[11px] space-y-1">
              <div>
                <span className="text-muted-foreground">الصنف: </span>
                <strong className="text-foreground">{selectedItemForChange.productName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">السعر الحالي: </span>
                <strong className="text-foreground">{selectedItemForChange.price} {form.currency}</strong>
              </div>
              <p className="text-muted-foreground text-[10px] mt-1">
                تعديل سعر الصنف يتطلب إدخال سبب إلزامي ولا يسري إلا بعد موافقة الإدارة (wholesale.approve).
              </p>
            </div>

            {priceChangeError && (
              <div className="p-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                {priceChangeError}
              </div>
            )}

            <form onSubmit={handleSubmitPriceChange} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  سعر الجملة المقترح الجديد ({form.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={requestedPrice}
                  onChange={(e) => setRequestedPrice(e.target.value)}
                  placeholder="مثال: 180.00"
                  className="w-full h-8 px-2.5 bg-background border border-border/80 rounded-md text-foreground font-mono text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">سبب تعديل السعر (إلزامي) *</label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="اكتب سبب طلب تعديل السعر (مثال: تغير تكلفة المورد، خصم كميات خاص...)"
                  className="w-full h-20 p-2.5 border border-border/80 rounded-md bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPriceChangeModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPriceChange || !changeReason.trim()}
                  size="sm"
                  className="h-8 text-xs font-mono bg-primary text-primary-foreground gap-1"
                >
                  <Save className="size-3.5" />
                  <span>{submittingPriceChange ? "جاري الإرسال..." : "إرسال الطلب للاعتماد"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-2xl max-w-md w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <X className="size-4" />
                <h3 className="font-semibold text-foreground text-sm">رفض طلب تعديل السعر</h3>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setIsRejectModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">سبب الرفض (اختياري)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="اكتب سبب رفض الطلب..."
                  className="w-full h-20 p-2.5 border border-border/80 rounded-md bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="h-8 text-xs font-mono"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={actionProcessingId !== null}
                  size="sm"
                  className="h-8 text-xs font-mono bg-red-600 hover:bg-red-700 text-white gap-1"
                >
                  <X className="size-3.5" />
                  <span>تأكيد الرفض</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
