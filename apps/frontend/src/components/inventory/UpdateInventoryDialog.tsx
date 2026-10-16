import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { X, Boxes, AlertCircle, Loader2 } from "lucide-react";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

interface UpdateInventoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UpdateInventoryDialog: React.FC<UpdateInventoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productId: "",
    warehouseId: "",
    quantity: 0,
    type: "IN",
    reason: "إضافة",
    notes: "",
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/products`, {
        headers: tokenManager.createAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("فشل في جلب المنتجات");
      }

      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      } else {
        setError(data.message || "فشل في جلب المنتجات");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/warehouses`, {
        headers: tokenManager.createAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setWarehouses(data.data);
          if (data.data.length > 0) {
            setFormData((prev) =>
              prev.warehouseId ? prev : { ...prev, warehouseId: data.data[0].id },
            );
          } else {
            setError("لا توجد مخازن متاحة. يرجى إنشاء مخزن أولاً.");
          }
        } else {
          setError("فشل في جلب المخازن");
        }
      } else {
        setError("فشل في الاتصال بالخادم لجلب المخازن");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم");
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchWarehouses();
    }
  }, [open, fetchProducts, fetchWarehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      setError("الرجاء اختيار المنتج");
      return;
    }

    if (formData.quantity <= 0) {
      setError("الرجاء إدخال كمية صحيحة");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const apiUrl = getApiUrl();

      const response = await fetch(`${apiUrl}/inventory/update-stock`, {
        method: "POST",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "فشل في تحديث المخزون");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      productId: "",
      warehouseId: warehouses.length > 0 && warehouses[0] ? warehouses[0].id : "",
      quantity: 0,
      type: "IN",
      reason: "إضافة",
      notes: "",
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl rounded-2xl border border-border/70 bg-card p-0 shadow-2xl text-foreground" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Boxes className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">
              تحديث المخزون
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              المنتج
            </label>
            <select
              value={formData.productId}
              onChange={(e) =>
                setFormData({ ...formData, productId: e.target.value })
              }
              className="h-9 w-full rounded-lg border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
              disabled={loading}
            >
              <option value="">اختر المنتج</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                نوع الحركة
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="IN">إدخال</option>
                <option value="OUT">إخراج</option>
                <option value="PURCHASE">شراء</option>
                <option value="SALE">بيع</option>
                <option value="RETURN">إرجاع</option>
                <option value="DAMAGE">تلف</option>
                <option value="ADJUSTMENT_IN">تعديل (إضافة)</option>
                <option value="ADJUSTMENT_OUT">تعديل (خصم)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                المستودع
              </label>
              <select
                value={formData.warehouseId}
                onChange={(e) =>
                  setFormData({ ...formData, warehouseId: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
                disabled={loading || warehouses.length === 0}
              >
                {warehouses.length === 0 ? (
                  <option value="">لا توجد مخازن متاحة</option>
                ) : (
                  warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}{" "}
                      {warehouse.location && `- ${warehouse.location}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                السبب
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-border/70 bg-background/80 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="سبب التحديث"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                الكمية
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="h-9 w-full rounded-lg border border-border/70 bg-background/80 px-3 font-mono text-xs text-foreground tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                min="0"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              الملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full rounded-lg border border-border/70 bg-background/80 p-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="h-9 rounded-lg border-border/70 text-xs font-medium hover:bg-muted/50"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting || loading}
              className="h-9 gap-1.5 rounded-lg text-xs font-semibold shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                "تحديث المخزون"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateInventoryDialog;
