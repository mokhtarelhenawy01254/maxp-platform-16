import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trash2,
  Plus,
  ArrowLeft,
  Save,
  Printer,
  UserPlus,
  Receipt,
  PackageCheck,
  AlertCircle,
  Search,
  Check,
  ChevronsUpDown,
  CreditCard,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { formatCurrency } from "../../utils/currency";
import { useTheme } from "../../hooks/useTheme";
import { toast } from "sonner";
import "../../styles/dashboard-enhanced.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface CatalogItem {
  id: string;
  name: string;
  sku?: string;
  type: "product" | "dental_material";
  cost: number;
  category?: string;
  unit?: string;
}

interface PurchaseOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items?: any[];
}

interface InvoiceItem {
  id?: string;
  productId: string | null;
  productName: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
  totalPrice: number;
  notes?: string;
}

interface TreasuryAccount {
  id: string;
  name: string;
  balance: number;
}

const PurchaseInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const glassClass = isDark ? "glass-effect-dark" : "glass-effect";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<PurchaseOrderSummary[]>([]);
  const [activeSearchRowIndex, setActiveSearchRowIndex] = useState<number | null>(null);

  // Supplier Search Combobox State
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Advanced columns toggle (Tax % & Discount % per line)
  const [showAdvancedItemColumns, setShowAdvancedItemColumns] = useState(false);

  // Immediate Payment State
  const [paymentOption, setPaymentOption] = useState<"UNPAID" | "FULL" | "PARTIAL">("UNPAID");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [treasuryAccountId, setTreasuryAccountId] = useState<string>("");

  // Quick Supplier Modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [quickSupplierPhone, setQuickSupplierPhone] = useState("");
  const [quickSupplierContact, setQuickSupplierContact] = useState("");
  const [submittingQuickSupplier, setSubmittingQuickSupplier] = useState(false);

  // Refs for keyboard navigation
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [formData, setFormData] = useState({
    supplierId: "",
    purchaseOrderId: "",
    referenceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0] ?? "",
    dueDate: "",
    notes: "",
    shippingCost: 0,
    discountAmount: 0,
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      productId: null,
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
      discountRate: 0,
      totalPrice: 0,
    },
  ]);

  useEffect(() => {
    fetchInitialData();
    if (isEdit) {
      fetchInvoice();
    }
  }, [id]);

  // Click outside to close supplier combobox
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

  // Load purchase orders for selected supplier
  useEffect(() => {
    if (!formData.supplierId) {
      setSupplierOrders([]);
      return;
    }
    fetchSupplierPurchaseOrders(formData.supplierId);
  }, [formData.supplierId]);

  const fetchTreasuries = async () => {
    try {
      const res = await apiClient.get("/treasury/accounts");
      const data = res?.data as any;
      const list: TreasuryAccount[] = Array.isArray(data?.accounts)
        ? data.accounts
        : Array.isArray(data)
        ? data
        : [];
      setTreasuryAccounts(list);
      if (list.length > 0) {
        const firstId = list[0]?.id;
        if (firstId) {
          setTreasuryAccountId((prev) => prev || firstId);
        }
      }
    } catch (err) {
      console.warn("Could not load treasury accounts:", err);
    }
  };

  // Load treasury accounts when payment option is active
  useEffect(() => {
    if (paymentOption !== "UNPAID") {
      fetchTreasuries();
    }
  }, [paymentOption]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, productsRes, materialsRes] = await Promise.all([
        apiClient.get("/procurement/suppliers", { params: { limit: 200 } }).catch(() => ({ data: { suppliers: [] } })),
        apiClient.get("/products", { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        apiClient.get("/dental-lab/materials").catch(() => ({ data: { data: [] } })),
      ]);

      const loadedSuppliers: Supplier[] =
        suppliersRes?.data?.suppliers || suppliersRes?.data?.data || [];
      setSuppliers(loadedSuppliers);

      const itemsList: CatalogItem[] = [];

      // Dental Materials
      const materials = materialsRes?.data?.data || [];
      if (Array.isArray(materials)) {
        materials.forEach((m: any) => {
          itemsList.push({
            id: m.id,
            name: m.name,
            sku: m.code,
            type: "dental_material",
            cost: Number(m.costPerUnit || 0),
            category: m.category,
            unit: m.unit,
          });
        });
      }

      // Store Products
      const prods = productsRes?.data?.data || productsRes?.data?.products || [];
      if (Array.isArray(prods)) {
        prods.forEach((p: any) => {
          itemsList.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            type: "product",
            cost: Number(p.cost || p.price || 0),
          });
        });
      }

      setCatalogItems(itemsList);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error(t("procurement.purchaseInvoiceForm.fetchError", "فشل في تحميل البيانات الأولية"));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierPurchaseOrders = async (supplierId: string) => {
    try {
      const res = await apiClient.get("/procurement/purchase-orders", {
        params: { supplierId, limit: 50 },
      });
      const orders = res?.data?.orders || [];
      setSupplierOrders(orders);
    } catch (err) {
      console.warn("Could not load supplier purchase orders:", err);
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/procurement/purchase-invoices/${id}`);
      const invoice = response.data?.invoice || response.data;

      setFormData({
        supplierId: invoice.supplierId || "",
        purchaseOrderId: invoice.purchaseOrderId || "",
        referenceNumber: invoice.notes?.match(/مرجع: (.*)/)?.[1] || "",
        invoiceDate: invoice.invoiceDate
          ? (new Date(invoice.invoiceDate).toISOString().split("T")[0] ?? "")
          : "",
        dueDate: invoice.dueDate
          ? (new Date(invoice.dueDate).toISOString().split("T")[0] ?? "")
          : "",
        notes: invoice.notes || "",
        shippingCost: Number(invoice.shippingCost || 0),
        discountAmount: Number(invoice.discountAmount || 0),
      });

      if (invoice.paidAmount > 0) {
        if (invoice.remainingAmount <= 0) {
          setPaymentOption("FULL");
        } else {
          setPaymentOption("PARTIAL");
          setCustomPaidAmount(Number(invoice.paidAmount));
        }
      }

      if (Array.isArray(invoice.items) && invoice.items.length > 0) {
        setItems(
          invoice.items.map((item: any) => ({
            id: item.id,
            productId: item.productId ?? null,
            productName: item.productName || "",
            description: item.description || "",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            taxRate: Number(item.taxRate || 0),
            discountRate: Number(item.discountRate || 0),
            totalPrice: Number(item.totalPrice || 0),
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error(t("procurement.purchaseInvoiceForm.fetchInvoiceError", "فشل في تحميل بيانات الفاتورة"));
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === formData.supplierId);
  }, [suppliers, formData.supplierId]);

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

  const handleSelectPurchaseOrder = async (poId: string) => {
    setFormData((prev) => ({ ...prev, purchaseOrderId: poId }));
    if (!poId) return;

    try {
      const res = await apiClient.get(`/procurement/purchase-orders/${poId}`);
      const po = res.data?.order || res.data;
      if (po?.items && po.items.length > 0) {
        setItems(
          po.items.map((item: any) => {
            const quantity = Number(item.quantity || 1);
            const unitPrice = Number(item.unitPrice || 0);
            const taxRate = Number(item.taxRate || 0);
            const discountRate = Number(item.discountRate || 0);
            const subtotal = quantity * unitPrice;
            const discount = subtotal * (discountRate / 100);
            const tax = (subtotal - discount) * (taxRate / 100);
            const totalPrice = subtotal - discount + tax;

            return {
              productId: item.productId || null,
              productName: item.productName || "",
              description: item.description || "",
              quantity,
              unitPrice,
              taxRate,
              discountRate,
              totalPrice,
            };
          }),
        );
        toast.success(`تم استيراد ${po.items.length} أصناف من أمر الشراء ${po.orderNumber}`);
      }
    } catch (err) {
      console.error("Error importing items from PO:", err);
      toast.error("تعذر استيراد بنود أمر الشراء");
    }
  };

  const updateItemDetails = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      const currentItem = newItems[index];
      if (!currentItem) return prevItems;
      const item: InvoiceItem = { ...currentItem, ...updates };

      const quantity =
        parseFloat("quantity" in updates ? (updates.quantity as any) : item.quantity) || 0;
      const unitPrice =
        parseFloat("unitPrice" in updates ? (updates.unitPrice as any) : item.unitPrice) || 0;
      const taxRate =
        parseFloat("taxRate" in updates ? (updates.taxRate as any) : item.taxRate) || 0;
      const discountRate =
        parseFloat("discountRate" in updates ? (updates.discountRate as any) : item.discountRate) ||
        0;

      const subtotal = quantity * unitPrice;
      const discount = subtotal * (discountRate / 100);
      const tax = (subtotal - discount) * (taxRate / 100);

      item.totalPrice = subtotal - discount + tax;
      newItems[index] = item;
      return newItems;
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    updateItemDetails(index, { [field]: value });
  };

  // Keyboard rapid-entry: hitting Enter on price adds a new line and focuses its name field
  const handlePriceKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
      setTimeout(() => {
        itemInputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: null,
        productName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        discountRate: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([
        {
          productId: null,
          productName: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 0,
          discountRate: 0,
          totalPrice: 0,
        },
      ]);
    } else {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalTax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * (item.discountRate / 100);
      return sum + (itemSubtotal - itemDiscount) * (item.taxRate / 100);
    }, 0);
    const itemDiscounts = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (item.discountRate / 100),
      0,
    );

    const grandTotal = Math.max(
      0,
      subtotal -
        itemDiscounts +
        totalTax +
        Number(formData.shippingCost) -
        Number(formData.discountAmount),
    );

    const effectivePaid =
      paymentOption === "FULL"
        ? grandTotal
        : paymentOption === "PARTIAL"
          ? Math.min(customPaidAmount, grandTotal)
          : 0;

    const remainingAmount = Math.max(0, grandTotal - effectivePaid);

    return { subtotal, totalTax, itemDiscounts, grandTotal, effectivePaid, remainingAmount };
  };

  const handleCreateQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;

    try {
      setSubmittingQuickSupplier(true);
      const res = await apiClient.post("/procurement/suppliers", {
        name: quickSupplierName.trim(),
        phone: quickSupplierPhone.trim() || undefined,
        contactPerson: quickSupplierContact.trim() || undefined,
      });

      const newSupplier = res.data?.supplier || res.data?.data || res.data;
      if (newSupplier?.id) {
        setSuppliers((prev) => [newSupplier, ...prev]);
        setFormData((prev) => ({ ...prev, supplierId: newSupplier.id }));
        toast.success("تمت إضافة المورد بنجاح");
        setIsQuickSupplierOpen(false);
        setQuickSupplierName("");
        setQuickSupplierPhone("");
        setQuickSupplierContact("");
      }
    } catch (err: any) {
      console.error("Error creating supplier:", err);
      toast.error(err.response?.data?.message || "تعذر إضافة المورد الجديد");
    } finally {
      setSubmittingQuickSupplier(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error(t("procurement.purchaseInvoiceForm.supplierRequired", "يرجى اختيار المورد"));
      return;
    }

    const invalidItems = items.filter(
      (item) => !item.productName.trim() || item.quantity <= 0 || item.unitPrice < 0,
    );
    if (invalidItems.length > 0) {
      toast.error(
        t(
          "procurement.purchaseInvoiceForm.itemsValidation",
          "يرجى التأكد من كتابة اسم الصنف وإدخال كمية وسعر صحيحين لكل البنود",
        ),
      );
      return;
    }

    const totals = calculateTotals();

    try {
      setSaving(true);
      const combinedNotes = [
        formData.referenceNumber ? `مرجع: ${formData.referenceNumber}` : "",
        formData.notes,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        supplierId: formData.supplierId,
        purchaseOrderId: formData.purchaseOrderId || undefined,
        invoiceDate: formData.invoiceDate || new Date().toISOString().split("T")[0],
        dueDate: formData.dueDate || undefined,
        shippingCost: Number(formData.shippingCost || 0),
        discountAmount: Number(formData.discountAmount || 0),
        paidAmount: totals.effectivePaid,
        paymentMethod: totals.effectivePaid > 0 ? paymentMethod : undefined,
        treasuryAccountId: totals.effectivePaid > 0 ? treasuryAccountId || undefined : undefined,
        notes: combinedNotes,
        items: items.map((it) => ({
          productId: it.productId || null,
          productName: it.productName.trim(),
          description: it.description || "",
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxRate: Number(it.taxRate || 0),
          discountRate: Number(it.discountRate || 0),
          totalPrice: Number(it.totalPrice),
          notes: it.notes || "",
        })),
      };

      if (isEdit) {
        await apiClient.put(`/procurement/purchase-invoices/${id}`, payload);
        toast.success(
          t("procurement.purchaseInvoiceForm.updateSuccess", "تم تحديث الفاتورة بنجاح"),
        );
      } else {
        await apiClient.post("/procurement/purchase-invoices", payload);
        toast.success(
          totals.effectivePaid >= totals.grandTotal
            ? "تم إنشاء الفاتورة وسدادها بالكامل بنجاح"
            : "تم إنشاء فاتورة المشتريات بنجاح",
        );
      }
      navigate("/procurement/purchase-invoices");
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error(
        error.response?.data?.message ||
          t("procurement.purchaseInvoiceForm.saveError", "حدث خطأ أثناء حفظ الفاتورة"),
      );
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">جاري تحميل بيانات الفاتورة والموردين...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5 pb-24 md:pb-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/procurement/purchase-invoices")}
            className="rounded-full micro-bounce"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black gradient-text flex items-center gap-2">
              <Receipt className="size-6 text-primary" />
              {isEdit
                ? t("procurement.purchaseInvoiceForm.editTitle", "تعديل فاتورة مشتريات")
                : t("procurement.purchaseInvoiceForm.createTitle", "إنشاء فاتورة مشتريات جديدة")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              تسجيل سريع لفاتورة التوريد مع إمكانية السداد الفوري وتحديث الحسابات آلياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEdit && (
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="size-4" />
              {t("procurement.purchaseInvoiceForm.print", "طباعة")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedItemColumns((prev) => !prev)}
            className="text-xs gap-1.5 rounded-lg h-9"
          >
            <SlidersHorizontal className="size-3.5" />
            {showAdvancedItemColumns ? "إخفاء الضرائب والخصومات الفرعية" : "إظهار الضريبة والخصم لكل بند"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Split Layout: 8 cols Form / 4 cols Sticky Receipt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Supplier & Header Metadata */}
            <Card className={`${glassClass} border-border/70 shadow-sm relative z-30 overflow-visible`} size="sm">
              <CardContent className="p-4 sm:p-5 space-y-4 overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Searchable Combobox for Supplier */}
                  <div className="space-y-1.5 relative" ref={supplierDropdownRef}>
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">
                        {t("procurement.purchaseInvoiceForm.supplierLabel", "المورد *")}
                      </Label>
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
                            {t(
                              "procurement.purchaseInvoiceForm.supplierPlaceholder",
                              "ابحث عن مورد بالاسم أو الهاتف...",
                            )}
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
                                    setFormData((prev) => ({ ...prev, supplierId: s.id }));
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
                    {selectedSupplier && selectedSupplier.currentBalance !== undefined && (
                      <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="size-3.5" />
                          الرصيد الحالي للمورد في الحسابات:
                        </span>
                        <strong className="font-mono font-bold text-sm">
                          {formatCurrency(selectedSupplier.currentBalance)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Supplier Paper Invoice Reference */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      {t(
                        "procurement.purchaseInvoiceForm.invoiceNumberLabel",
                        "رقم مرجع الفاتورة / الفاتورة الورقية",
                      )}
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder={t(
                        "procurement.purchaseInvoiceForm.invoiceNumberPlaceholder",
                        "مثال: INV-2024-001 (اختياري)",
                      )}
                      value={formData.referenceNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                      }
                    />
                  </div>

                  {/* Linked Purchase Order (Optional) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      {t(
                        "procurement.purchaseInvoiceForm.purchaseOrderLabel",
                        "أمر الشراء المرتبط (اختياري)",
                      )}
                    </Label>
                    <Select
                      value={formData.purchaseOrderId}
                      onValueChange={handleSelectPurchaseOrder}
                      disabled={!formData.supplierId || supplierOrders.length === 0}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue
                          placeholder={
                            !formData.supplierId
                              ? "اختر المورد أولاً"
                              : supplierOrders.length === 0
                                ? "لا توجد أوامر شراء مفتوحة"
                                : t(
                                    "procurement.purchaseInvoiceForm.purchaseOrderPlaceholder",
                                    "اختر أمر شراء للاستيراد التلقائي",
                                  )
                          }
                        >
                          {supplierOrders.find((o) => o.id === formData.purchaseOrderId)?.orderNumber}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {supplierOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span className="font-medium">{order.orderNumber}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatCurrency(order.totalAmount)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice & Due Dates */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {t("procurement.purchaseInvoiceForm.invoiceDateLabel", "تاريخ الفاتورة")}
                      </Label>
                      <Input
                        type="date"
                        className="h-11 rounded-xl text-xs"
                        value={formData.invoiceDate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {t("procurement.purchaseInvoiceForm.dueDateLabel", "تاريخ الاستحقاق")}
                      </Label>
                      <Input
                        type="date"
                        className="h-11 rounded-xl text-xs"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items Table */}
            <Card className={`${glassClass} border-border/70 shadow-sm relative z-20 overflow-visible`} size="sm">
              <CardContent className="p-4 sm:p-5 space-y-3.5 overflow-visible">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="size-5 text-primary" />
                    <h2 className="text-base font-bold gradient-text">
                      {t("procurement.purchaseInvoiceForm.itemsSection", "بنود الفاتورة")}
                    </h2>
                    <span className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">
                      {items.length} {items.length === 1 ? "صنف" : "أصناف"}
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    💡 اضغط <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd> في خانة السعر لإضافة سطر جديد فوراً
                  </span>
                </div>

                {/* Desktop Grid */}
                <div className="hidden md:block overflow-visible">
                  <Table>
                    <TableHeader className="bg-muted/40 rounded-xl">
                      <TableRow className="border-b border-border/60">
                        <TableHead className="min-w-[260px] font-bold text-foreground">
                          {t("procurement.purchaseInvoiceForm.columnItem", "الصنف / الخامة")}
                        </TableHead>
                        <TableHead className="w-[100px] text-center font-bold text-foreground">
                          {t("procurement.purchaseInvoiceForm.columnQuantity", "الكمية")}
                        </TableHead>
                        <TableHead className="w-[125px] text-center font-bold text-foreground">
                          {t("procurement.purchaseInvoiceForm.columnUnitPrice", "سعر الوحدة")}
                        </TableHead>
                        {showAdvancedItemColumns && (
                          <>
                            <TableHead className="w-[90px] text-center font-bold text-foreground">
                              {t("procurement.purchaseInvoiceForm.columnTax", "الضريبة %")}
                            </TableHead>
                            <TableHead className="w-[90px] text-center font-bold text-foreground">
                              {t("procurement.purchaseInvoiceForm.columnDiscount", "الخصم %")}
                            </TableHead>
                          </>
                        )}
                        <TableHead className="w-[125px] text-right font-bold text-foreground">
                          {t("procurement.purchaseInvoiceForm.columnTotal", "الإجمالي")}
                        </TableHead>
                        <TableHead className="w-[44px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const filteredCatalog = catalogItems.filter(
                          (c) =>
                            c.name.toLowerCase().includes((item.productName || "").toLowerCase()) ||
                            (c.sku &&
                              c.sku.toLowerCase().includes((item.productName || "").toLowerCase())),
                        );

                        return (
                          <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="relative overflow-visible py-2">
                              <div className="relative">
                                <Input
                                  ref={(el) => (itemInputRefs.current[index] = el)}
                                  placeholder={t(
                                    "procurement.purchaseInvoiceForm.itemPlaceholder",
                                    "اختر صنفاً أو اكتب اسمه...",
                                  )}
                                  value={item.productName}
                                  onFocus={() => setActiveSearchRowIndex(index)}
                                  onChange={(e) => {
                                    updateItem(index, "productName", e.target.value);
                                    setActiveSearchRowIndex(index);
                                  }}
                                  className="h-10 rounded-xl"
                                />

                                {/* Catalog Autocomplete Dropdown */}
                                {activeSearchRowIndex === index &&
                                  item.productName &&
                                  filteredCatalog.length > 0 && (
                                    <div
                                      className="absolute top-full start-0 min-w-full sm:min-w-[320px] z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl p-1.5 text-popover-foreground overscroll-contain animate-in fade-in-0 zoom-in-95"
                                      onMouseLeave={() => setActiveSearchRowIndex(null)}
                                    >
                                      {filteredCatalog.slice(0, 8).map((catItem) => (
                                        <button
                                          key={catItem.id}
                                          type="button"
                                          className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-muted text-start transition-colors"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            updateItemDetails(index, {
                                              productId: catItem.type === "product" ? catItem.id : null,
                                              productName: catItem.name,
                                              unitPrice: catItem.cost || 0,
                                              unit: catItem.unit,
                                              description: catItem.category
                                                ? `${catItem.category}${catItem.unit ? ` - ${catItem.unit}` : ""}`
                                                : "",
                                            });
                                            setActiveSearchRowIndex(null);
                                          }}
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <span className="font-semibold truncate">{catItem.name}</span>
                                            {catItem.sku && (
                                              <span className="text-[11px] text-muted-foreground font-mono">
                                                ({catItem.sku})
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span
                                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                                catItem.type === "dental_material"
                                                  ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20"
                                                  : "bg-primary/10 text-primary border border-primary/20"
                                              }`}
                                            >
                                              {catItem.type === "dental_material"
                                                ? "خامة أسنان"
                                                : "منتج"}
                                            </span>
                                            {catItem.cost > 0 && (
                                              <span className="text-xs font-mono font-bold">
                                                {formatCurrency(catItem.cost)}
                                              </span>
                                            )}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </TableCell>

                            {/* Quantity */}
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min="1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                className="h-10 text-center font-mono rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </TableCell>

                            {/* Unit Price */}
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                                onKeyDown={(e) => handlePriceKeyDown(e, index)}
                                className="h-10 text-center font-mono rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </TableCell>

                            {/* Optional Advanced Columns */}
                            {showAdvancedItemColumns && (
                              <>
                                <TableCell className="py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={item.taxRate}
                                    onChange={(e) => updateItem(index, "taxRate", e.target.value)}
                                    className="h-10 text-center font-mono rounded-xl"
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={item.discountRate}
                                    onChange={(e) =>
                                      updateItem(index, "discountRate", e.target.value)
                                    }
                                    className="h-10 text-center font-mono rounded-xl"
                                  />
                                </TableCell>
                              </>
                            )}

                            {/* Line Total */}
                            <TableCell className="text-right font-mono font-bold text-sm text-foreground py-2">
                              {formatCurrency(item.totalPrice)}
                            </TableCell>

                            {/* Remove Button */}
                            <TableCell className="text-center py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View: Single-depth cards per item */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {items.map((item, index) => {
                    const filteredCatalog = catalogItems.filter(
                      (c) =>
                        c.name.toLowerCase().includes((item.productName || "").toLowerCase()) ||
                        (c.sku &&
                          c.sku.toLowerCase().includes((item.productName || "").toLowerCase())),
                    );

                    return (
                      <div
                        key={index}
                        className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3 relative shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono bg-muted px-2 py-0.5 rounded-md">
                            بند #{index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:bg-red-500/10 h-7 px-2"
                          >
                            <Trash2 className="size-3.5 me-1" /> حذف
                          </Button>
                        </div>

                        <div className="space-y-1 relative">
                          <Label className="text-xs font-medium">اسم الصنف أو الخامة</Label>
                          <Input
                            ref={(el) => (itemInputRefs.current[index] = el)}
                            placeholder="ابحث أو اكتب اسم الصنف..."
                            value={item.productName}
                            onFocus={() => setActiveSearchRowIndex(index)}
                            onChange={(e) => {
                              updateItem(index, "productName", e.target.value);
                              setActiveSearchRowIndex(index);
                            }}
                            className="h-10 rounded-xl"
                          />
                          {activeSearchRowIndex === index &&
                            item.productName &&
                            filteredCatalog.length > 0 && (
                              <div
                                className="absolute top-full start-0 min-w-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl p-1 text-popover-foreground overscroll-contain animate-in fade-in-0 zoom-in-95"
                                onMouseLeave={() => setActiveSearchRowIndex(null)}
                              >
                                {filteredCatalog.slice(0, 8).map((catItem) => (
                                  <button
                                    key={catItem.id}
                                    type="button"
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-muted text-start"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateItemDetails(index, {
                                        productId: catItem.type === "product" ? catItem.id : null,
                                        productName: catItem.name,
                                        unitPrice: catItem.cost || 0,
                                      });
                                      setActiveSearchRowIndex(null);
                                    }}
                                  >
                                    <span className="font-medium truncate">{catItem.name}</span>
                                    <span className="text-primary font-mono">{formatCurrency(catItem.cost)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">الكمية</Label>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              className="h-9 font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">سعر الوحدة</Label>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                              onKeyDown={(e) => handlePriceKeyDown(e, index)}
                              className="h-9 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground font-medium">
                            إجمالي البند:
                          </span>
                          <span className="text-sm font-bold font-mono text-primary">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full sm:w-auto rounded-xl gap-2 micro-bounce text-sm h-10 font-semibold"
                >
                  <Plus className="size-4" /> {t("procurement.purchaseInvoiceForm.addItem", "إضافة بند جديد")}
                </Button>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className={`${glassClass} border-border/70 shadow-sm`} size="sm">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <Label className="text-sm font-semibold">
                  {t("procurement.purchaseInvoiceForm.notesLabel", "ملاحظات الفاتورة والتسليم")}
                </Label>
                <Textarea
                  rows={3}
                  placeholder="أي تفاصيل خاصة بالاستلام، طريقة الشحن، أو شروط خاصة بالسداد..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sticky Financial Sidebar (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">
            {/* Live Financial Receipt Card */}
            <Card className={`${glassClass} border-border/80 shadow-md`} size="sm">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-base font-bold gradient-text flex items-center gap-1.5">
                    <Receipt className="size-4 text-primary" />
                    {t("procurement.purchaseInvoiceForm.summaryTitle", "ملخص الحسابات")}
                  </h3>
                  <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {items.length} بنود
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("procurement.purchaseInvoiceForm.subtotalLabel", "المجموع قبل الخصم:")}
                    </span>
                    <span className="font-semibold font-mono">{formatCurrency(totals.subtotal)}</span>
                  </div>

                  {totals.itemDiscounts > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>
                        {t("procurement.purchaseInvoiceForm.itemDiscountsLabel", "خصم البنود:")}
                      </span>
                      <span className="font-semibold font-mono">
                        -{formatCurrency(totals.itemDiscounts)}
                      </span>
                    </div>
                  )}

                  {totals.totalTax > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>{t("procurement.purchaseInvoiceForm.totalTaxLabel", "الضرائب:")}</span>
                      <span className="font-semibold font-mono">
                        +{formatCurrency(totals.totalTax)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t("procurement.purchaseInvoiceForm.shippingLabel", "مصاريف الشحن:")}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="h-8 w-28 text-right font-mono text-xs rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={formData.shippingCost}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, shippingCost: Number(e.target.value) }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t("procurement.purchaseInvoiceForm.additionalDiscountLabel", "خصم إضافي:")}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="h-8 w-28 text-right font-mono text-xs rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={formData.discountAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          discountAmount: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <Separator className="my-2" />

                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-bold text-sm">
                      {t("procurement.purchaseInvoiceForm.grandTotalLabel", "صافي الفاتورة:")}
                    </span>
                    <span className="text-2xl font-black font-mono text-primary">
                      {formatCurrency(totals.grandTotal)}
                    </span>
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Immediate Payment Controls */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <CreditCard className="size-3.5 text-primary" />
                      طريقة السداد لهذه الفاتورة:
                    </Label>
                  </div>

                  {/* Payment Options Segmented Radio */}
                  <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("UNPAID")}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                        paymentOption === "UNPAID"
                          ? "bg-background text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      آجل (لاحقاً)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("FULL")}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                        paymentOption === "FULL"
                          ? "bg-emerald-600 text-white shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      سداد فوري
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentOption("PARTIAL");
                        if (!customPaidAmount) setCustomPaidAmount(totals.grandTotal / 2);
                      }}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                        paymentOption === "PARTIAL"
                          ? "bg-amber-600 text-white shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      دفعة مقدمة
                    </button>
                  </div>

                  {/* If Paid or Partial: Show Method and Amount */}
                  {paymentOption !== "UNPAID" && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-accent/40 border border-border/80 animate-in fade-in-0 duration-150">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          طريقة الدفع المسدد بها:
                        </Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-9 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">نقدي (كاش من الخزينة)</SelectItem>
                            <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
                            <SelectItem value="INSTAPAY">إنستاباي / محفظة إلكترونية</SelectItem>
                            <SelectItem value="CHECK">شيك مصرفي</SelectItem>
                            <SelectItem value="OTHER">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {treasuryAccounts.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            الخزينة المسحوب منها *:
                          </Label>
                          <Select
                            value={treasuryAccountId}
                            onValueChange={(val: any) => setTreasuryAccountId(val || "")}
                          >
                            <SelectTrigger className="h-9 rounded-lg text-xs">
                              <SelectValue placeholder="اختر الخزينة" />
                            </SelectTrigger>
                            <SelectContent>
                              {treasuryAccounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name} ({formatCurrency(acc.balance || 0)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {paymentOption === "PARTIAL" && (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            المبلغ المسدد الآن:
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max={totals.grandTotal}
                            step="any"
                            value={customPaidAmount}
                            onChange={(e) => setCustomPaidAmount(Number(e.target.value))}
                            className="h-9 font-mono text-xs rounded-lg"
                          />
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs pt-1 border-t border-border/40 font-mono">
                        <span className="text-muted-foreground">المتبقي على الحساب:</span>
                        <strong className="text-amber-600 font-bold">
                          {formatCurrency(totals.remainingAmount)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary CTA Buttons (Desktop) */}
                <div className="pt-2 space-y-2 hidden md:block">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-12 text-base rounded-xl font-bold micro-bounce shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Save className="size-4 me-1.5" />
                    )}
                    {isEdit
                      ? t("procurement.purchaseInvoiceForm.updateBtn", "تحديث الفاتورة")
                      : t("procurement.purchaseInvoiceForm.createBtn", "تأكيد وحفظ الفاتورة")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/procurement/purchase-invoices")}
                    className="w-full rounded-xl text-xs"
                  >
                    {t("procurement.purchaseInvoiceForm.cancel", "إلغاء والعودة")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Action Bar for Mobile (< 768px) */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 p-3 flex items-center justify-between shadow-2xl md:hidden">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">صافي الفاتورة:</span>
            <span className="text-lg font-black font-mono text-primary">
              {formatCurrency(totals.grandTotal)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/procurement/purchase-invoices")}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl px-5 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="size-4 me-1" />}
              حفظ
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
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">رقم الهاتف / الموبايل</Label>
              <Input
                placeholder="010xxxxxxxx"
                value={quickSupplierPhone}
                onChange={(e) => setQuickSupplierPhone(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">اسم مسؤول المبيعات (اختياري)</Label>
              <Input
                placeholder="اسم الشخص المسؤول"
                value={quickSupplierContact}
                onChange={(e) => setQuickSupplierContact(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickSupplierOpen(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submittingQuickSupplier} className="rounded-xl">
                {submittingQuickSupplier ? <LoadingSpinner size="sm" /> : "إضافة وحفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseInvoiceForm;
