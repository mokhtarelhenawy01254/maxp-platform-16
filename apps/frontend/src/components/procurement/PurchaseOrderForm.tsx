import React, { useState, useEffect } from "react";
import {
  Trash2,
  Plus,
  ArrowLeft,
  Save,
  Printer,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import toast from "react-hot-toast";
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

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
}

interface OrderItem {
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

const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const glassClass = isDark ? "glass-effect-dark" : "glass-effect";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().split("T")[0] ?? "",
    expectedDelivery: "",
    paymentTerms: "",
    notes: "",
    shippingCost: 0,
    discountAmount: 0,
  });

  const [items, setItems] = useState<OrderItem[]>([
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
      fetchOrder();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, productsRes] = await Promise.all([
        apiClient.get("/procurement/suppliers", { params: { limit: 100 } }),
        apiClient.get("/products", { params: { limit: 100 } }),
      ]);
      setSuppliers(suppliersRes.data.suppliers || []);
      setProducts(productsRes.data.data || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("فشل في تحميل البيانات الأولية");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/procurement/purchase-orders/${id}`);
      const order = response.data;

      setFormData({
        supplierId: order.supplierId,
        orderDate: new Date(order.orderDate).toISOString().split("T")[0] ?? "",
        expectedDelivery: order.expectedDelivery
          ? (new Date(order.expectedDelivery).toISOString().split("T")[0] ?? "")
          : "",
        paymentTerms: order.paymentTerms || "",
        notes: order.notes || "",
        shippingCost: Number(order.shippingCost),
        discountAmount: Number(order.discountAmount),
      });

      setItems(
        order.items.map((item: any) => ({
          id: item.id,
          productId: item.productId ?? null,
          productName: item.productName,
          description: item.description || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          discountRate: Number(item.discountRate),
          totalPrice: Number(item.totalPrice),
        })),
      );
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("فشل في تحميل بيانات أمر الشراء");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = async (query: string) => {
    try {
      setProductSearchLoading(true);
      const response = await apiClient.get("/products", {
        params: {
          search: query || undefined,
          limit: query ? 20 : 100,
        },
      });
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setProductSearchLoading(false);
    }
  };

  const updateItemDetails = (index: number, updates: Partial<OrderItem>) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      const currentItem = newItems[index];
      if (!currentItem) return prevItems;
      const item: OrderItem = { ...currentItem, ...updates };

      const quantity = parseFloat("quantity" in updates ? (updates.quantity as any) : item.quantity) || 0;
      const unitPrice = parseFloat("unitPrice" in updates ? (updates.unitPrice as any) : item.unitPrice) || 0;
      const taxRate = parseFloat("taxRate" in updates ? (updates.taxRate as any) : item.taxRate) || 0;
      const discountRate = parseFloat("discountRate" in updates ? (updates.discountRate as any) : item.discountRate) || 0;

      const subtotal = quantity * unitPrice;
      const discount = subtotal * (discountRate / 100);
      const tax = (subtotal - discount) * (taxRate / 100);

      item.totalPrice = subtotal - discount + tax;
      newItems[index] = item;
      return newItems;
    });
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    updateItemDetails(index, { [field]: value });
  };

  const addItem = () => {
    setItems([
      ...items,
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
      setItems([{
        productId: null,
        productName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        discountRate: 0,
        totalPrice: 0,
      }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
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
      (sum, item) => sum + item.quantity * item.unitPrice * (item.discountRate / 100), 0,
    );

    const grandTotal = subtotal - itemDiscounts + totalTax + Number(formData.shippingCost) - Number(formData.discountAmount);

    return { subtotal, totalTax, itemDiscounts, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error("يرجى اختيار المورد");
      return;
    }

    const invalidItems = items.filter((item) => !item.productName || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error("يرجى التأكد من اختيار المنتج وإدخال كمية صحيحة لكل البنود");
      return;
    }

    try {
      setSaving(true);
      const payload = { ...formData, items };

      if (isEdit) {
        await apiClient.put(`/procurement/purchase-orders/${id}`, payload);
        toast.success("تم تحديث أمر الشراء بنجاح");
      } else {
        await apiClient.post("/procurement/purchase-orders", payload);
        toast.success("تم إنشاء أمر الشراء بنجاح");
      }
      navigate("/procurement/purchase-orders");
    } catch (error: any) {
      console.error("Error saving order:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء حفظ أمر الشراء");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-5">
        <LoadingSpinner />
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const totals = calculateTotals();

  return (
    <div className="p-3 no-print">
      <div className="flex items-center mb-3 gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/procurement/purchase-orders")}
            className="micro-bounce"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold gradient-text">
            {isEdit ? "تعديل أمر شراء" : "إنشاء أمر شراء جديد"}
          </h1>
        </div>
        {isEdit && (
          <Button variant="outline" onClick={handlePrint} className="micro-bounce">
            <Printer className="size-4" /> طباعة
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Card className={`${glassClass} card-hover-lift`} size="sm">
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>المورد *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>تاريخ الأمر</Label>
                  <Input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>التسليم المتوقع</Label>
                  <Input
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${glassClass} card-hover-lift`} size="sm">
            <CardContent>
              <h3 className="text-base font-semibold mb-2 gradient-text">الأصناف</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px] font-bold">الصنف</TableHead>
                      <TableHead className="w-[100px] text-right font-bold">الكمية</TableHead>
                      <TableHead className="w-[120px] text-right font-bold">سعر الوحدة</TableHead>
                      <TableHead className="w-[100px] text-right font-bold">الضريبة %</TableHead>
                      <TableHead className="w-[100px] text-right font-bold">الخصم %</TableHead>
                      <TableHead className="w-[120px] text-right font-bold">الإجمالي</TableHead>
                      <TableHead className="w-[50px] text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              placeholder="اختر صنفاً أو ابحث باسمه"
                              value={item.productName}
                              onChange={(e) => {
                                updateItem(index, "productName", e.target.value);
                                handleProductSearch(e.target.value);
                              }}
                              className={productSearchLoading ? "opacity-60" : ""}
                            />
                            {products.length > 0 && item.productName && (
                              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
                                {products
                                  .filter((p) =>
                                    p.name.toLowerCase().includes(item.productName.toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                                      onClick={() => {
                                        updateItemDetails(index, {
                                          productId: p.id,
                                          productName: p.name,
                                          unitPrice: p.cost || 0,
                                        });
                                      }}
                                    >
                                      {p.name} ({p.sku || "N/A"})
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => updateItem(index, "taxRate", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.discountRate}
                            onChange={(e) => updateItem(index, "discountRate", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.totalPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="micro-bounce"
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                variant="outline"
                onClick={addItem}
                className="mt-2 micro-bounce"
              >
                <Plus className="size-4" /> إضافة صنف جديد
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className={`${glassClass}`} size="sm">
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <Label>شروط الدفع</Label>
                      <Textarea
                        rows={2}
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>ملاحظات إضافية</Label>
                      <Textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className={`${glassClass} pulse-glow`} size="sm">
                <CardContent>
                  <h3 className="text-base font-semibold mb-3 gradient-text">ملخص المبالغ</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المجموع قبل الخصم:</span>
                      <span className="font-bold">{totals.subtotal.toFixed(2)} EGP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي خصم البنود:</span>
                      <span className="text-red-500">-{totals.itemDiscounts.toFixed(2)} EGP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي الضرائب:</span>
                      <span className="text-green-600">+{totals.totalTax.toFixed(2)} EGP</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="grid grid-cols-2 gap-1 items-center">
                      <span className="text-muted-foreground text-sm">مصاريف الشحن:</span>
                      <Input
                        type="number"
                        value={formData.shippingCost}
                        onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 items-center">
                      <span className="text-muted-foreground text-sm">خصم إضافي عام:</span>
                      <Input
                        type="number"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                      />
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between mt-1">
                      <h3 className="font-bold text-base">الإجمالي النهائي:</h3>
                      <h2 className="text-xl font-black text-primary">
                        {totals.grandTotal.toFixed(2)} EGP
                      </h2>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/procurement/purchase-orders")}
              className="micro-bounce"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="micro-bounce px-8"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "0 4px 15px rgba(118, 75, 162, 0.4)",
              }}
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="size-4" />}
              {isEdit ? "تحديث البيانات" : "تأكيد وحفظ الأمر"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderForm;
