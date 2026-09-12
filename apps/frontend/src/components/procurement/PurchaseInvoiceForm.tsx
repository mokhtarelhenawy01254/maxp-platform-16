import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
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
  unitPrice: number;
  taxRate: number;
  discountRate: number;
  totalPrice: number;
  notes?: string;
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

  // Quick Supplier Modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [quickSupplierPhone, setQuickSupplierPhone] = useState("");
  const [quickSupplierContact, setQuickSupplierContact] = useState("");
  const [submittingQuickSupplier, setSubmittingQuickSupplier] = useState(false);

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

  // Load purchase orders for selected supplier
  useEffect(() => {
    if (!formData.supplierId) {
      setSupplierOrders([]);
      return;
    }
    fetchSupplierPurchaseOrders(formData.supplierId);
  }, [formData.supplierId]);

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

      // Add Dental Materials
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

      // Add Store Products
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

    const grandTotal =
      subtotal -
      itemDiscounts +
      totalTax +
      Number(formData.shippingCost) -
      Number(formData.discountAmount);

    return { subtotal, totalTax, itemDiscounts, grandTotal };
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
          t("procurement.purchaseInvoiceForm.createSuccess", "تم إنشاء فاتورة المشتريات بنجاح"),
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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
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
              تسجيل فاتورة توريد وتحديث رصيد المورد وحسابات المشتريات تلقائياً
            </p>
          </div>
        </div>
        {isEdit && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="size-4" />
            {t("procurement.purchaseInvoiceForm.print", "طباعة")}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier & Header Metadata */}
        <Card className={`${glassClass} border-border/70 shadow-sm`} size="sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Supplier Select */}
              <div className="space-y-1.5 md:col-span-1">
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
                <Select
                  value={formData.supplierId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, supplierId: val }))}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue
                      placeholder={t(
                        "procurement.purchaseInvoiceForm.supplierPlaceholder",
                        "اختر المورد",
                      )}
                    >
                      {selectedSupplier ? (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-foreground">
                            {selectedSupplier.name}
                          </span>
                          {selectedSupplier.phone && (
                            <span className="text-xs text-muted-foreground">
                              ({selectedSupplier.phone})
                            </span>
                          )}
                        </div>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center justify-between gap-4 w-full text-start">
                          <span className="font-medium text-foreground">{s.name}</span>
                          {s.phone && (
                            <span className="text-xs text-muted-foreground">{s.phone}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedSupplier && selectedSupplier.currentBalance !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>
                      الرصيد الحالي للمورد:{" "}
                      <strong className="font-bold">
                        {Number(selectedSupplier.currentBalance).toFixed(2)} ج.م
                      </strong>
                    </span>
                  </div>
                )}
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
                          <span className="text-xs text-muted-foreground">
                            {Number(order.totalAmount).toFixed(2)} ج.م
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Invoice Reference / Paper Invoice # */}
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

              {/* Invoice Date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {t("procurement.purchaseInvoiceForm.invoiceDateLabel", "تاريخ الفاتورة")}
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl"
                  value={formData.invoiceDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
                  }
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {t("procurement.purchaseInvoiceForm.dueDateLabel", "تاريخ الاستحقاق")}
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items Section */}
        <Card className={`${glassClass} border-border/70 shadow-sm`} size="sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold gradient-text flex items-center gap-2">
                <PackageCheck className="size-5 text-primary" />
                {t("procurement.purchaseInvoiceForm.itemsSection", "بنود وأصناف الفاتورة")}
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-mono">
                {items.length} {items.length === 1 ? "بند" : "بنود"}
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-visible">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px] font-bold">
                      {t("procurement.purchaseInvoiceForm.columnItem", "الصنف / البيان")}
                    </TableHead>
                    <TableHead className="w-[110px] text-center font-bold">
                      {t("procurement.purchaseInvoiceForm.columnQuantity", "الكمية")}
                    </TableHead>
                    <TableHead className="w-[130px] text-center font-bold">
                      {t("procurement.purchaseInvoiceForm.columnUnitPrice", "سعر الوحدة")}
                    </TableHead>
                    <TableHead className="w-[100px] text-center font-bold">
                      {t("procurement.purchaseInvoiceForm.columnTax", "الضريبة %")}
                    </TableHead>
                    <TableHead className="w-[100px] text-center font-bold">
                      {t("procurement.purchaseInvoiceForm.columnDiscount", "الخصم %")}
                    </TableHead>
                    <TableHead className="w-[130px] text-right font-bold">
                      {t("procurement.purchaseInvoiceForm.columnTotal", "الإجمالي")}
                    </TableHead>
                    <TableHead className="w-[50px] text-center"></TableHead>
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
                      <TableRow key={index} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="relative overflow-visible">
                          <div className="space-y-1 relative">
                            <Input
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
                              className="h-10 rounded-lg"
                            />

                            {/* Autocomplete Dropdown */}
                            {activeSearchRowIndex === index &&
                              item.productName &&
                              filteredCatalog.length > 0 && (
                                <div
                                  className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-xl p-1 text-popover-foreground"
                                  onMouseLeave={() => setActiveSearchRowIndex(null)}
                                >
                                  {filteredCatalog.slice(0, 10).map((catItem) => (
                                    <button
                                      key={catItem.id}
                                      type="button"
                                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-muted text-start transition-colors"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        updateItemDetails(index, {
                                          productId: catItem.id,
                                          productName: catItem.name,
                                          unitPrice: catItem.cost || 0,
                                          description: catItem.category
                                            ? `${catItem.category}${catItem.unit ? ` - ${catItem.unit}` : ""}`
                                            : "",
                                        });
                                        setActiveSearchRowIndex(null);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="font-medium truncate">{catItem.name}</span>
                                        {catItem.sku && (
                                          <span className="text-xs text-muted-foreground">
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
                                          <span className="text-xs font-semibold">
                                            {catItem.cost} ج.م
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="h-10 text-center rounded-lg"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                            className="h-10 text-center rounded-lg"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.taxRate}
                            onChange={(e) => updateItem(index, "taxRate", e.target.value)}
                            className="h-10 text-center rounded-lg"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discountRate}
                            onChange={(e) => updateItem(index, "discountRate", e.target.value)}
                            className="h-10 text-center rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm text-foreground">
                          {item.totalPrice.toFixed(2)} ج.م
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
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
                    (c.sku && c.sku.toLowerCase().includes((item.productName || "").toLowerCase())),
                );

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-3 relative"
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
                        <Trash2 className="size-3.5 mr-1" /> حذف
                      </Button>
                    </div>

                    <div className="space-y-1 relative">
                      <Label className="text-xs font-medium">اسم الصنف أو الخامة</Label>
                      <Input
                        placeholder="ابحث أو اكتب اسم الصنف..."
                        value={item.productName}
                        onFocus={() => setActiveSearchRowIndex(index)}
                        onChange={(e) => {
                          updateItem(index, "productName", e.target.value);
                          setActiveSearchRowIndex(index);
                        }}
                        className="h-10 rounded-lg"
                      />
                      {activeSearchRowIndex === index &&
                        item.productName &&
                        filteredCatalog.length > 0 && (
                          <div
                            className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-xl p-1 text-popover-foreground"
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
                                    productId: catItem.id,
                                    productName: catItem.name,
                                    unitPrice: catItem.cost || 0,
                                  });
                                  setActiveSearchRowIndex(null);
                                }}
                              >
                                <span className="font-medium truncate">{catItem.name}</span>
                                <span className="text-primary font-mono">{catItem.cost} ج.م</span>
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
                          className="h-9"
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
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">ضريبة %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, "taxRate", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">خصم %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.discountRate}
                          onChange={(e) => updateItem(index, "discountRate", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium">
                        إجمالي هذا البند:
                      </span>
                      <span className="text-sm font-bold font-mono text-primary">
                        {item.totalPrice.toFixed(2)} ج.م
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
              className="w-full sm:w-auto mt-2 rounded-xl gap-2 micro-bounce"
            >
              <Plus className="size-4" /> {t("procurement.purchaseInvoiceForm.addItem", "إضافة بند جديد")}
            </Button>
          </CardContent>
        </Card>

        {/* Footer: Notes and Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Notes & Payment Terms */}
          <div className="md:col-span-2">
            <Card className={`${glassClass} border-border/70 shadow-sm`} size="sm">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <Label className="text-sm font-semibold">
                  {t("procurement.purchaseInvoiceForm.notesLabel", "ملاحظات الفاتورة")}
                </Label>
                <Textarea
                  rows={4}
                  placeholder="سجل أي ملاحظات خاصة بالفاتورة، شروط السداد، أو تفاصيل الاستلام..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl"
                />
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary Card */}
          <div>
            <Card className={`${glassClass} border-border/70 shadow-md`} size="sm">
              <CardContent className="p-4 sm:p-6 space-y-3.5">
                <h3 className="text-base font-bold gradient-text">
                  {t("procurement.purchaseInvoiceForm.summaryTitle", "ملخص المبالغ")}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("procurement.purchaseInvoiceForm.subtotalLabel", "المجموع قبل الخصم:")}
                    </span>
                    <span className="font-semibold font-mono">{totals.subtotal.toFixed(2)} ج.م</span>
                  </div>

                  {totals.itemDiscounts > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>
                        {t("procurement.purchaseInvoiceForm.itemDiscountsLabel", "خصم البنود:")}
                      </span>
                      <span className="font-semibold font-mono">
                        -{totals.itemDiscounts.toFixed(2)} ج.م
                      </span>
                    </div>
                  )}

                  {totals.totalTax > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t("procurement.purchaseInvoiceForm.totalTaxLabel", "الضرائب:")}</span>
                      <span className="font-semibold font-mono">
                        +{totals.totalTax.toFixed(2)} ج.م
                      </span>
                    </div>
                  )}

                  <Separator className="my-1.5" />

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t("procurement.purchaseInvoiceForm.shippingLabel", "مصاريف الشحن:")}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="h-8 w-28 text-right font-mono text-xs rounded-lg"
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
                      className="h-8 w-28 text-right font-mono text-xs rounded-lg"
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
                      {totals.grandTotal.toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/procurement/purchase-invoices")}
            className="rounded-xl px-5 micro-bounce"
          >
            {t("procurement.purchaseInvoiceForm.cancel", "إلغاء")}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="rounded-xl px-8 font-semibold micro-bounce shadow-md"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            }}
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="size-4 mr-1.5" />
            )}
            {isEdit
              ? t("procurement.purchaseInvoiceForm.updateBtn", "تحديث الفاتورة")
              : t("procurement.purchaseInvoiceForm.createBtn", "تأكيد وحفظ الفاتورة")}
          </Button>
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
            <div className="space-y-1.5">
              <Label className="text-sm">اسم مسؤول المبيعات (اختياري)</Label>
              <Input
                placeholder="اسم الشخص المسؤول"
                value={quickSupplierContact}
                onChange={(e) => setQuickSupplierContact(e.target.value)}
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

export default PurchaseInvoiceForm;
