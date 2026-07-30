import { ArrowLeft as ArrowLeftIcon, Pencil as PencilIcon } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import { toast } from "sonner";
;

interface MerchantProduct {
  id: string;
  merchantSku?: string | null;
  merchantPrice?: number | string | null;
  stock?: number | null;
  syncEnabled?: boolean;
  lastSyncedAt?: string | null;
  inventorySnapshot?: MerchantInventorySnapshot | null;
  product?: {
    id: string;
    name: string;
    price?: number | string | null;
  } | null;
}

interface MerchantInventorySnapshot {
  stockLocationLabel: string;
  canEditStock: boolean;
  warehouseNames?: string[];
  warehouseName?: string | null;
  merchantProductStock: number;
  physicalQuantity: number;
  physicalAvailable: number;
  reservedQuantity: number;
  availableForSale: number;
}

interface MerchantInventorySummary {
  linkedProducts: number;
  availableForSale: number;
  merchantProductStock: number;
  physicalQuantity: number;
  physicalAvailable: number;
  reservedQuantity: number;
  stockLocationLabel: string;
  warehouseNames?: string[];
}

interface MerchantOperationsTotals {
  assignedOrdersCount: number;
  assignedPieces: number;
  preparationOrdersCount: number;
  preparationPieces: number;
  inShippingOrdersCount: number;
  inShippingPieces: number;
  deliveredOrdersCount: number;
  deliveredPieces: number;
  notDeliveredOrdersCount: number;
  notDeliveredPieces: number;
  payablePieces: number;
  pendingPayablePieces: number;
  expectedReceivableAmount: number;
  inShippingAmount: number;
  deliveredPayableAmount: number;
  notDeliveredAmount: number;
  shippingCostAmount: number;
  confirmedCommissionAmount: number;
  pendingCommissionAmount: number;
  paidAmount: number;
}

interface MerchantOperationRow {
  id: string;
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  fulfillmentSource?: string;
  warehouseName?: string | null;
  shippingCompanyName?: string | null;
  trackingNumber?: string | null;
  operationStatus?: string;
  pieces?: number;
  merchantAmount?: number;
  payableAmount?: number;
  expectedAmount?: number;
}

interface MerchantOperationsSummary {
  summary?: Partial<MerchantOperationsTotals>;
  rows?: MerchantOperationRow[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface ProductOption {
  id: string;
  name: string;
  price?: number | string | null;
  stock?: number | null;
  isDropshipped?: boolean;
}

interface WarehouseOption {
  id: string;
  name: string;
  location?: string | null;
  isActive?: boolean;
}

interface ShippingCompanyOption {
  id: string;
  name: string;
  slug?: string | null;
  isActive?: boolean;
}

interface MerchantRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  commissionRate: number;
  autoFulfill?: boolean;
  fulfillmentMode?: string | null;
  defaultWarehouseId?: string | null;
  defaultShippingCompanyId?: string | null;
  webhookUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  products?: MerchantProduct[];
  inventorySummary?: MerchantInventorySummary | null;
  operationsSummary?: MerchantOperationsSummary | null;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ProductListResponse {
  success: boolean;
  data: ProductOption[];
}

interface SyncInventoryResult {
  synced?: number;
  timestamp?: string;
}

const formatPieces = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

const formatMoney = (value: string | number | undefined | null, currency = "EGP") =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const createEmptyOperationsTotals = (): MerchantOperationsTotals => ({
  assignedOrdersCount: 0,
  assignedPieces: 0,
  preparationOrdersCount: 0,
  preparationPieces: 0,
  inShippingOrdersCount: 0,
  inShippingPieces: 0,
  deliveredOrdersCount: 0,
  deliveredPieces: 0,
  notDeliveredOrdersCount: 0,
  notDeliveredPieces: 0,
  payablePieces: 0,
  pendingPayablePieces: 0,
  expectedReceivableAmount: 0,
  inShippingAmount: 0,
  deliveredPayableAmount: 0,
  notDeliveredAmount: 0,
  shippingCostAmount: 0,
  confirmedCommissionAmount: 0,
  pendingCommissionAmount: 0,
  paidAmount: 0,
});

const getMerchantOperationsTotals = (
  merchant: MerchantRecord,
): MerchantOperationsTotals => ({
  ...createEmptyOperationsTotals(),
  ...(merchant.operationsSummary?.summary || {}),
});

const operationStatusLabels: Record<string, string> = {
  PREPARATION: "قيد التجهيز",
  IN_SHIPPING: "في الشحن",
  DELIVERED: "تم التسليم",
  NOT_DELIVERED: "مرتجع أو لم يسلم",
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const MerchantProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const isEditMode = location.pathname.endsWith("/edit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [linkingProduct, setLinkingProduct] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<
    ShippingCompanyOption[]
  >([]);
  const [lastSyncSummary, setLastSyncSummary] = useState<SyncInventoryResult | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    commissionRate: 10,
    autoFulfill: false,
    fulfillmentMode: "MERCHANT",
    defaultWarehouseId: "",
    defaultShippingCompanyId: "",
    webhookUrl: "",
    isActive: true,
  });
  const [linkForm, setLinkForm] = useState({
    productId: "",
    merchantSku: "",
    merchantPrice: "",
    stock: "0",
    syncEnabled: true,
  });

  useEffect(() => {
    if (!id) {
      toast.error("تعذر تحديد التاجر المطلوب");
      navigate("/merchants");
      return;
    }

    loadMerchant();
  }, [id]);

  const loadAvailableProducts = async (silent = false) => {
    try {
      setProductsLoading(true);
      const response = await apiClient.get<ProductListResponse>("/products", {
        params: {
          page: 1,
          limit: 200,
          sortBy: "name",
          sortOrder: "asc",
        },
      });

      if (response.data.success) {
        setAvailableProducts(response.data.data || []);
      }
    } catch (error: unknown) {
      if (!silent) {
        toast.error(
          getApiErrorMessage(error, "تعذر تحميل قائمة المنتجات المتاحة"),
        );
      }
    } finally {
      setProductsLoading(false);
    }
  };

  const loadFulfillmentOptions = async (silent = false) => {
    try {
      setOptionsLoading(true);
      const [warehousesRes, shippingCompaniesRes] = await Promise.all([
        apiClient.get<ApiSuccess<WarehouseOption[]>>("/warehouses"),
        apiClient.get<ApiSuccess<ShippingCompanyOption[]>>(
          "/shipping-companies",
        ),
      ]);

      if (warehousesRes.data.success) {
        setWarehouses(
          (warehousesRes.data.data || []).filter(
            (warehouse) => warehouse.isActive !== false,
          ),
        );
      }

      if (shippingCompaniesRes.data.success) {
        setShippingCompanies(
          (shippingCompaniesRes.data.data || []).filter(
            (company) => company.isActive !== false,
          ),
        );
      }
    } catch (error: unknown) {
      if (!silent) {
        toast.error(
          getApiErrorMessage(
            error,
            "تعذر تحميل المخازن أو شركات الشحن المتاحة",
          ),
        );
      }
    } finally {
      setOptionsLoading(false);
    }
  };

  const loadMerchant = async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get<ApiSuccess<MerchantRecord>>(
        `/merchants/${id}`,
      );

      if (response.data.success) {
        const nextMerchant = response.data.data as MerchantRecord;
        setMerchant(nextMerchant);
        setFormData({
          name: nextMerchant.name || "",
          email: nextMerchant.email || "",
          phone: nextMerchant.phone || "",
          address: nextMerchant.address || "",
          commissionRate: Number(nextMerchant.commissionRate || 0),
          autoFulfill: Boolean(nextMerchant.autoFulfill),
          fulfillmentMode: nextMerchant.fulfillmentMode || "MERCHANT",
          defaultWarehouseId: nextMerchant.defaultWarehouseId || "",
          defaultShippingCompanyId: nextMerchant.defaultShippingCompanyId || "",
          webhookUrl: nextMerchant.webhookUrl || "",
          isActive: nextMerchant.isActive ?? true,
        });
        setLastSyncSummary(null);
      }

      await Promise.all([
        loadAvailableProducts(true),
        loadFulfillmentOptions(true),
      ]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر تحميل بيانات التاجر"));
      navigate("/merchants");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put<
        ApiSuccess<MerchantRecord>,
        typeof formData
      >(`/merchants/${id}`, formData);

      if (response.data.success) {
        toast.success("تم تحديث بيانات التاجر بنجاح");
        navigate(`/merchants/${id}`);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر تحديث بيانات التاجر"));
    } finally {
      setSaving(false);
    }
  };

  const handleLinkProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      return;
    }

    if (!linkForm.productId) {
      toast.error("اختر منتجًا أولًا");
      return;
    }

    const merchantPrice = Number(linkForm.merchantPrice);
    const stock = Number(linkForm.stock || "0");

    if (!Number.isFinite(merchantPrice) || merchantPrice <= 0) {
      toast.error("أدخل سعر تاجر صحيحًا");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("أدخل قيمة مخزون صحيحة");
      return;
    }

    try {
      setLinkingProduct(true);
      const response = await apiClient.post<ApiSuccess<MerchantProduct>>(
        `/merchants/${id}/products`,
        {
          productId: linkForm.productId,
          merchantSku: linkForm.merchantSku.trim() || undefined,
          merchantPrice,
          stock,
          syncEnabled: linkForm.syncEnabled,
        },
      );

      if (response.data.success) {
        toast.success("تم ربط المنتج بالتاجر بنجاح");
        setLinkForm({
          productId: "",
          merchantSku: "",
          merchantPrice: "",
          stock: "0",
          syncEnabled: true,
        });
        await loadMerchant();
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر ربط المنتج بالتاجر"));
    } finally {
      setLinkingProduct(false);
    }
  };

  const handleSyncInventory = async () => {
    if (!id) {
      return;
    }

    try {
      setSyncingInventory(true);
      const response = await apiClient.post<ApiSuccess<SyncInventoryResult>>(
        `/merchants/${id}/sync`,
      );

      if (response.data.success) {
        setLastSyncSummary(response.data.data || null);
        toast.success(
          `تمت مزامنة ${response.data.data?.synced ?? 0} منتج بنجاح`,
        );
        await loadMerchant();
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر مزامنة المخزون"));
    } finally {
      setSyncingInventory(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

  const cardClass = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const textMutedClass = isDark ? "text-gray-400" : "text-gray-500";
  const inputClass = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
    isDark
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-900"
  }`;
  const linkedProductIds = new Set(
    (merchant.products || [])
      .map((merchantProduct) => merchantProduct.product?.id)
      .filter((value): value is string => Boolean(value)),
  );
  const fulfillmentModeLabel =
    formData.fulfillmentMode === "COMPANY_WAREHOUSE"
      ? "الشركة تنفذ من مخزنها"
      : "التاجر يشحن من مخزونه";
  const selectedWarehouse = warehouses.find(
    (warehouse) => warehouse.id === formData.defaultWarehouseId,
  );
  const selectedShippingCompany = shippingCompanies.find(
    (company) => company.id === formData.defaultShippingCompanyId,
  );
  const operationsTotals = getMerchantOperationsTotals(merchant);
  const recentOperations = merchant.operationsSummary?.rows || [];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}>
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/merchants")}
              className={`inline-flex items-center gap-2 mb-3 text-sm ${isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              العودة إلى قائمة التجار
            </button>
            <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {isEditMode ? "تعديل بيانات التاجر" : merchant.name}
            </h1>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {isEditMode
                ? "حدّث بيانات التاجر وإعدادات الدروب شيبنج المرتبطة به."
                : "عرض بيانات التاجر والمنتجات المرتبطة به."}
            </p>
          </div>

          {!isEditMode && (
            <div className="flex flex-wrap gap-2">
              {[
                ["/orders", "الطلبات الموحدة"],
                ["/inventory", "المخزون الموحد"],
                ["/products", "المنتجات"],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition ${
                    isDark
                      ? "bg-gray-800 text-gray-100 hover:bg-gray-700"
                      : "bg-white text-gray-800 shadow-sm hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to={`/merchants/${merchant.id}/edit`}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <PencilIcon className="h-5 w-5" />
                تعديل
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-lg border shadow-sm p-6 ${cardClass}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    اسم التاجر
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                    disabled={!isEditMode}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    disabled={!isEditMode}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    الهاتف
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    disabled={!isEditMode}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    نسبة العمولة (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commissionRate: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    disabled={!isEditMode}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  العنوان
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  className={inputClass}
                  disabled={!isEditMode}
                />
              </div>

              <div
                className={`rounded-lg border p-4 ${
                  isDark
                    ? "border-amber-700 bg-amber-900/20"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <h3
                  className={`font-semibold ${isDark ? "text-amber-200" : "text-amber-900"}`}
                >
                  إعدادات التشغيل داخل نظام الأفليت
                </h3>
                <p
                  className={`mt-1 text-sm ${isDark ? "text-amber-100/80" : "text-amber-800"}`}
                >
                  هذه القيم ملك الشركة: تحدد من أين يخرج الطلب، وأي شركة شحن
                  تستخدم، وهل حساب التاجر مفعل أم قيد المراجعة.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    طريقة تنفيذ الطلبات
                  </label>
                  <select
                    value={formData.fulfillmentMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fulfillmentMode: e.target.value,
                        defaultWarehouseId:
                          e.target.value === "COMPANY_WAREHOUSE"
                            ? formData.defaultWarehouseId
                            : "",
                      })
                    }
                    className={inputClass}
                    disabled={!isEditMode}
                  >
                    <option value="MERCHANT">التاجر يشحن من مخزونه</option>
                    <option value="COMPANY_WAREHOUSE">
                      الشركة تنفذ من مخزنها
                    </option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    المخزن الافتراضي
                  </label>
                  <select
                    value={formData.defaultWarehouseId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultWarehouseId: e.target.value,
                      })
                    }
                    className={inputClass}
                    disabled={
                      !isEditMode ||
                      optionsLoading ||
                      formData.fulfillmentMode !== "COMPANY_WAREHOUSE"
                    }
                  >
                    <option value="">
                      {formData.fulfillmentMode === "COMPANY_WAREHOUSE"
                        ? "اختر مخزن الشركة"
                        : "غير مطلوب عند شحن التاجر"}
                    </option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                        {warehouse.location ? ` - ${warehouse.location}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  شركة الشحن الافتراضية
                </label>
                <select
                  value={formData.defaultShippingCompanyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultShippingCompanyId: e.target.value,
                    })
                  }
                  className={inputClass}
                  disabled={!isEditMode || optionsLoading}
                >
                  <option value="">بدون شركة شحن افتراضية</option>
                  {shippingCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.autoFulfill}
                    onChange={(e) =>
                      setFormData({ ...formData, autoFulfill: e.target.checked })
                    }
                    disabled={!isEditMode}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                    تفعيل الوفاء التلقائي للطلبات
                  </span>
                </label>

                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    disabled={!isEditMode}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                    التاجر نشط
                  </span>
                </label>
              </div>

              {isEditMode && (
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/merchants/${merchant.id}`)}
                    className={`px-6 py-3 border rounded-lg transition ${
                      isDark
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-6">
            <div className={`rounded-lg border shadow-sm p-6 ${cardClass}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                ملخص سريع
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className={textMutedClass}>الحالة</p>
                  <p className={merchant.isActive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {merchant.isActive ? "نشط" : "غير نشط"}
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>عدد المنتجات المرتبطة</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {merchant.products?.length || 0}
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>طلبات مسندة للتاجر</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatPieces(operationsTotals.assignedOrdersCount)} طلب
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>قطع مستحقة بعد التسليم</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatPieces(operationsTotals.payablePieces)} قطعة
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>طريقة التنفيذ</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {fulfillmentModeLabel}
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>المخزن الافتراضي</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedWarehouse?.name || "غير محدد"}
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>المخزون القابل للبيع</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatPieces(merchant.inventorySummary?.availableForSale)} قطعة
                  </p>
                  <p className={textMutedClass}>
                    {merchant.inventorySummary?.stockLocationLabel || fulfillmentModeLabel}
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>المحجوز</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatPieces(merchant.inventorySummary?.reservedQuantity)} قطعة
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>شركة الشحن الافتراضية</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedShippingCompany?.name || "غير محددة"}
                  </p>
                </div>
                <div>
                  <p className={textMutedClass}>تاريخ الإنشاء</p>
                  <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {merchant.createdAt
                      ? new Date(merchant.createdAt).toLocaleDateString("ar-EG")
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg border shadow-sm p-6 ${cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    متابعة طلبات التاجر
                  </h2>
                  <p className={`mt-1 text-sm ${textMutedClass}`}>
                    ملخص تشغيل من طلبات الشركة الموحدة، بدون شاشة طلبات منفصلة للتاجر.
                  </p>
                </div>
                <Link
                  to="/orders"
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
                    isDark
                      ? "bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  فتح الطلبات
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["قيد التجهيز", operationsTotals.preparationOrdersCount],
                  ["في الشحن", operationsTotals.inShippingOrdersCount],
                  ["تم التسليم", operationsTotals.deliveredOrdersCount],
                  ["مرتجع", operationsTotals.notDeliveredOrdersCount],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-lg border p-3 ${
                      isDark
                        ? "border-gray-700 bg-gray-900/40"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <p className={`text-xs ${textMutedClass}`}>{label}</p>
                    <p className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                      {formatPieces(value as number)} طلب
                    </p>
                  </div>
                ))}
              </div>

              <div
                className={`mt-4 rounded-lg border p-4 ${
                  isDark ? "border-gray-700 bg-gray-900/40" : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className={textMutedClass}>مستحق بعد التسليم</span>
                    <strong className={isDark ? "text-emerald-300" : "text-emerald-700"}>
                      {formatMoney(operationsTotals.deliveredPayableAmount)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={textMutedClass}>قيمة في الشحن</span>
                    <strong className={isDark ? "text-amber-300" : "text-amber-700"}>
                      {formatMoney(operationsTotals.inShippingAmount)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={textMutedClass}>تم تحويله</span>
                    <strong className={isDark ? "text-white" : "text-gray-900"}>
                      {formatMoney(operationsTotals.paidAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              {recentOperations.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {recentOperations.slice(0, 4).map((operation) => (
                    <div
                      key={operation.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isDark
                          ? "border-gray-700 bg-gray-900/30"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {operation.orderNumber || operation.id}
                        </span>
                        <span className={textMutedClass}>
                          {operationStatusLabels[operation.operationStatus || ""] ||
                            operation.operationStatus ||
                            "قيد المتابعة"}
                        </span>
                      </div>
                      <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${textMutedClass}`}>
                        <span>{operation.customerName || "عميل"}</span>
                        <span>{formatPieces(operation.pieces)} قطعة</span>
                        <span>{formatMoney(operation.merchantAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`mt-4 rounded-lg border p-4 text-center text-sm ${textMutedClass} ${
                  isDark ? "border-gray-700" : "border-gray-100"
                }`}>
                  لا توجد طلبات مسندة لهذا التاجر حتى الآن.
                </p>
              )}
            </div>

            <div className={`rounded-lg border shadow-sm p-6 ${cardClass}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                المنتجات المرتبطة
              </h2>
              {merchant.products && merchant.products.length > 0 ? (
                <div className="space-y-3">
                  {merchant.products.slice(0, 8).map((merchantProduct) => (
                    <div
                      key={merchantProduct.id}
                      className={`rounded-lg border px-4 py-3 ${isDark ? "border-gray-700 bg-gray-900/40" : "border-gray-100 bg-gray-50"}`}
                    >
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {merchantProduct.product?.name || "منتج غير معروف"}
                      </p>
                      <div className={`mt-2 space-y-1 text-sm ${textMutedClass}`}>
                        <p>سعر التاجر: {merchantProduct.merchantPrice ?? "-"}</p>
                        <p>
                          قابل للبيع:{" "}
                          {formatPieces(
                            merchantProduct.inventorySnapshot?.availableForSale ??
                              merchantProduct.stock,
                          )}{" "}
                          قطعة
                        </p>
                        <p>
                          فعلي/محجوز:{" "}
                          {formatPieces(
                            merchantProduct.inventorySnapshot?.physicalQuantity,
                          )}
                          {" / "}
                          {formatPieces(
                            merchantProduct.inventorySnapshot?.reservedQuantity,
                          )}
                        </p>
                        <p>
                          المكان:{" "}
                          {merchantProduct.inventorySnapshot?.stockLocationLabel ||
                            fulfillmentModeLabel}
                          {merchantProduct.inventorySnapshot?.warehouseNames?.length
                            ? ` - ${merchantProduct.inventorySnapshot.warehouseNames.join("، ")}`
                            : ""}
                        </p>
                        {merchantProduct.inventorySnapshot &&
                        merchantProduct.inventorySnapshot.availableForSale !==
                          merchantProduct.inventorySnapshot.merchantProductStock ? (
                          <p>
                            رصيد الربط:{" "}
                            {formatPieces(
                              merchantProduct.inventorySnapshot.merchantProductStock,
                            )}
                          </p>
                        ) : null}
                        <p>
                          المزامنة: {merchantProduct.syncEnabled ? "مفعلة" : "متوقفة"}
                        </p>
                        <p>
                          آخر مزامنة:{" "}
                          {merchantProduct.lastSyncedAt
                            ? new Date(merchantProduct.lastSyncedAt).toLocaleString(
                                "ar-EG",
                              )
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={textMutedClass}>لا توجد منتجات مرتبطة بهذا التاجر بعد.</p>
              )}
            </div>
          </div>
        </div>

        {!isEditMode && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className={`rounded-lg border shadow-sm p-6 ${cardClass}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    ربط منتج بالتاجر
                  </h2>
                  <p className={`mt-2 text-sm ${textMutedClass}`}>
                    اختر منتجًا من منتجات الشركة وحدد سعر التاجر والمخزون الحالي.
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    productsLoading
                      ? isDark
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-100 text-gray-700"
                      : isDark
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {productsLoading ? "جارٍ تحميل المنتجات" : `${availableProducts.length} منتج`}
                </span>
              </div>

              <form onSubmit={handleLinkProduct} className="mt-6 space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    المنتج
                  </label>
                  <select
                    value={linkForm.productId}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, productId: e.target.value })
                    }
                    className={inputClass}
                    disabled={productsLoading || linkingProduct}
                  >
                    <option value="">اختر منتجًا لربطه</option>
                    {availableProducts.map((productOption) => (
                      <option key={productOption.id} value={productOption.id}>
                        {productOption.name}
                        {linkedProductIds.has(productOption.id) ? " - مرتبط حاليًا" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      سعر التاجر
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={linkForm.merchantPrice}
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          merchantPrice: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="مثال: 150"
                      disabled={linkingProduct}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      المخزون الحالي
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={linkForm.stock}
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          stock: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="0"
                      disabled={linkingProduct}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Merchant SKU
                  </label>
                  <input
                    type="text"
                    value={linkForm.merchantSku}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, merchantSku: e.target.value })
                    }
                    className={inputClass}
                    placeholder="اختياري"
                    disabled={linkingProduct}
                  />
                </div>

                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={linkForm.syncEnabled}
                    onChange={(e) =>
                      setLinkForm({
                        ...linkForm,
                        syncEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={linkingProduct}
                  />
                  <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                    تفعيل المزامنة لهذا المنتج
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={linkingProduct || productsLoading}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {linkingProduct ? "جارٍ الربط..." : "ربط المنتج بالتاجر"}
                </button>
              </form>
            </div>

            <div className={`rounded-lg border shadow-sm p-6 ${cardClass}`}>
              <h2
                className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                مزامنة المخزون
              </h2>
              <p className={`mt-2 text-sm ${textMutedClass}`}>
                شغّل المزامنة اليدوية لتحديث آخر مزامنة لكل منتج مربوط بهذا التاجر.
              </p>

              <div
                className={`mt-6 rounded-lg border p-4 ${isDark ? "border-gray-700 bg-gray-900/40" : "border-gray-100 bg-gray-50"}`}
              >
                <div className="space-y-2 text-sm">
                  <p className={textMutedClass}>
                    المنتجات القابلة للمزامنة:{" "}
                    <span className={isDark ? "text-white" : "text-gray-900"}>
                      {
                        (merchant.products || []).filter(
                          (merchantProduct) => merchantProduct.syncEnabled,
                        ).length
                      }
                    </span>
                  </p>
                  <p className={textMutedClass}>
                    آخر عملية يدوية:{" "}
                    <span className={isDark ? "text-white" : "text-gray-900"}>
                      {lastSyncSummary?.timestamp
                        ? new Date(lastSyncSummary.timestamp).toLocaleString("ar-EG")
                        : "لم يتم تنفيذ مزامنة في هذه الجلسة"}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncInventory}
                disabled={syncingInventory || (merchant.products?.length || 0) === 0}
                className={`mt-6 w-full px-6 py-3 rounded-lg text-white transition ${
                  syncingInventory || (merchant.products?.length || 0) === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {syncingInventory ? "جارٍ تنفيذ المزامنة..." : "تشغيل مزامنة المخزون الآن"}
              </button>

              {lastSyncSummary && (
                <p className={`mt-4 text-sm ${textMutedClass}`}>
                  تمت مزامنة {lastSyncSummary.synced ?? 0} منتج في آخر عملية.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantProfile;
