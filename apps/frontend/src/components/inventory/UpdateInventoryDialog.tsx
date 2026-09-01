import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { X } from "lucide-react";
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

      console.log("🔍 Fetching products from:", `${apiUrl}/products`);
      console.log("🔑 Token exists:", !!tokenManager.getAccessToken());

      const response = await fetch(`${apiUrl}/products`, {
        headers: tokenManager.createAuthHeaders(),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error("فشل في جلب المنتجات");
      }

      const data = await response.json();
      console.log("📦 Products data:", data);

      if (data.success) {
        console.log("✅ Products count:", data.data?.length || 0);
        setProducts(data.data || []);
      } else {
        console.error("❌ API returned success: false");
        setError(data.message || "فشل في جلب المنتجات");
      }
    } catch (err) {
      console.error("❌ Error fetching products:", err);
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();

      console.log("🏢 Fetching warehouses from:", `${apiUrl}/warehouses`);

      const response = await fetch(`${apiUrl}/warehouses`, {
        headers: tokenManager.createAuthHeaders(),
      });

      console.log("📡 Warehouses response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🏢 Warehouses data:", data);

        if (data.success && data.data) {
          console.log("✅ Warehouses count:", data.data.length);
          setWarehouses(data.data);
          if (data.data.length > 0) {
            setFormData((prev) =>
              prev.warehouseId
                ? prev
                : { ...prev, warehouseId: data.data[0].id },
            );
          } else if (data.data.length === 0) {
            setError("لا توجد مخازن متاحة. يرجى إنشاء مخزن أولاً.");
          }
        } else {
          console.error("❌ Warehouses API returned success: false or no data");
          setError("فشل في جلب المخازن");
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Warehouses response error:", errorText);
        setError("فشل في الاتصال بالخادم لجلب المخازن");
      }
    } catch (err) {
      console.error("❌ Error fetching warehouses:", err);
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

      console.log("📤 Sending update stock request:", formData);
      console.log("🔗 API URL:", `${apiUrl}/inventory/update-stock`);

      const response = await fetch(`${apiUrl}/inventory/update-stock`, {
        method: "POST",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      console.log("📥 Response status:", response.status);
      console.log("📥 Response data:", data);

      if (!response.ok || !data.success) {
        console.error("❌ Update failed:", data);
        throw new Error(data.message || "فشل في تحديث المخزون");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Error updating inventory:", err);
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      productId: "",
      warehouseId:
        warehouses.length > 0 && warehouses[0] ? warehouses[0].id : "",
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
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              تحديث المخزون
            </DialogTitle>
            <button
              onClick={handleClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              المنتج
            </label>
            <select
              value={formData.productId}
              onChange={(e) =>
                setFormData({ ...formData, productId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الحركة
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المستودع
              </label>
              <select
                value={formData.warehouseId}
                onChange={(e) =>
                  setFormData({ ...formData, warehouseId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              السبب
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="سبب التحديث"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? "جاري التحديث..." : "تحديث المخزون"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateInventoryDialog;
