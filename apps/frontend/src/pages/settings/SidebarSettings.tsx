import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  Save,
  Check,
  Sparkles,
  BarChart3,
  MessageSquare,
  Archive,
  ShoppingBag,
  Users,
  FileText,
  Box,
  TrendingUp,
  Megaphone,
  Store,
  Grid3x3,
  Bell,
  Building,
  Cog,
  Shield,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useSidebarSettings } from "../../contexts/SidebarSettingsContext";

export interface SidebarConfigItem {
  key: string;
  defaultLabelAr: string;
  defaultLabelEn: string;
  labelAr: string;
  labelEn: string;
  order: number;
  visible: boolean;
  locked: boolean;
  iconName: string;
}

const DEFAULT_SIDEBAR_ITEMS: SidebarConfigItem[] = [
  {
    key: "dashboard",
    defaultLabelAr: "لوحة التحكم",
    defaultLabelEn: "Dashboard",
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    order: 0,
    visible: true,
    locked: true,
    iconName: "BarChart3",
  },
  {
    key: "inbox",
    defaultLabelAr: "صندوق المحادثات",
    defaultLabelEn: "Inbox",
    labelAr: "صندوق المحادثات",
    labelEn: "Inbox",
    order: 1,
    visible: true,
    locked: false,
    iconName: "MessageSquare",
  },
  {
    key: "orders",
    defaultLabelAr: "الطلبات",
    defaultLabelEn: "Orders",
    labelAr: "الطلبات",
    labelEn: "Orders",
    order: 2,
    visible: true,
    locked: false,
    iconName: "Archive",
  },
  {
    key: "products",
    defaultLabelAr: "المنتجات",
    defaultLabelEn: "Products",
    labelAr: "المنتجات",
    labelEn: "Products",
    order: 3,
    visible: true,
    locked: false,
    iconName: "ShoppingBag",
  },
  {
    key: "customers",
    defaultLabelAr: "العملاء",
    defaultLabelEn: "Customers",
    labelAr: "العملاء",
    labelEn: "Customers",
    order: 4,
    visible: true,
    locked: false,
    iconName: "Users",
  },
  {
    key: "procurement",
    defaultLabelAr: "المشتريات",
    defaultLabelEn: "Procurement",
    labelAr: "المشتريات",
    labelEn: "Procurement",
    order: 5,
    visible: true,
    locked: false,
    iconName: "FileText",
  },
  {
    key: "inventory",
    defaultLabelAr: "المخزون",
    defaultLabelEn: "Inventory",
    labelAr: "المخزون",
    labelEn: "Inventory",
    order: 6,
    visible: true,
    locked: false,
    iconName: "Box",
  },
  {
    key: "analytics",
    defaultLabelAr: "التحليلات والتقارير",
    defaultLabelEn: "Analytics",
    labelAr: "التحليلات والتقارير",
    labelEn: "Analytics",
    order: 7,
    visible: true,
    locked: false,
    iconName: "TrendingUp",
  },
  {
    key: "marketing",
    defaultLabelAr: "التسويق والإعلانات",
    defaultLabelEn: "Marketing",
    labelAr: "التسويق والإعلانات",
    labelEn: "Marketing",
    order: 8,
    visible: true,
    locked: false,
    iconName: "Megaphone",
  },
  {
    key: "storefront",
    defaultLabelAr: "المتجر والتصميم",
    defaultLabelEn: "Storefront",
    labelAr: "المتجر والتصميم",
    labelEn: "Storefront",
    order: 9,
    visible: true,
    locked: false,
    iconName: "Store",
  },
  {
    key: "education",
    defaultLabelAr: "النظام التعليمي",
    defaultLabelEn: "Education System",
    labelAr: "النظام التعليمي",
    labelEn: "Education System",
    order: 10,
    visible: true,
    locked: false,
    iconName: "GraduationCap",
  },
  {
    key: "marketplace",
    defaultLabelAr: "متجر التطبيقات",
    defaultLabelEn: "App Marketplace",
    labelAr: "متجر التطبيقات",
    labelEn: "App Marketplace",
    order: 11,
    visible: true,
    locked: false,
    iconName: "Grid3x3",
  },
  {
    key: "notifications",
    defaultLabelAr: "الإشعارات",
    defaultLabelEn: "Notifications",
    labelAr: "الإشعارات",
    labelEn: "Notifications",
    order: 12,
    visible: true,
    locked: false,
    iconName: "Bell",
  },
  {
    key: "company",
    defaultLabelAr: "إدارة الشركة",
    defaultLabelEn: "Company Management",
    labelAr: "إدارة الشركة",
    labelEn: "Company Management",
    order: 13,
    visible: true,
    locked: false,
    iconName: "Building",
  },
  {
    key: "settings",
    defaultLabelAr: "الإعدادات",
    defaultLabelEn: "Settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    order: 14,
    visible: true,
    locked: true,
    iconName: "Cog",
  },
];

const renderItemIcon = (iconName: string) => {
  switch (iconName) {
    case "BarChart3":
      return <BarChart3 className="w-5 h-5" />;
    case "MessageSquare":
      return <MessageSquare className="w-5 h-5" />;
    case "Archive":
      return <Archive className="w-5 h-5" />;
    case "ShoppingBag":
      return <ShoppingBag className="w-5 h-5" />;
    case "Users":
      return <Users className="w-5 h-5" />;
    case "FileText":
      return <FileText className="w-5 h-5" />;
    case "Box":
      return <Box className="w-5 h-5" />;
    case "TrendingUp":
      return <TrendingUp className="w-5 h-5" />;
    case "Megaphone":
      return <Megaphone className="w-5 h-5" />;
    case "Store":
      return <Store className="w-5 h-5" />;
    case "GraduationCap":
      return <GraduationCap className="w-5 h-5" />;
    case "Grid3x3":
      return <Grid3x3 className="w-5 h-5" />;
    case "Bell":
      return <Bell className="w-5 h-5" />;
    case "Building":
      return <Building className="w-5 h-5" />;
    case "Cog":
      return <Cog className="w-5 h-5" />;
    default:
      return <Grid3x3 className="w-5 h-5" />;
  }
};

const SidebarSettings: React.FC = () => {
  const { refreshSettings } = useSidebarSettings();
  const [items, setItems] = useState<SidebarConfigItem[]>(DEFAULT_SIDEBAR_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewLang, setPreviewLang] = useState<"ar" | "en">("ar");

  // Load saved settings from backend
  const loadSidebarSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any>("/settings/sidebar");
      let savedList: any[] = [];
      if (res.data?.success && res.data?.data) {
        const raw = res.data.data.settings !== undefined ? res.data.data.settings : res.data.data;
        if (Array.isArray(raw)) {
          savedList = raw;
        } else if (raw && typeof raw === "object" && Array.isArray(raw.items)) {
          savedList = raw.items;
        }
      }

      if (savedList && savedList.length > 0) {
        const savedMap = new Map<string, any>();
        savedList.forEach((s) => {
          if (s && s.key) savedMap.set(String(s.key).trim().toLowerCase(), s);
        });

        const merged = DEFAULT_SIDEBAR_ITEMS.map((item, idx) => {
          const saved = savedMap.get(item.key.toLowerCase());
          if (!saved) return { ...item, order: idx };
          return {
            ...item,
            order: typeof saved.order === "number" ? saved.order : idx,
            visible: item.locked ? true : (saved.visible !== false),
            labelAr: saved.labelAr !== undefined && saved.labelAr !== null ? saved.labelAr : item.defaultLabelAr,
            labelEn: saved.labelEn !== undefined && saved.labelEn !== null ? saved.labelEn : item.defaultLabelEn,
          };
        }).sort((a, b) => a.order - b.order)
          .map((item, idx) => ({ ...item, order: idx }));

        setItems(merged);
      } else {
        setItems(DEFAULT_SIDEBAR_ITEMS);
      }
    } catch (error) {
      console.warn("Could not load sidebar settings:", error);
      setItems(DEFAULT_SIDEBAR_ITEMS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSidebarSettings();
  }, [loadSidebarSettings]);

  // Section 1: Reorder handlers
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Recalculate order indices
    const updated = newItems.map((item, idx) => ({ ...item, order: idx }));
    setItems(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      return;
    }

    const newItems = [...items];
    const [dragged] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, dragged);

    const updated = newItems.map((item, idx) => ({ ...item, order: idx }));
    setItems(updated);
    setDraggedIndex(null);
  };

  // Section 2: Visibility handlers
  const toggleVisibility = (key: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          if (item.locked) return item; // Cannot hide locked items
          return { ...item, visible: !item.visible };
        }
        return item;
      })
    );
  };

  // Section 3: Renaming handlers
  const handleRename = (key: string, field: "labelAr" | "labelEn", value: string) => {
    if (value.length > 60) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const resetItemLabel = (key: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          return {
            ...item,
            labelAr: item.defaultLabelAr,
            labelEn: item.defaultLabelEn,
          };
        }
        return item;
      })
    );
  };

  const resetAllToDefault = () => {
    setItems(DEFAULT_SIDEBAR_ITEMS);
    toast.success("تمت استعادة الإعدادات الافتراضية للقائمة");
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = items.map((item, idx) => ({
        key: item.key,
        order: idx,
        visible: item.locked ? true : item.visible,
        ...(item.labelAr ? { labelAr: item.labelAr.trim() } : {}),
        ...(item.labelEn ? { labelEn: item.labelEn.trim() } : {}),
      }));

      const res = await apiClient.put<any>("/settings/sidebar", payload);
      if (res.data?.success) {
        toast.success("تم حفظ إعدادات القائمة الجانبية بنجاح");
        if (refreshSettings) {
          refreshSettings();
        }
      } else {
        toast.error(res.data?.message || "فشل حفظ إعدادات القائمة الجانبية");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "حدث خطأ أثناء حفظ إعدادات القائمة الجانبية"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const visibleItemsCount = useMemo(() => items.filter((i) => i.visible).length, [items]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 dark:border-gray-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            إعدادات القائمة الجانبية
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            تخصيص ترتيب وظهور وأسماء عناصر القائمة الجانبية للنظام مع معاينة فورية
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetAllToDefault}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            استعادة الافتراضي
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">جاري تحميل إعدادات القائمة الجانبية...</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: 3 Customization Sections */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1: الترتيب */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    ترتيب عناصر القائمة الجانبية
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    اسحب العناصر لتغيير ترتيبها أو استخدم أزرار التحريك لأعلى ولأسفل
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.key}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      draggedIndex === index
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 opacity-60"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-750"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <span className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="text-indigo-600 dark:text-indigo-400">
                        {renderItemIcon(item.iconName)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {item.labelAr || item.defaultLabelAr}
                          {item.locked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                              <Lock className="w-3 h-3" />
                              مثبت
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {item.key}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="تحريك لأعلى"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="تحريك لأسفل"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: الإخفاء والإظهار */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    إخفاء وإظهار عناصر القائمة
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    حدد العناصر التي تظهر للمستخدمين. العناصر المحمية مؤمنة تلقائياً
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  {visibleItemsCount} من {items.length} ظاهر
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                      item.visible
                        ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        : "border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={item.visible ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}>
                        {renderItemIcon(item.iconName)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.labelAr || item.defaultLabelAr}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.labelEn || item.defaultLabelEn}
                        </div>
                      </div>
                    </div>

                    <div>
                      {item.locked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md">
                          <Lock className="w-3.5 h-3.5" />
                          محمي
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleVisibility(item.key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                            item.visible
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {item.visible ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              ظاهر
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              مخفي
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: الأسماء */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">
                      3
                    </span>
                    تخصيص الأسماء والمسميات
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    أعد تسمية العناصر بالعربية والإنجليزية لتناسب طبيعة عملك (الحد الأقصى 60 حرفاً)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {renderItemIcon(item.iconName)}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.defaultLabelAr}
                        </span>
                        <span className="text-xs text-gray-400">({item.key})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetItemLabel(item.key)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        استعادة الافتراضي
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          الاسم بالعربية (AR)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={item.labelAr}
                          placeholder={item.defaultLabelAr}
                          onChange={(e) => handleRename(item.key, "labelAr", e.target.value)}
                          className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div dir="ltr">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                          Name in English (EN)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={item.labelEn}
                          placeholder={item.defaultLabelEn}
                          onChange={(e) => handleRename(item.key, "labelEn", e.target.value)}
                          className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: المعاينة المباشرة (Live Preview) */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    المعاينة المباشرة
                  </h3>
                </div>

                <div className="flex items-center rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewLang("ar")}
                    className={`px-2 py-1 rounded-md font-medium transition-colors ${
                      previewLang === "ar"
                        ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLang("en")}
                    className={`px-2 py-1 rounded-md font-medium transition-colors ${
                      previewLang === "en"
                        ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div
                className="bg-gray-900 text-white rounded-lg p-3 shadow-inner space-y-1.5 max-h-[600px] overflow-y-auto"
                dir={previewLang === "ar" ? "rtl" : "ltr"}
              >
                <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>MaxPerformance Menu</span>
                </div>

                {items
                  .filter((item) => item.visible)
                  .map((item) => {
                    const label = previewLang === "ar" ? item.labelAr || item.defaultLabelAr : item.labelEn || item.defaultLabelEn;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 text-xs font-medium transition-colors cursor-default"
                      >
                        <span className="text-gray-400">
                          {renderItemIcon(item.iconName)}
                        </span>
                        <span className="truncate flex-1">{label}</span>
                        {item.locked && (
                          <Lock className="w-3 h-3 text-amber-400 opacity-60" />
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-500">
                  يظهر في القائمة {visibleItemsCount} عنصر بترتيبهم المخصص
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarSettings;
