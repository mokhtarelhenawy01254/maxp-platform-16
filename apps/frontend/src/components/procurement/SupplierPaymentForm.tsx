import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Save,
  Printer,
  Banknote,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  ChevronsUpDown,
  Search,
  Check,
  UserPlus,
  Receipt,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { formatCurrency } from "../../utils/currency";
import { formatShortDate } from "../../utils/dateFormat";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  mobile?: string;
  contactPerson?: string;
  currentBalance?: number;
}

interface PurchaseInvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
}

interface ExistingPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  bankName?: string;
  checkNumber?: string;
  checkDate?: string;
  notes?: string;
  createdAt: string;
  supplier?: {
    id: string;
    name: string;
    phone?: string;
    contactPerson?: string;
    currentBalance?: number;
  };
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
  };
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "نقدي (كاش من الخزينة)", icon: Banknote },
  { value: "BANK_TRANSFER", label: "تحويل بنكي", icon: Building2 },
  { value: "INSTAPAY", label: "إنستاباي / محفظة إلكترونية", icon: CreditCard },
  { value: "CHECK", label: "شيك مصرفي", icon: FileText },
  { value: "OTHER", label: "أخرى", icon: Receipt },
];

const SupplierPaymentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryInvoiceId = searchParams.get("invoiceId");

  const isView = Boolean(id && id !== "new");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<PurchaseInvoiceSummary[]>([]);
  const [existingPayment, setExistingPayment] = useState<ExistingPayment | null>(null);

  // Supplier Combobox state
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Supplier Modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [quickSupplierPhone, setQuickSupplierPhone] = useState("");
  const [submittingQuickSupplier, setSubmittingQuickSupplier] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplierId: "",
    purchaseInvoiceId: queryInvoiceId || "",
    paymentDate: new Date().toISOString().split("T")[0] ?? "",
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    bankName: "",
    checkNumber: "",
    checkDate: "",
    notes: "",
  });

  // Click outside listener for supplier combobox
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setSupplierSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isView) {
      fetchExistingPayment();
    } else {
      fetchInitialData();
    }
  }, [id, queryInvoiceId]);

  // When supplier changes, fetch their open invoices
  useEffect(() => {
    if (formData.supplierId && !isView) {
      fetchSupplierInvoices(formData.supplierId);
    } else {
      setSupplierInvoices([]);
    }
  }, [formData.supplierId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const suppliersRes = await apiClient
        .get("/procurement/suppliers", { params: { limit: 200 } })
        .catch(() => ({ data: { suppliers: [] } }));

      const loadedSuppliers: Supplier[] =
        suppliersRes?.data?.suppliers || suppliersRes?.data?.data || [];
      setSuppliers(loadedSuppliers);

      // If linked to an invoice from query params, fetch that invoice
      if (queryInvoiceId) {
        try {
          const invRes = await apiClient.get(`/procurement/purchase-invoices/${queryInvoiceId}`);
          const inv = invRes.data?.invoice || invRes.data;
          if (inv) {
            setFormData((prev) => ({
              ...prev,
              supplierId: inv.supplierId || "",
              purchaseInvoiceId: inv.id,
              amount: String(inv.remainingAmount || ""),
              referenceNumber: inv.invoiceNumber ? `سداد فاتورة ${inv.invoiceNumber}` : "",
            }));
          }
        } catch (err) {
          console.warn("Could not pre-populate invoice:", err);
        }
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("فشل في تحميل بيانات الموردين");
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierInvoices = async (supplierId: string) => {
    try {
      const res = await apiClient.get("/procurement/purchase-invoices", {
        params: { supplierId, limit: 50 },
      });
      const allInvoices: any[] = res.data?.invoices || [];
      // Filter unpaid or partially paid
      const openInvoices: PurchaseInvoiceSummary[] = allInvoices
        .filter((inv) => Number(inv.remainingAmount || 0) > 0)
        .map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          totalAmount: Number(inv.totalAmount || 0),
          paidAmount: Number(inv.paidAmount || 0),
          remainingAmount: Number(inv.remainingAmount || 0),
          status: inv.status,
        }));

      setSupplierInvoices(openInvoices);
    } catch (err) {
      console.warn("Could not load supplier open invoices:", err);
    }
  };

  const fetchExistingPayment = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/procurement/supplier-payments/${id}`);
      const payment = res.data?.payment || res.data;
      setExistingPayment(payment);
    } catch (error: any) {
      console.error("Error loading payment:", error);
      toast.error(error.response?.data?.message || "تعذر تحميل بيانات الدفعة");
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === formData.supplierId);
  }, [suppliers, formData.supplierId]);

  const selectedInvoice = useMemo(() => {
    return supplierInvoices.find((inv) => inv.id === formData.purchaseInvoiceId);
  }, [supplierInvoices, formData.purchaseInvoiceId]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliers;
    const q = supplierSearchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.mobile && s.mobile.includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)),
    );
  }, [suppliers, supplierSearchQuery]);

  const currentPaymentAmount = parseFloat(formData.amount) || 0;
  const supplierBalance = Number(selectedSupplier?.currentBalance || 0);
  const balanceAfterPayment = supplierBalance - currentPaymentAmount;

  const handleCreateQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;

    try {
      setSubmittingQuickSupplier(true);
      const res = await apiClient.post("/procurement/suppliers", {
        name: quickSupplierName.trim(),
        phone: quickSupplierPhone.trim() || undefined,
      });

      const newSupplier = res.data?.supplier || res.data?.data || res.data;
      if (newSupplier?.id) {
        setSuppliers((prev) => [newSupplier, ...prev]);
        setFormData((prev) => ({ ...prev, supplierId: newSupplier.id }));
        toast.success("تمت إضافة المورد بنجاح");
        setIsQuickSupplierOpen(false);
        setQuickSupplierName("");
        setQuickSupplierPhone("");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر إضافة المورد الجديد");
    } finally {
      setSubmittingQuickSupplier(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error("يرجى اختيار المورد");
      return;
    }

    if (currentPaymentAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }

    if (selectedInvoice && currentPaymentAmount > selectedInvoice.remainingAmount) {
      toast.error(
        `المبلغ المدخل (${formatCurrency(currentPaymentAmount)}) أكبر من المتبقي على الفاتورة (${formatCurrency(selectedInvoice.remainingAmount)})`,
      );
      return;
    }

    try {
      setSaving(true);
      const payload = {
        supplierId: formData.supplierId,
        purchaseInvoiceId: formData.purchaseInvoiceId || undefined,
        paymentDate: formData.paymentDate,
        amount: currentPaymentAmount,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || undefined,
        bankName: formData.bankName || undefined,
        checkNumber: formData.checkNumber || undefined,
        checkDate: formData.checkDate || undefined,
        notes: formData.notes || undefined,
      };

      const res = await apiClient.post("/procurement/supplier-payments", payload);
      const created = res.data?.payment || res.data;
      toast.success("تم تسجيل سند الصرف بنجاح وتحديث حساب المورد");
      if (created?.id) {
        navigate(`/procurement/supplier-payments/${created.id}`);
      } else {
        navigate("/procurement/supplier-payments");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">جاري تحميل بيانات السند...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW MODE: Official Printable Voucher
  // ==========================================
  if (isView && existingPayment) {
    return (
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3 no-print">
          <Button
            variant="ghost"
            onClick={() => navigate("/procurement/supplier-payments")}
            className="gap-2 rounded-xl"
          >
            <ArrowLeft className="size-4" /> العودة لقائمة المدفوعات
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 rounded-xl"
            >
              <Printer className="size-4" /> طباعة السند
            </Button>
            <Button
              onClick={() => navigate("/procurement/supplier-payments/new")}
              className="gap-2 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              <Banknote className="size-4" /> تسجيل دفعة جديدة
            </Button>
          </div>
        </div>

        {/* Official Printable Voucher Card */}
        <Card className="border border-border/80 shadow-lg bg-card print:border-none print:shadow-none print:m-0">
          <CardContent className="p-6 sm:p-10 space-y-6">
            {/* Voucher Header */}
            <div className="flex items-center justify-between pb-6 border-b border-border/80">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-widest uppercase text-primary">
                  إيصال / سند صرف رسمي
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                  سند صرف نقدية / بنكي
                </h1>
                <p className="text-xs text-muted-foreground">
                  Payment Voucher — Procurement & Supplier Settlement
                </p>
              </div>

              <div className="text-right space-y-1 font-mono">
                <div className="text-xs text-muted-foreground font-sans">رقم السند:</div>
                <div className="text-xl font-black text-primary px-3 py-1 bg-primary/10 rounded-xl border border-primary/20 inline-block">
                  {existingPayment.paymentNumber}
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  تاريخ السند:{" "}
                  <strong className="text-foreground tabular-nums">
                    {formatShortDate(existingPayment.paymentDate, "ar")}
                  </strong>
                </div>
              </div>
            </div>

            {/* Voucher Amount Highlights */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  المبلغ المنصرف للمورد:
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(existingPayment.amount)}
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className="text-xs text-muted-foreground font-medium">طريقة الصرف:</span>
                <div className="text-base font-bold text-foreground flex items-center gap-1.5 justify-end">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {PAYMENT_METHODS.find((m) => m.value === existingPayment.paymentMethod)?.label ||
                    existingPayment.paymentMethod}
                </div>
              </div>
            </div>

            {/* Beneficiary & Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-2">
                <span className="text-xs font-bold text-muted-foreground block">
                  بيانات المستفيد (المورد):
                </span>
                <div className="text-base font-bold text-foreground">
                  {existingPayment.supplier?.name || "غير محدد"}
                </div>
                {existingPayment.supplier?.phone && (
                  <div className="text-xs text-muted-foreground font-mono">
                    هاتف: {existingPayment.supplier.phone}
                  </div>
                )}
                {existingPayment.supplier?.contactPerson && (
                  <div className="text-xs text-muted-foreground">
                    مسؤول التواصل: {existingPayment.supplier.contactPerson}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-2">
                <span className="text-xs font-bold text-muted-foreground block">
                  التخصيص والربط المحاسبي:
                </span>
                {existingPayment.purchaseInvoice ? (
                  <>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Receipt className="size-4 text-primary" />
                      سداد مقابل فاتورة:{" "}
                      <strong className="font-mono text-primary">
                        {existingPayment.purchaseInvoice.invoiceNumber}
                      </strong>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      إجمالي الفاتورة:{" "}
                      {formatCurrency(existingPayment.purchaseInvoice.totalAmount)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="size-4 text-amber-500" />
                    سداد عام على حساب المورد (دفعة تحت الحساب)
                  </div>
                )}
                {existingPayment.referenceNumber && (
                  <div className="text-xs text-muted-foreground font-mono">
                    المرجع: {existingPayment.referenceNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Bank / Check Details (if applicable) */}
            {(existingPayment.bankName || existingPayment.checkNumber) && (
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {existingPayment.bankName && (
                  <div>
                    <span className="text-muted-foreground block">البنك:</span>
                    <strong className="text-sm text-foreground">{existingPayment.bankName}</strong>
                  </div>
                )}
                {existingPayment.checkNumber && (
                  <div>
                    <span className="text-muted-foreground block">رقم الشيك:</span>
                    <strong className="text-sm font-mono text-foreground">
                      {existingPayment.checkNumber}
                    </strong>
                  </div>
                )}
                {existingPayment.checkDate && (
                  <div>
                    <span className="text-muted-foreground block">تاريخ استحقاق الشيك:</span>
                    <strong className="text-sm font-mono text-foreground tabular-nums">
                      {formatShortDate(existingPayment.checkDate, "ar")}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {existingPayment.notes && (
              <div className="p-3.5 rounded-xl border border-border/50 bg-muted/10 space-y-1">
                <span className="text-xs text-muted-foreground font-medium block">
                  ملاحظات السند:
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {existingPayment.notes}
                </p>
              </div>
            )}

            {/* Signature Blocks */}
            <div className="pt-8 border-t border-border/70 grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground">
              <div className="space-y-6">
                <div>المحاسب المسؤول</div>
                <div className="h-0.5 w-24 mx-auto border-b border-dashed border-border" />
              </div>
              <div className="space-y-6">
                <div>المدير المالي / الاعتماد</div>
                <div className="h-0.5 w-24 mx-auto border-b border-dashed border-border" />
              </div>
              <div className="space-y-6">
                <div>توقيع المستلم (المورد)</div>
                <div className="h-0.5 w-24 mx-auto border-b border-dashed border-border" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // CREATE MODE: Record New Supplier Payment
  // ==========================================
  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-5 pb-24 md:pb-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/procurement/supplier-payments")}
            className="rounded-full active:scale-[0.98] transition-transform duration-100"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Banknote className="size-6 text-primary" />
              تسجيل سند صرف / دفعة جديدة للمورد
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              صرف نقدية أو تحويل بنكي للمورد وخصمها فورياً من رصيده المالي أو ربطها بفاتورة معينة
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Split Layout: 8 cols Form / 4 cols Sticky Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form Fields (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Supplier Selection Card */}
            <Card className="border border-border/70 shadow-2xs relative z-30 overflow-visible bg-card" size="sm">
              <CardContent className="p-4 sm:p-5 space-y-4 overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Searchable Combobox for Supplier */}
                  <div className="space-y-1.5 relative" ref={supplierDropdownRef}>
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">المورد المستفيد *</Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setIsQuickSupplierOpen(true)}
                        className="p-0 h-auto text-xs text-primary font-medium flex items-center gap-1"
                      >
                        <UserPlus className="size-3.5" />
                        + مورد جديد
                      </Button>
                    </div>

                    {/* Trigger Input */}
                    <div
                      onClick={() => setSupplierSearchOpen((prev) => !prev)}
                      className="flex items-center justify-between h-11 px-3.5 py-2 rounded-xl border border-input bg-background/80 hover:bg-accent/40 cursor-pointer transition-colors shadow-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {selectedSupplier ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-foreground text-sm">
                              {selectedSupplier.name}
                            </span>
                            {selectedSupplier.phone && (
                              <span className="text-xs text-muted-foreground font-mono">
                                ({selectedSupplier.phone})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            اختر المورد المراد السداد له...
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
                    </div>

                    {/* Dropdown Menu with Instant Search */}
                    {supplierSearchOpen && (
                      <div className="absolute top-full start-0 min-w-full sm:min-w-[380px] md:min-w-[420px] max-w-[calc(100vw-2rem)] z-50 mt-1.5 rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl p-2 space-y-2 text-popover-foreground animate-in fade-in-0 zoom-in-95">
                        <div className="relative">
                          <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            autoFocus
                            placeholder="اكتب اسم أو رقم هاتف المورد..."
                            value={supplierSearchQuery}
                            onChange={(e) => setSupplierSearchQuery(e.target.value)}
                            className="pe-9 h-9 text-xs rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1 overscroll-contain">
                          {filteredSuppliers.length === 0 ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              {suppliers.length === 0 ? (
                                <>
                                  <p>لا يوجد أي مورد مسجل حالياً.</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSupplierSearchOpen(false);
                                      setIsQuickSupplierOpen(true);
                                    }}
                                    className="block mx-auto mt-2 text-primary font-semibold hover:underline"
                                  >
                                    + إضافة مورد جديد الآن
                                  </button>
                                </>
                              ) : (
                                <>
                                  <p>لا يوجد مورد مطابق للبحث.</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSupplierSearchOpen(false);
                                      setQuickSupplierName(supplierSearchQuery);
                                      setIsQuickSupplierOpen(true);
                                    }}
                                    className="block mx-auto mt-2 text-primary font-semibold hover:underline"
                                  >
                                    + إضافة &quot;{supplierSearchQuery}&quot; كمورد جديد
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            filteredSuppliers.map((s) => {
                              const isSelected = s.id === formData.supplierId;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      supplierId: s.id,
                                      purchaseInvoiceId: "",
                                    }));
                                    setSupplierSearchOpen(false);
                                    setSupplierSearchQuery("");
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-start ${
                                    isSelected
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                                    <span className="truncate">{s.name}</span>
                                    {s.phone && (
                                      <span className="text-[11px] text-muted-foreground font-mono">
                                        ({s.phone})
                                      </span>
                                    )}
                                  </div>
                                  {s.currentBalance !== undefined && (
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 ${
                                        Number(s.currentBalance) > 0
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      رصيد: {formatCurrency(s.currentBalance)}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Supplier Balance Info Banner */}
                    {selectedSupplier && (
                      <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="size-3.5" />
                          الرصيد المستحق للمورد في الحسابات:
                        </span>
                        <strong className="font-mono font-bold text-sm">
                          {formatCurrency(supplierBalance)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary" />
                      تاريخ الصرف والسداد *
                    </Label>
                    <Input
                      type="date"
                      required
                      className="h-11 rounded-xl font-mono"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Optional Invoice Allocation Dropdown */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="size-3.5 text-primary" />
                    تخصيص السداد مقابل فاتورة معينة (اختياري):
                  </Label>
                  <Select
                    value={formData.purchaseInvoiceId || "GENERAL"}
                    onValueChange={(val) => {
                      if (val === "GENERAL") {
                        setFormData((prev) => ({ ...prev, purchaseInvoiceId: "" }));
                      } else {
                        const inv = supplierInvoices.find((i) => i.id === val);
                        setFormData((prev) => ({
                          ...prev,
                          purchaseInvoiceId: val,
                          amount: inv ? String(inv.remainingAmount) : prev.amount,
                        }));
                      }
                    }}
                    disabled={!formData.supplierId}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs">
                      <SelectValue placeholder="اختر الفاتورة..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">
                        سداد عام على الحساب (غير مخصص لفاتورة محددة)
                      </SelectItem>
                      {supplierInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-mono font-semibold">{inv.invoiceNumber}</span>
                            <span className="text-xs text-amber-600 font-mono">
                              متبقي: {formatCurrency(inv.remainingAmount)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedInvoice && (
                    <div className="flex justify-between items-center text-xs bg-muted/60 p-2 rounded-xl text-muted-foreground font-mono">
                      <span>إجمالي الفاتورة: {formatCurrency(selectedInvoice.totalAmount)}</span>
                      <span>سُدد سابقاً: {formatCurrency(selectedInvoice.paidAmount)}</span>
                      <strong className="text-primary">
                        المتبقي: {formatCurrency(selectedInvoice.remainingAmount)}
                      </strong>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Details & Method Card */}
            <Card className="border border-border/70 shadow-2xs bg-card" size="sm">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="size-4 text-primary" />
                  المبلغ وطريقة الصرف
                </h3>

                {/* Amount Input and Quick Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">قيمة المبلغ المنصرف (ج.م) *</Label>
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="h-12 text-xl font-bold font-mono text-primary rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  {/* Quick Amount Helper Buttons */}
                  {selectedSupplier && supplierBalance > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, amount: String(supplierBalance) }))
                        }
                        className="text-xs rounded-lg h-7 font-mono"
                      >
                        سداد الرصيد كاملاً ({formatCurrency(supplierBalance)})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            amount: String(Math.round(supplierBalance / 2)),
                          }))
                        }
                        className="text-xs rounded-lg h-7 font-mono"
                      >
                        سداد 50% ({formatCurrency(Math.round(supplierBalance / 2))})
                      </Button>
                      {selectedInvoice && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              amount: String(selectedInvoice.remainingAmount),
                            }))
                          }
                          className="text-xs rounded-lg h-7 font-mono text-primary"
                        >
                          متبقي الفاتورة ({formatCurrency(selectedInvoice.remainingAmount)})
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Method Selector Grid */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold text-muted-foreground">طريقة الدفع:</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = formData.paymentMethod === method.value;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, paymentMethod: method.value }))
                          }
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-start ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-xs font-bold"
                              : "border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional fields based on Payment Method */}
                {(formData.paymentMethod === "BANK_TRANSFER" ||
                  formData.paymentMethod === "INSTAPAY") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 animate-in fade-in-0 duration-150">
                    <div className="space-y-1">
                      <Label className="text-xs">اسم البنك / جهة التحويل</Label>
                      <Input
                        placeholder="مثال: البنك الأهلي المصري / CIB"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">رقم الحوالة / المرجع الإلكتروني</Label>
                      <Input
                        placeholder="مثال: TRX-8921820"
                        value={formData.referenceNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                        }
                        className="h-9 text-xs rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}

                {formData.paymentMethod === "CHECK" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 animate-in fade-in-0 duration-150">
                    <div className="space-y-1">
                      <Label className="text-xs">رقم الشيك *</Label>
                      <Input
                        required
                        placeholder="0001234"
                        value={formData.checkNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkNumber: e.target.value }))
                        }
                        className="h-9 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">تاريخ استحقاق الشيك</Label>
                      <Input
                        type="date"
                        value={formData.checkDate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkDate: e.target.value }))
                        }
                        className="h-9 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">البنك المسحوب عليه</Label>
                      <Input
                        placeholder="اسم البنك"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* General Reference / Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">رقم الإيصال الورقي / المرجع (اختياري)</Label>
                    <Input
                      placeholder="رقم سند القبض لدى المورد أو رقم الإيصال"
                      value={formData.referenceNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ملاحظات السداد</Label>
                    <Input
                      placeholder="أي تفاصيل خاصة بالحساب أو التسليم"
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Financial Receipt (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">
            <Card className="border border-border/70 shadow-2xs bg-card" size="sm">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <Banknote className="size-4 text-primary" />
                    الأثر المالي للسند
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    سند صرف
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رصيد المورد الحالي:</span>
                    <span className="font-semibold font-mono">{formatCurrency(supplierBalance)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>قيمة الدفعة الحالية:</span>
                    <span className="font-bold font-mono">
                      -{formatCurrency(currentPaymentAmount)}
                    </span>
                  </div>

                  <Separator className="my-2" />

                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-bold text-sm">الرصيد بعد السداد:</span>
                    <div className="text-end">
                      <span
                        className={`text-2xl font-black font-mono tabular-nums ${
                          balanceAfterPayment < 0
                            ? "text-blue-600 dark:text-blue-400"
                            : balanceAfterPayment === 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-primary"
                        }`}
                      >
                        {formatCurrency(balanceAfterPayment)}
                      </span>
                      {balanceAfterPayment < 0 && (
                        <div className="text-[10px] text-blue-500 font-medium mt-0.5">
                          رصيد دائن لصالحنا (دفعة مقدمة)
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedInvoice && (
                    <div className="text-xs bg-muted/40 p-2.5 rounded-xl space-y-1 pt-2 border border-border/40">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">متبقي الفاتورة الآن:</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(selectedInvoice.remainingAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-primary font-bold">
                        <span>متبقي الفاتورة بعد السند:</span>
                        <span className="font-mono">
                          {formatCurrency(
                            Math.max(
                              0,
                              selectedInvoice.remainingAmount - currentPaymentAmount,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary CTA Button */}
                <div className="pt-2 space-y-2 hidden md:block">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-12 text-base rounded-xl font-bold active:scale-[0.98] transition-transform duration-100 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Save className="size-4 me-1.5" />
                    )}
                    تأكيد وصرف السند
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/procurement/supplier-payments")}
                    className="w-full rounded-xl text-xs"
                  >
                    إلغاء والعودة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Action Bar for Mobile (< 768px) */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 p-3 flex items-center justify-between shadow-2xl md:hidden">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">المبلغ المنصرف:</span>
            <span className="text-lg font-black font-mono text-emerald-600">
              {formatCurrency(currentPaymentAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/procurement/supplier-payments")}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl px-5 font-bold shadow-md text-white bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="size-4 me-1" />}
              صرف السند
            </Button>
          </div>
        </div>
      </form>

      {/* Quick Supplier Dialog */}
      <Dialog open={isQuickSupplierOpen} onOpenChange={setIsQuickSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              إضافة مورد جديد سريعاً
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateQuickSupplier} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">اسم الشركة أو المورد *</Label>
              <Input
                required
                placeholder="مثال: شركة إيفوكلار للأسنان"
                value={quickSupplierName}
                onChange={(e) => setQuickSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">رقم الهاتف / الموبايل</Label>
              <Input
                placeholder="010xxxxxxxx"
                value={quickSupplierPhone}
                onChange={(e) => setQuickSupplierPhone(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickSupplierOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submittingQuickSupplier}>
                {submittingQuickSupplier ? <LoadingSpinner size="sm" /> : "إضافة وحفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPaymentForm;
