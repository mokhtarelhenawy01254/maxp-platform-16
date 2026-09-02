import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  Layers,
  Link2,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { tToast } from "../../utils/i18n-toast";
import { getDirection } from "../../i18n";
import {
  type ManagedMarketplaceAppSlug,
  STORE_CONVERSION_APP_LABELS,
} from "../settings/storeConversionSettingsConfig";
import {
  useConversionTools,
  ToggleSwitch,
  isAppOperational,
} from "../settings/useConversionTools";

type JsonRecord = Record<string, unknown>;
type ManagedRelationType = "upsell" | "crossSell" | "related";
type RelationBuckets = Record<ManagedRelationType, string[]>;

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  isActive: boolean;
  categoryName: string;
  imageUrl?: string;
  metadata: JsonRecord;
  relations: RelationBuckets;
}

const RELATION_TABS: {
  id: ManagedRelationType;
  label: string;
  subtitle: string;
  badgeTone: "green" | "blue" | "purple";
  helpText: string;
  placementBadge: string;
}[] = [
  {
    id: "upsell",
    label: "منتجات الترقية (Upsell)",
    subtitle: "بدائل أفضل أو أعلى قيمة لتشجيع العميل على الترقية.",
    badgeTone: "green",
    helpText: "تظهر في صفحة الشكر بعد الدفع أو كعرض ترقية مباشر لبديل أفضل.",
    placementBadge: "Thank You & PDP",
  },
  {
    id: "crossSell",
    label: "منتجات مكملة (Cross-sell)",
    subtitle: "إضافات تكميلية ترفع قيمة سلة الشراء ومكملة للمنتج.",
    badgeTone: "blue",
    helpText: "تظهر داخل سلة الشراء وتحت المنتج كـ (Frequently Bought Together).",
    placementBadge: "Cart & PDP",
  },
  {
    id: "related",
    label: "منتجات مشابهة (Related)",
    subtitle: "منتجات قريبة من نفس الفئة والاهتمام.",
    badgeTone: "purple",
    helpText: "تغذي شبكة المنتجات المقترحة أسفل صفحة المنتج بدون ضغط بيعي.",
    placementBadge: "Product Page",
  },
];

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJsonRecord = (value: unknown): JsonRecord => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
};

const extractRelationIds = (metadata: JsonRecord, key: string): string[] => {
  const value = metadata[key];
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
};

const normalizeProduct = (rawItem: unknown): CatalogProduct => {
  const raw = isRecord(rawItem) ? rawItem : {};
  const rawPrice = Number(raw["price"]);
  const metadata = parseJsonRecord(raw["metadata"]);

  const relations: RelationBuckets = {
    upsell: extractRelationIds(metadata, "upsellProducts"),
    crossSell: extractRelationIds(metadata, "crossSellProducts"),
    related: extractRelationIds(metadata, "relatedProducts"),
  };

  let imageUrl: string | undefined;
  if (typeof raw["imageUrl"] === "string" && raw["imageUrl"].trim()) {
    imageUrl = raw["imageUrl"].trim();
  } else if (Array.isArray(raw["images"]) && raw["images"].length > 0) {
    const first = raw["images"][0];
    if (typeof first === "string") imageUrl = first;
    else if (isRecord(first) && typeof first["url"] === "string") imageUrl = first["url"];
  }

  return {
    id: String(raw["id"] || ""),
    name: String(raw["name"] || "منتج بدون اسم"),
    sku: String(raw["sku"] || ""),
    price: Number.isFinite(rawPrice) ? rawPrice : null,
    isActive: raw["isActive"] !== false,
    categoryName: isRecord(raw["category"]) ? String(raw["category"]["name"] || "") : "",
    imageUrl,
    metadata,
    relations,
  };
};

export default function UpsellHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 1. Conversion Suite App State for toggling placements
  const conversionAppSlugs = useMemo<ManagedMarketplaceAppSlug[]>(
    () => ["conversion-suite"],
    [],
  );
  const {
    loading: conversionLoading,
    managedApps,
    handleToolToggle,
  } = useConversionTools(conversionAppSlugs);

  const conversionState = managedApps["conversion-suite"];
  const isConversionInstalled = Boolean(
    conversionState?.app && isAppOperational(conversionState.app),
  );

  const modulesSettings = useMemo(() => {
    if (!conversionState?.settings) return {};
    const modules = conversionState.settings["modules"];
    return isRecord(modules) ? modules : {};
  }, [conversionState]);

  const pdpCrossSellActive = Boolean(modulesSettings["crossSell"]);
  const pdpBoughtTogetherActive = Boolean(modulesSettings["boughtTogether"]);
  const pdpActive = pdpCrossSellActive || pdpBoughtTogetherActive;
  const cartUpsellActive = Boolean(modulesSettings["cartUpsell"] ?? modulesSettings["quickAdd"] ?? true);
  const postPurchaseActive = Boolean(modulesSettings["postPurchaseUpsell"] ?? true);

  // 2. Catalog Products
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "with_offers" | "without_offers">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // 3. Edit Relations Drawer / Modal State
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [activeTab, setActiveTab] = useState<ManagedRelationType>("upsell");
  const [editRelations, setEditRelations] = useState<RelationBuckets>({
    upsell: [],
    crossSell: [],
    related: [],
  });
  const [relationSearch, setRelationSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch Catalog
  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const response = await apiClient.get("/products?limit=500&status=all");
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setCatalog(list.map(normalizeProduct));
    } catch (error) {
      console.error("Failed to load catalog products:", error);
      tToast.error("فشل في تحميل قائمة المنتجات");
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set).sort();
  }, [catalog]);

  // KPIs
  const stats = useMemo(() => {
    const total = catalog.length;
    let withOffers = 0;
    let totalUpsells = 0;
    let totalCrossSells = 0;

    catalog.forEach((p) => {
      const hasAny =
        p.relations.upsell.length > 0 ||
        p.relations.crossSell.length > 0 ||
        p.relations.related.length > 0;
      if (hasAny) withOffers++;
      totalUpsells += p.relations.upsell.length;
      totalCrossSells += p.relations.crossSell.length;
    });

    const coverage = total > 0 ? Math.round((withOffers / total) * 100) : 0;
    let activePlacements = 0;
    if (pdpActive) activePlacements++;
    if (cartUpsellActive) activePlacements++;
    if (postPurchaseActive) activePlacements++;

    return {
      total,
      withOffers,
      coverage,
      totalUpsells,
      totalCrossSells,
      activePlacements,
    };
  }, [catalog, pdpActive, cartUpsellActive, postPurchaseActive]);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((product) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.categoryName.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (categoryFilter !== "all" && product.categoryName !== categoryFilter) {
        return false;
      }

      const hasOffers =
        product.relations.upsell.length > 0 ||
        product.relations.crossSell.length > 0 ||
        product.relations.related.length > 0;

      if (filterType === "with_offers") return hasOffers;
      if (filterType === "without_offers") return !hasOffers;

      return true;
    });
  }, [catalog, searchQuery, filterType, categoryFilter]);

  // Open Edit Modal
  const openEditModal = (product: CatalogProduct) => {
    setSelectedProduct(product);
    setEditRelations({
      upsell: [...product.relations.upsell],
      crossSell: [...product.relations.crossSell],
      related: [...product.relations.related],
    });
    setRelationSearch("");
    setActiveTab("upsell");
  };

  const closeEditModal = () => {
    setSelectedProduct(null);
    setRelationSearch("");
  };

  // Add / Remove from Active Relation
  const handleAddRelation = (targetId: string) => {
    if (!selectedProduct || targetId === selectedProduct.id) return;
    const currentList = editRelations[activeTab];
    if (currentList.includes(targetId)) return;

    setEditRelations((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], targetId],
    }));
  };

  const handleRemoveRelation = (targetId: string) => {
    setEditRelations((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((id) => id !== targetId),
    }));
  };

  const handleMoveRelation = (targetId: string, direction: "up" | "down") => {
    const list = [...editRelations[activeTab]];
    const index = list.indexOf(targetId);
    if (index === -1) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= list.length) return;

    const [item] = list.splice(index, 1);
    list.splice(nextIndex, 0, item);

    setEditRelations((prev) => ({
      ...prev,
      [activeTab]: list,
    }));
  };

  // Save Relations
  const handleSaveRelations = async () => {
    if (!selectedProduct) return;

    try {
      setSaving(true);
      const nextMetadata = {
        ...selectedProduct.metadata,
        upsellProducts: editRelations.upsell,
        crossSellProducts: editRelations.crossSell,
        relatedProducts: editRelations.related,
      };

      await apiClient.patch(`/products/${selectedProduct.id}`, {
        metadata: nextMetadata,
      });

      // Update local state
      setCatalog((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                metadata: nextMetadata,
                relations: { ...editRelations },
              }
            : p,
        ),
      );

      tToast.success("تم حفظ عروض وروابط المنتج بنجاح");
      closeEditModal();
    } catch (error) {
      console.error("Failed to save product relations:", error);
      tToast.error("حدث خطأ أثناء حفظ الروابط");
    } finally {
      setSaving(false);
    }
  };

  // Products available to add in modal
  const candidatesToAdd = useMemo(() => {
    if (!selectedProduct) return [];
    const currentIds = new Set(editRelations[activeTab]);
    const query = relationSearch.trim().toLowerCase();

    return catalog
      .filter((p) => p.id !== selectedProduct.id && !currentIds.has(p.id))
      .filter((p) => {
        if (!query) return true;
        return (
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.categoryName.toLowerCase().includes(query)
        );
      })
      .slice(0, 15);
  }, [catalog, selectedProduct, editRelations, activeTab, relationSearch]);

  // Catalog Map for lookup
  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    catalog.forEach((p) => map.set(p.id, p));
    return map;
  }, [catalog]);

  // Toggle Placement Modules
  const toggleModule = async (moduleKey: string, currentValue: boolean) => {
    const toolConfig = {
      key: moduleKey,
      label: moduleKey,
      description: "",
      appSlug: "conversion-suite" as ManagedMarketplaceAppSlug,
      readPaths: ["general.enabled", `modules.${moduleKey}`],
      writePathsOn: ["general.enabled", `modules.${moduleKey}`],
      writePathsOff: [`modules.${moduleKey}`],
    };
    await handleToolToggle(toolConfig, !currentValue);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 sm:p-6" dir={getDirection()}>
      {/* 1. Header & Navigation Hub */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-gray-900 sm:text-2xl dark:text-white">
                عروض الـ Upsell والـ Cross-sell
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                إدارة عروض الترقية والمكملات لزيادة متوسط قيمة الطلب (AOV) في متجرك.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={() => navigate("/tools/upsell-planner")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            مخطط الأرباح
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings/store/tools")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            أدوات التحويل
          </button>
          <a
            href="/shop"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Store className="h-4 w-4" />
            معاينة المتجر
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 2. KPI Metrics Highlights */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>مواضع الظهور</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {stats.activePlacements} / 3
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            صفحة المنتج، السلة، صفحة الشكر
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>تغطية المنتجات</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.coverage}%
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {stats.withOffers} من {stats.total} منتج بعروض
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>روابط الترقية (Upsell)</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {stats.totalUpsells}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            بدائل أعلى قيمة جاهزة
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>المكملات (Cross-sell)</span>
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {stats.totalCrossSells}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            مكملات السلة و Bought Together
          </p>
        </div>
      </div>

      {/* 3. Placements Switchboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 sm:text-base dark:text-white">
            مواضع ظهور العروض في المتجر (Placements)
          </h2>
          <span className="text-xs text-gray-500">
            تفعيل أو تعطيل مباشر بنقرة واحدة
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Touchpoint 1: Product Page */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <Package className="h-3 w-3" />
                  Product Page
                </span>
                <ToggleSwitch
                  label="تفعيل عروض صفحة المنتج"
                  checked={pdpCrossSellActive}
                  disabled={conversionLoading}
                  onToggle={() => void toggleModule("crossSell", pdpCrossSellActive)}
                />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                صفحة المنتج (Frequently Bought Together)
              </h3>
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                عرض منتجات تكميلية ومكملات ترفع القيمة مباشرة أسفل تفاصيل المنتج.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-[11px] font-bold text-gray-500 dark:border-gray-800">
              <span className={`h-2 w-2 rounded-full ${pdpCrossSellActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`} />
              {pdpCrossSellActive ? "يعمل على المتجر الآن" : "متوقف مؤقتاً"}
            </div>
          </div>

          {/* Touchpoint 2: Cart Drawer */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <ShoppingCart className="h-3 w-3" />
                  Cart Drawer
                </span>
                <ToggleSwitch
                  label="تفعيل مكملات السلة"
                  checked={cartUpsellActive}
                  disabled={conversionLoading}
                  onToggle={() => void toggleModule("cartUpsell", cartUpsellActive)}
                />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                سلة المشتريات (Cart Quick Add)
              </h3>
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                اقتراح مكملات سريعة بنقرة واحدة داخل السلة قبل التوجه للدفع.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-[11px] font-bold text-gray-500 dark:border-gray-800">
              <span className={`h-2 w-2 rounded-full ${cartUpsellActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`} />
              {cartUpsellActive ? "يعمل على المتجر الآن" : "متوقف مؤقتاً"}
            </div>
          </div>

          {/* Touchpoint 3: Thank You Page */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Zap className="h-3 w-3" />
                  Thank You Page
                </span>
                <ToggleSwitch
                  label="تفعيل عروض ما بعد الطلب"
                  checked={postPurchaseActive}
                  disabled={conversionLoading}
                  onToggle={() => void toggleModule("postPurchaseUpsell", postPurchaseActive)}
                />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                صفحة الشكر (Post-Purchase Upgrade)
              </h3>
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                عرض ترقية فوري مميز بعد إتمام الطلب بنقرة واحدة قبل التجهيز.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-[11px] font-bold text-gray-500 dark:border-gray-800">
              <span className={`h-2 w-2 rounded-full ${postPurchaseActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`} />
              {postPurchaseActive ? "يعمل على المتجر الآن" : "متوقف مؤقتاً"}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Smart Catalog Offers Table */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-black text-gray-900 sm:text-lg dark:text-white">
              إدارة عروض الكتالوج والمنتجات
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              اختر المنتج لربط بدائل الترقية والمكملات التلقائية أو المخصصة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500">
              {filteredCatalog.length} منتج
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، SKU أو الفئة..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-9 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
                filterType === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setFilterType("with_offers")}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
                filterType === "with_offers"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              به عروض ({stats.withOffers})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("without_offers")}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
                filterType === "without_offers"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              بدون عروض ({stats.total - stats.withOffers})
            </button>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">كل الفئات</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Catalog Table */}
        {catalogLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-xs font-bold text-gray-500">جاري تحميل كتالوج المنتجات...</p>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
            <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-bold text-gray-700 dark:text-gray-300">
              لا توجد منتجات مطابقة لخيارات البحث
            </p>
            <p className="mt-1 text-xs text-gray-400">
              جرّب تغيير كلمة البحث أو إعادة تعيين الفلتر.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
            {filteredCatalog.map((product) => {
              const upsellCount = product.relations.upsell.length;
              const crossSellCount = product.relations.crossSell.length;
              const relatedCount = product.relations.related.length;
              const hasAny = upsellCount > 0 || crossSellCount > 0 || relatedCount > 0;

              return (
                <div
                  key={product.id}
                  className="flex flex-col justify-between gap-3 p-3 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:p-4 dark:hover:bg-gray-800/50"
                >
                  {/* Product Info */}
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">
                          {product.name}
                        </h4>
                        {product.categoryName && (
                          <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 sm:inline-block dark:bg-gray-800 dark:text-gray-400">
                            {product.categoryName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {product.price !== null && (
                          <span className="font-bold text-gray-900 dark:text-gray-200">
                            {product.price.toLocaleString("en-US")} ج.م
                          </span>
                        )}
                        {product.sku && (
                          <span className="text-[11px] text-gray-400">
                            SKU: {product.sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Relations Badges & CTA */}
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {upsellCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <TrendingUp className="h-3 w-3" />
                          {upsellCount} ترقية
                        </span>
                      ) : null}

                      {crossSellCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          <ShoppingCart className="h-3 w-3" />
                          {crossSellCount} مكملات
                        </span>
                      ) : null}

                      {relatedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-black text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          <Tag className="h-3 w-3" />
                          {relatedCount} مشابه
                        </span>
                      ) : null}

                      {!hasAny && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                          لا توجد عروض مخصصة (تلقائي)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gray-100 px-3.5 py-2 text-xs font-bold text-gray-900 transition hover:bg-blue-600 hover:text-white dark:bg-gray-800 dark:text-white dark:hover:bg-blue-600"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      تخصيص العروض
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Modern Slide-over / Modal for Editing Relations */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          dir={getDirection()}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5 dark:border-gray-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    تخصيص عروض المنتج
                  </h3>
                </div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {selectedProduct.name} {selectedProduct.price ? `(${selectedProduct.price.toLocaleString("en-US")} ج.م)` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 px-4 dark:border-gray-800">
              {RELATION_TABS.map((tab) => {
                const count = editRelations[tab.id].length;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-black transition ${
                      isActive
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {/* Active Tab Explanation Banner */}
              {(() => {
                const currentTabMeta = RELATION_TABS.find((t) => t.id === activeTab)!;
                return (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs leading-5 text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-200">
                    <div className="flex items-center justify-between font-bold">
                      <span>{currentTabMeta.subtitle}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {currentTabMeta.placementBadge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-80">{currentTabMeta.helpText}</p>
                  </div>
                );
              })()}

              {/* Attached Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span>المنتجات المرتبطة حالياً ({editRelations[activeTab].length})</span>
                  <span className="text-[11px] text-gray-400">
                    يمكنك تغيير ترتيب الظهور بالأسهم
                  </span>
                </div>

                {editRelations[activeTab].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-800">
                    لم يتم ربط أي منتج في هذا القسم بعد. اختر من المنتجات المقترحة بالأسفل لإضافتها.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {editRelations[activeTab].map((id, index) => {
                      const item = catalogMap.get(id);
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs dark:border-gray-800 dark:bg-gray-800/60"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-black text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-black text-gray-900 dark:text-white">
                                {item?.name || `منتج #${id}`}
                              </p>
                              {item?.price !== null && item?.price !== undefined && (
                                <p className="text-[11px] text-gray-500">
                                  {item.price.toLocaleString("en-US")} ج.م
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveRelation(id, "up")}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                              title="تحريك لأعلى"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === editRelations[activeTab].length - 1}
                              onClick={() => handleMoveRelation(id, "down")}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                              title="تحريك لأسفل"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRelation(id)}
                              className="mr-1 rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="إزالة"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Relation Picker */}
              <div className="space-y-2 pt-3">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  إضافة منتجات جديدة للربط:
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={relationSearch}
                    onChange={(e) => setRelationSearch(e.target.value)}
                    placeholder="ابحث عن منتج من الكتالوج لإضافته..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-gray-100 p-1 dark:border-gray-800">
                  {candidatesToAdd.length === 0 ? (
                    <p className="p-3 text-center text-xs text-gray-400">
                      لا توجد منتجات إضافية مطابقة
                    </p>
                  ) : (
                    candidatesToAdd.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                            {candidate.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            {candidate.price !== null && (
                              <span>{candidate.price.toLocaleString("en-US")} ج.م</span>
                            )}
                            {candidate.categoryName && <span>• {candidate.categoryName}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddRelation(candidate.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300"
                        >
                          <Plus className="h-3 w-3" />
                          إضافة
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveRelations()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
