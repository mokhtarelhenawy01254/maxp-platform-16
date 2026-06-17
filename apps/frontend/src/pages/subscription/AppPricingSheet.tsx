import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  Search,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Layers,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Plus, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  imageUrl?: string;
  pricingModel: string; // FREE, PAY_PER_USE, SUBSCRIPTION
  unitPrice?: number;
  unitName?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays: number;
  isActive: boolean;
  isInstalled?: boolean;
}

type SortField = "name" | "monthlyPrice" | "unitPrice" | "trialDays";
type SortOrder = "asc" | "desc" | null;

export default function AppPricingSheet() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  // State
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPricingModel, setSelectedPricingModel] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [viewMode, setViewMode] = useState<"sheet" | "grid">("sheet");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<MarketplaceApp> | null>(null);

  // Delete confirmation dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleOpenDialog = (app?: MarketplaceApp) => {
    if (app) {
      setEditingApp(app);
    } else {
      setEditingApp({
        name: "", nameEn: "", slug: "", category: "ECOMMERCE", description: "", imageUrl: "",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 0, yearlyPrice: 0, unitPrice: 0, unitName: "", trialDays: 14, isActive: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveApp = async () => {
    try {
      if (!editingApp?.name || !editingApp?.category || !editingApp?.pricingModel) {
        toast.error(t("subscription.fillRequiredFields", "الرجاء تعبئة الحقول المطلوبة"));
        return;
      }
      
      const newSlug = editingApp.slug || editingApp.name.toLowerCase().replace(/\s+/g, '-');
      if (slugExists(newSlug, editingApp.id)) {
        toast.error(t("subscription.slugExists", "Slug already exists, please choose another"));
        return;
      }
      const payload = {
        name: editingApp.name,
        slug: newSlug,
        category: editingApp.category,
        description: editingApp.description || "",
        nameEn: editingApp.nameEn || "",
        imageUrl: editingApp.imageUrl || "",
        pricingModel: editingApp.pricingModel,
        monthlyPrice: Number(editingApp.monthlyPrice) || 0,
        yearlyPrice: Number(editingApp.yearlyPrice) || 0,
        unitPrice: Number(editingApp.unitPrice) || 0,
        unitName: editingApp.unitName || "",
        trialDays: Number(editingApp.trialDays) || 0,
        isActive: editingApp.isActive ?? true,
      };

      if (editingApp.id) {
        await apiClient.put(`/super-admin/marketplace-management/apps/${editingApp.id}`, payload);
        toast.success(t("subscription.appUpdated", "تم تحديث التطبيق بنجاح"));
      } else {
        await apiClient.post(`/super-admin/marketplace-management/apps`, payload);
        toast.success(t("subscription.appAdded", "تمت إضافة التطبيق بنجاح"));
      }
      setIsDialogOpen(false);
      
      // reload the data
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: MarketplaceApp[] }>("/marketplace/apps", { params: { limit: 500 } });
      if (response.data?.success) setApps(response.data.data);
      setLoading(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("subscription.appSaveError", "حدث خطأ أثناء الحفظ"));
    }
  };

  const handleDeleteApp = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteApp = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiClient.delete(`/super-admin/marketplace-management/apps/${deleteConfirmId}`);
      toast.success(t("subscription.appDeleted", "تم حذف التطبيق بنجاح"));
      setApps(prev => prev.filter(a => a.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("subscription.appDeleteError", "حدث خطأ أثناء الحذف"));
    }
  };

  const handleToggleActive = async (app: MarketplaceApp) => {
    try {
      const newStatus = !app.isActive;
      // Optimistic update
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, isActive: newStatus } : a));
      const payload = { isActive: newStatus };
      await apiClient.put(`/super-admin/marketplace-management/apps/${app.id}`, payload);
      toast.success(t("subscription.appUpdated", "تم تحديث التطبيق بنجاح"));
    } catch (err: any) {
      // Revert on error
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, isActive: app.isActive } : a));
      toast.error(err.response?.data?.message || t("subscription.appSaveError", "حدث خطأ أثناء الحفظ"));
    }
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(t("common.copied", "تم النسخ بنجاح"));
  };


  // Fetch all apps
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        // Request limit 100 to fetch all apps
        const response = await apiClient.get<{ success: boolean; data: MarketplaceApp[] }>(
          "/marketplace/apps",
          { params: { limit: 500 } }
        );
        if (response.data?.success) {
          setApps(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching apps pricing:", error);
        toast.error(t("subscription.appsPricingError"));
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [i18n.language, t]);

  // Extract all unique categories
  const categories = useMemo(() => {
    const cats = new Set(apps.map((app) => app.category));
    return Array.from(cats);
  }, [apps]);

  // Calculate high-level KPIs
  const stats = useMemo(() => {
    const total = apps.length;
    const installed = apps.filter((app) => app.isInstalled).length;
    const withTrial = apps.filter((app) => app.trialDays > 0).length;
    const paidApps = apps.filter((app) => app.pricingModel === "SUBSCRIPTION" && app.monthlyPrice);
    const avgSubPrice =
      paidApps.length > 0
        ? Math.round(
            paidApps.reduce((acc, app) => acc + (app.monthlyPrice || 0), 0) / paidApps.length
          )
        : 0;

    return { total, installed, withTrial, avgSubPrice };
  }, [apps]);

  // Handle category name translation or mapping
  const getCategoryLabel = (cat: string) => {
    if (cat === "ALL") return t("subscription.all");
    const translated = t(`subscription.categories.${cat}`);
    return translated !== `subscription.categories.${cat}` ? translated : cat;
  };

  // Pricing model display helper
  const getPricingModelBadge = (model: string) => {
    switch (model) {
      case "FREE":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
            {t("subscription.free")}
          </Badge>
        );
      case "PAY_PER_USE":
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
            {t("subscription.payAsYouGo")}
          </Badge>
        );
      case "SUBSCRIPTION":
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900">
            {t("subscription.subscription")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{model}</Badge>;
    }
  };

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter & Sort Logic
  const processedApps = useMemo(() => {
    let result = [...apps];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          (app.nameEn && app.nameEn.toLowerCase().includes(q)) ||
          app.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      result = result.filter((app) => app.category === selectedCategory);
    }

    // Pricing Model filter
    if (selectedPricingModel !== "ALL") {
      result = result.filter((app) => app.pricingModel === selectedPricingModel);
    }

    // Sorting
    if (sortOrder && sortField) {
      result.sort((a, b) => {
        let valA: string | number = "";
        let valB: string | number = "";

        if (sortField === "name") {
          valA = i18n.language === "ar" ? a.name : a.nameEn || a.name;
          valB = i18n.language === "ar" ? b.name : b.nameEn || b.name;
        } else if (sortField === "monthlyPrice") {
          valA = a.pricingModel === "SUBSCRIPTION" ? a.monthlyPrice || 0 : a.pricingModel === "FREE" ? 0 : -1;
          valB = b.pricingModel === "SUBSCRIPTION" ? b.monthlyPrice || 0 : b.pricingModel === "FREE" ? 0 : -1;
        } else if (sortField === "unitPrice") {
          valA = a.unitPrice || 0;
          valB = b.unitPrice || 0;
        } else if (sortField === "trialDays") {
          valA = a.trialDays || 0;
          valB = b.trialDays || 0;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortOrder === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
    }

    return result;
  }, [apps, searchQuery, selectedCategory, selectedPricingModel, sortField, sortOrder, i18n.language]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedApps.length / pageSize));
  const paginatedApps = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedApps.slice(start, start + pageSize);
  }, [processedApps, page, pageSize]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, selectedCategory, selectedPricingModel]);

  const isFilterActive = searchQuery.trim() !== "" || selectedCategory !== "ALL" || selectedPricingModel !== "ALL";

  const slugExists = (slug: string, excludeId?: string) =>
    apps.some((a) => a.slug === slug && a.id !== excludeId);

  // Bulk selection
  const toggleSelectApp = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedApps.length && selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedApps.map((a) => a.id)));
    }
  };

  const handleBulkToggleActive = async (activate: boolean) => {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        apiClient.put(`/super-admin/marketplace-management/apps/${id}`, { isActive: activate })
      );
      await Promise.all(promises);
      setApps((prev) =>
        prev.map((a) => (selectedIds.has(a.id) ? { ...a, isActive: activate } : a))
      );
      setSelectedIds(new Set());
      toast.success(
        activate
          ? t("subscription.bulkActivated", "Selected apps activated successfully")
          : t("subscription.bulkDeactivated", "Selected apps deactivated successfully")
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.error", "An error occurred"));
    }
  };

  const handleBulkDelete = () => {
    setDeleteConfirmId("__bulk__");
  };

  const confirmBulkDelete = async () => {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        apiClient.delete(`/super-admin/marketplace-management/apps/${id}`)
      );
      await Promise.all(promises);
      setApps((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      toast.success(t("subscription.bulkDeleted", "Selected apps deleted successfully"));
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.error", "An error occurred"));
    }
  };

  // Export to CSV Functionality
  const exportToCSV = () => {
    try {
      const headers = [
        t("subscription.csvAppName"),
        t("subscription.csvCategory"),
        t("subscription.csvPricingModel"),
        t("subscription.csvMonthlySubPrice"),
        t("subscription.csvYearlySubPrice"),
        t("subscription.csvUsageUnitPrice"),
        t("subscription.csvFreeTrialDays"),
        t("subscription.csvInstallationStatus"),
        "Slug",
        "ID",
      ];

      const rows = processedApps.map((app) => [
        i18n.language === "ar" ? app.name : app.nameEn || app.name,
        getCategoryLabel(app.category),
        app.pricingModel === "FREE"
          ? t("subscription.free")
          : app.pricingModel === "PAY_PER_USE"
            ? t("subscription.payAsYouGo")
            : t("subscription.subscription"),
        app.pricingModel === "SUBSCRIPTION" ? `${app.monthlyPrice || 0} ${t("subscription.egp")}` : "0",
        app.pricingModel === "SUBSCRIPTION" && app.yearlyPrice ? `${app.yearlyPrice} ${t("subscription.egp")}` : "0",
        app.unitPrice ? `${app.unitPrice} ${t("subscription.egp")} / ${app.unitName ? t(`subscription.units.${app.unitName}`, app.unitName) : ""}` : "-",
        app.trialDays > 0 ? `${app.trialDays}` : "0",
        app.isInstalled ? t("subscription.installed") : t("subscription.notInstalled"),
        app.slug,
        app.id,
      ]);

      const csvContent =
        "\uFEFF" + // BOM UTF-8 representation for correct Arabic character display in Excel
        [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `maxp-apps-pricing-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("subscription.exportSuccess"));
    } catch (error) {
      toast.error(t("subscription.exportError"));
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400 dark:text-gray-500" />;
    if (sortOrder === "asc") return <ArrowUp size={14} className="text-indigo-600 dark:text-indigo-400" />;
    if (sortOrder === "desc") return <ArrowDown size={14} className="text-indigo-600 dark:text-indigo-400" />;
    return <ArrowUpDown size={14} className="text-gray-400 dark:text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight font-cairo">
                {t("subscription.pageTitle")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {t("subscription.pageDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2 font-semibold font-cairo border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:hover:bg-indigo-950/30"
                onClick={exportToCSV}
                disabled={loading || processedApps.length === 0}
              >
                <FileSpreadsheet size={18} />
                {t("subscription.exportToExcel")}
              </Button>
              {user?.role === "SUPER_ADMIN" && (
                <Button
                  className="flex items-center gap-2 font-semibold font-cairo bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus size={18} />
                  {t("subscription.addApp", "إضافة تطبيق")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* KPI Cards (Modernized with Glassmorphism & Gradients) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.01)] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative group transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-6">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase font-cairo">
                {t("subscription.totalApps")}
              </CardDescription>
              <CardTitle className="text-4xl font-black font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between mt-2">
                {loading ? <Skeleton className="h-10 w-20" /> : stats.total}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Package className="text-blue-600 dark:text-blue-400" size={24} strokeWidth={2.5} />
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.01)] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative group transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-6">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase font-cairo">
                {t("subscription.activatedApps")}
              </CardDescription>
              <CardTitle className="text-4xl font-black font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between mt-2">
                {loading ? <Skeleton className="h-10 w-20" /> : stats.installed}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={24} strokeWidth={2.5} />
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.01)] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative group transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-80 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-6">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase font-cairo">
                {t("subscription.avgSubFee")}
              </CardDescription>
              <CardTitle className="text-4xl font-black font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between mt-2">
                {loading ? (
                  <Skeleton className="h-10 w-28" />
                ) : (
                  <span className="flex items-baseline gap-1">
                    {stats.avgSubPrice} <span className="text-sm font-bold text-slate-400">{t("subscription.egpPerMonth")}</span>
                  </span>
                )}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <DollarSign className="text-indigo-600 dark:text-indigo-400" size={24} strokeWidth={2.5} />
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.01)] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative group transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-6">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase font-cairo">
                {t("subscription.freeTrialSupport")}
              </CardDescription>
              <CardTitle className="text-4xl font-black font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between mt-2">
                {loading ? <Skeleton className="h-10 w-20" /> : stats.withTrial}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <Clock className="text-amber-600 dark:text-amber-400" size={24} strokeWidth={2.5} />
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="border-none shadow-md bg-white dark:bg-slate-900 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full lg:w-96">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <Input
                  type="text"
                  placeholder={t("subscription.searchPlaceholder") as string}
                  className="pr-10 pl-4 border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-cairo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters dropdown & view selector */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Pricing Model Filter (Modern Tabs) */}
                <Tabs value={selectedPricingModel} onValueChange={setSelectedPricingModel} className="hidden lg:block">
                  <TabsList className="h-9">
                    <TabsTrigger value="ALL" className="font-cairo text-xs px-3">{t("subscription.all", "الكل")}</TabsTrigger>
                    <TabsTrigger value="FREE" className="font-cairo text-xs px-3">{t("subscription.free", "مجاني")}</TabsTrigger>
                    <TabsTrigger value="SUBSCRIPTION" className="font-cairo text-xs px-3">{t("subscription.subscription", "اشتراك")}</TabsTrigger>
                    <TabsTrigger value="PAY_PER_USE" className="font-cairo text-xs px-3">{t("subscription.payAsYouGo", "حسب الاستخدام")}</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Mobile Fallback for Pricing Model */}
                <div className="lg:hidden flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 font-cairo">
                    {t("subscription.pricingLabel")}
                  </span>
                  <select
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold font-cairo focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={selectedPricingModel}
                    onChange={(e) => setSelectedPricingModel(e.target.value)}
                  >
                    <option value="ALL">{t("subscription.all")}</option>
                    <option value="FREE">{t("subscription.free")}</option>
                    <option value="SUBSCRIPTION">{t("subscription.subscription")}</option>
                    <option value="PAY_PER_USE">{t("subscription.payAsYouGo")}</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 font-cairo">
                    {t("subscription.categoryLabel")}
                  </span>
                  <select
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold font-cairo focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="ALL">{t("subscription.allCategories")}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grid vs List View Selector */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 flex gap-0.5 bg-slate-100 dark:bg-slate-950 ml-auto lg:ml-0">
                  <Button
                    variant={viewMode === "sheet" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 font-cairo text-xs px-3"
                    onClick={() => setViewMode("sheet")}
                  >
                    {t("subscription.sheetView")}
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 font-cairo text-xs px-3"
                    onClick={() => setViewMode("grid")}
                  >
                    {t("subscription.cardView")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Filters Bar + Bulk Actions */}
        {!loading && isFilterActive && processedApps.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-cairo">
                {t("subscription.filteredResults", "Filtered results: {{count}}", { count: processedApps.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-indigo-600 dark:text-indigo-400 font-cairo text-xs h-7"
                onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); setSelectedPricingModel("ALL"); }}
              >
                {t("common.clearFilters", "Clear Filters")}
              </Button>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-cairo">
                  {t("subscription.selectedCount", "{{count}} selected", { count: selectedIds.size })}
                </span>
                <Button variant="outline" size="sm" className="h-8 text-xs font-cairo text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleBulkToggleActive(true)}>
                  {t("subscription.bulkActivate", "Activate All")}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-cairo text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleBulkToggleActive(false)}>
                  {t("subscription.bulkDeactivate", "Deactivate All")}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-cairo text-red-600 border-red-200 hover:bg-red-50" onClick={handleBulkDelete}>
                  {t("subscription.bulkDelete", "Delete Selected")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pricing Sheet Component */}
        {loading ? (
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
        ) : processedApps.length === 0 ? (
          <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-20 text-center border border-slate-200 dark:border-slate-800 border-dashed">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Search className="text-slate-400 dark:text-slate-500" size={32} />
            </div>
            <CardTitle className="text-2xl font-bold font-cairo mb-3 text-slate-800 dark:text-slate-200">
              {t("subscription.noResultsFound", "لا توجد نتائج")}
            </CardTitle>
            <CardDescription className="font-cairo text-base max-w-md mx-auto text-slate-500">
              {t("subscription.noResultsHint", "جرب تغيير كلمات البحث أو تعديل الفلاتر للوصول إلى التطبيق المطلوب.")}
            </CardDescription>
            <Button 
              variant="outline" 
              className="mt-6 font-cairo text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/30" 
              onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); setSelectedPricingModel("ALL"); }}
            >
              {t("common.clearFilters", "مسح الفلاتر")}
            </Button>
          </Card>
        ) : viewMode === "sheet" ? (
          /* Excel-like Table View */
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200/60 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-right border-collapse relative">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {/* Bulk Select All */}
                    <th className="px-4 py-4 w-10">
                      {user?.role === "SUPER_ADMIN" && (
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === paginatedApps.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      )}
                    </th>
                    <th
                      className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        {t("subscription.appName")}
                        {renderSortIcon("name")}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo">
                      {t("subscription.description")}
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo">
                      {t("subscription.pricingModel")}
                    </th>
                    <th
                      className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("monthlyPrice")}
                    >
                      <div className="flex items-center gap-1">
                        {t("subscription.subscriptionPrice")}
                        {renderSortIcon("monthlyPrice")}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo">
                      {t("subscription.yearlyPrice")}
                    </th>
                    <th
                      className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("unitPrice")}
                    >
                      <div className="flex items-center gap-1">
                        {t("subscription.usagePricing")}
                        {renderSortIcon("unitPrice")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleSort("trialDays")}
                    >
                      <div className="flex items-center gap-1">
                        {t("subscription.freeTrial")}
                        {renderSortIcon("trialDays")}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo">
                      {t("subscription.status")}
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo text-center">
                      {t("subscription.active", "مفعّل")}
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-cairo text-center">
                      {t("subscription.action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedApps.map((app, idx) => (
                    <tr
                      key={app.id}
                      className={`group hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors ${
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-900/40"
                      }`}
                    >
                      {/* Bulk Select */}
                      <td className="px-4 py-4">
                        {user?.role === "SUPER_ADMIN" && (
                          <Checkbox
                            checked={selectedIds.has(app.id)}
                            onCheckedChange={() => toggleSelectApp(app.id)}
                            aria-label={`Select ${app.name}`}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 font-cairo">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 flex-shrink-0">
                            <Layers size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-bold">{i18n.language === "ar" ? app.name : app.nameEn || app.name}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                              {getCategoryLabel(app.category)}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                                      onClick={(e) => copyToClipboard(app.slug, e)}
                                    >
                                      <Copy size={11} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {t("common.copySlug", "نسخ الـ Slug")}: {app.slug}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate font-cairo">
                        {app.description}
                      </td>
                      <td className="px-6 py-4 text-sm font-cairo">
                        {getPricingModelBadge(app.pricingModel)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 font-cairo">
                        {app.pricingModel === "SUBSCRIPTION" ? (
                          <span>
                            {app.monthlyPrice || 0} <span className="text-xs font-normal text-slate-400">{t("subscription.egpPerMonth")}</span>
                          </span>
                        ) : app.pricingModel === "FREE" ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{t("subscription.free")}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 font-cairo">
                        {app.pricingModel === "SUBSCRIPTION" && app.yearlyPrice ? (
                          <span>
                            {app.yearlyPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egpPerYear")}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-cairo">
                        {app.unitPrice ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>
                              {app.unitPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egp")}</span>
                            </span>
                            <span className="text-xs font-normal text-slate-400">/ {app.unitName ? t(`subscription.units.${app.unitName}`, app.unitName) : t("subscription.unit")}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-cairo">
                        {app.trialDays > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <Clock size={14} />
                            <span>
                              {app.trialDays} {t("subscription.days")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">
                            {t("subscription.none")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-cairo">
                        {app.isInstalled ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 w-fit">
                            <CheckCircle size={12} />
                            {t("subscription.installed")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-slate-400 dark:bg-slate-800 dark:text-slate-500 flex items-center gap-1 w-fit">
                            <XCircle size={12} />
                            {t("subscription.inactive")}
                          </Badge>
                        )}
                      </td>
                      {/* Quick Active Toggle Column */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Glowing Status Badge */}
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold font-cairo px-2 py-0.5 rounded-full ${
                            app.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              app.isActive
                                ? "bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.7)] animate-pulse"
                                : "bg-slate-400"
                            }`} />
                            {app.isActive ? t("subscription.active", "مفعّل") : t("subscription.disabled", "موقوف")}
                          </span>
                          {/* Quick Toggle Switch */}
                          {user?.role === "SUPER_ADMIN" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Switch
                                    checked={app.isActive}
                                    onCheckedChange={() => handleToggleActive(app)}
                                    className="data-[state=checked]:bg-emerald-500"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {app.isActive ? t("subscription.deactivate", "إيقاف التفعيل") : t("subscription.activate", "تفعيل")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                                  onClick={(e) => copyToClipboard(app.slug, e)}
                                >
                                  <Copy size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">{t("common.copySlug", "نسخ الـ Slug")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold font-cairo hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                            onClick={() => window.open(`/marketplace?app=${app.slug}`, '_blank')}
                          >
                            <span className="flex items-center gap-1.5">
                              {t("subscription.details")}
                              <ExternalLink size={12} />
                            </span>
                          </Button>
                          {user?.role === "SUPER_ADMIN" && (
                            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pl-2 ml-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); handleOpenDialog(app); }}>
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteApp(app.id); }}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedApps.map((app) => (
              <Card
                key={app.id}
                className="border-none shadow-md bg-white dark:bg-slate-900 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/30">
                          <Layers size={20} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold font-cairo text-slate-800 dark:text-slate-100">
                            {i18n.language === "ar" ? app.name : app.nameEn || app.name}
                          </CardTitle>
                          <CardDescription className="text-xs font-cairo">
                            {getCategoryLabel(app.category)}
                          </CardDescription>
                        </div>
                      </div>
                      {getPricingModelBadge(app.pricingModel)}
                    </div>
                  </CardHeader>

                  <CardContent className="py-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 font-cairo">
                      {app.description}
                    </p>

                    {/* Subscription & Usage details grid */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mb-1 font-cairo">
                          {t("subscription.subscriptionFee")}
                        </div>
                        <div className="text-sm font-bold font-cairo text-slate-800 dark:text-slate-200">
                          {app.pricingModel === "SUBSCRIPTION" ? (
                            <div className="flex flex-col">
                              <span>
                                {app.monthlyPrice || 0} <span className="text-xs font-normal text-slate-400">{t("subscription.egpPerMonth")}</span>
                              </span>
                              {app.yearlyPrice && (
                                <span>
                                  {app.yearlyPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egpPerYear")}</span>
                                </span>
                              )}
                            </div>
                          ) : app.pricingModel === "FREE" ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{t("subscription.free")}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mb-1 font-cairo">
                          {t("subscription.usagePricing")}
                        </div>
                        <div className="text-sm font-bold font-cairo text-slate-800 dark:text-slate-200">
                          {app.unitPrice ? (
                            <div className="flex flex-col">
                              <span>
                                {app.unitPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egp")}</span>
                              </span>
                              <span className="text-xs font-normal text-slate-400">/ {app.unitName ? t(`subscription.units.${app.unitName}`, app.unitName) : t("subscription.unit")}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                  {/* Top row: trial + active status + toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold font-cairo flex items-center gap-1.5">
                      {app.trialDays > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock size={12} />
                          {app.trialDays} {t("subscription.daysTrial")}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">
                          {t("subscription.noTrialPeriod")}
                        </span>
                      )}
                    </div>
                    {/* Glowing Active Badge + Quick Toggle */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold font-cairo px-2 py-0.5 rounded-full ${
                        app.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          app.isActive
                            ? "bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.7)] animate-pulse"
                            : "bg-slate-400"
                        }`} />
                        {app.isActive ? t("subscription.active", "مفعّل") : t("subscription.disabled", "موقوف")}
                      </span>
                      {user?.role === "SUPER_ADMIN" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch
                                checked={app.isActive}
                                onCheckedChange={() => handleToggleActive(app)}
                                className="data-[state=checked]:bg-emerald-500 h-5 w-9"
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-cairo">
                              {app.isActive ? t("subscription.deactivate", "إيقاف التفعيل") : t("subscription.activate", "تفعيل")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {app.isInstalled && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle size={14} />
                        {t("subscription.installed")}
                      </span>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50"
                              onClick={(e) => copyToClipboard(app.slug, e)}
                            >
                              <Copy size={13} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{app.slug}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-cairo text-xs h-8 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/20"
                        onClick={() => window.open(`/marketplace?app=${app.slug}`, '_blank')}
                      >
                        {t("subscription.manageApp")}
                      </Button>
                      {user?.role === "SUPER_ADMIN" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-50/50"
                            onClick={() => handleOpenDialog(app)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-50/50"
                            onClick={() => handleDeleteApp(app.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && processedApps.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-cairo">
                {t("subscription.showingResults", "Showing {{start}}-{{end}} of {{total}}", {
                  start: (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, processedApps.length),
                  total: processedApps.length,
                })}
              </span>
              <select
                className="text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 bg-white dark:bg-slate-950 font-cairo"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = startPage + i;
                if (p > totalPages) return null;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className={`h-8 min-w-[2rem] font-cairo text-xs ${p === page ? "bg-indigo-600" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Add/Edit App Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl font-cairo">
          <DialogHeader>
            <DialogTitle>{editingApp?.id ? t("subscription.editApp", "تعديل التطبيق") : t("subscription.addApp", "إضافة تطبيق")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("subscription.appName", "اسم التطبيق")}</Label>
              <Input
                value={editingApp?.name || ""}
                onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                placeholder="اسم التطبيق"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("subscription.appNameEn", "App Name (English)")}</Label>
              <Input
                value={editingApp?.nameEn || ""}
                onChange={(e) => setEditingApp({ ...editingApp, nameEn: e.target.value })}
                placeholder="App name (English)"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editingApp?.slug || ""}
                onChange={(e) => setEditingApp({ ...editingApp, slug: e.target.value })}
                placeholder="app-slug"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("subscription.description", "الوصف")}</Label>
              <Textarea
                value={editingApp?.description || ""}
                onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("subscription.imageUrl", "Image URL")}</Label>
              <Input
                value={editingApp?.imageUrl || ""}
                onChange={(e) => setEditingApp({ ...editingApp, imageUrl: e.target.value })}
                placeholder="https://example.com/app-icon.png"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("subscription.categoryLabel", "الفئة")}</Label>
              <Select
                value={editingApp?.category || "ECOMMERCE"}
                onValueChange={(val) => setEditingApp({ ...(editingApp ?? {}), category: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    "ECOMMERCE", "MARKETING", "ANALYTICS", "CRM", "AI",
                    "COMMUNICATION", "FINANCE", "GAMIFICATION", "HR",
                    "INTEGRATION", "PRODUCTIVITY", "THEME", "OTHER",
                  ].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("subscription.pricingModel", "نظام التسعير")}</Label>
              <Select
                value={editingApp?.pricingModel || "SUBSCRIPTION"}
                onValueChange={(val) => setEditingApp({ ...(editingApp ?? {}), pricingModel: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">مجاني (Free)</SelectItem>
                  <SelectItem value="SUBSCRIPTION">اشتراك (Subscription)</SelectItem>
                  <SelectItem value="PAY_PER_USE">حسب الاستخدام (Pay Per Use)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editingApp?.pricingModel === "SUBSCRIPTION" && (
              <>
                <div className="space-y-2">
                  <Label>{t("subscription.monthlyPrice", "السعر الشهري")}</Label>
                  <Input
                    type="number"
                    value={editingApp?.monthlyPrice || 0}
                    onChange={(e) => setEditingApp({ ...editingApp, monthlyPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("subscription.yearlyPrice", "السعر السنوي")}</Label>
                  <Input
                    type="number"
                    value={editingApp?.yearlyPrice || 0}
                    onChange={(e) => setEditingApp({ ...editingApp, yearlyPrice: Number(e.target.value) })}
                  />
                </div>
              </>
            )}

            {editingApp?.pricingModel === "PAY_PER_USE" && (
              <div className="space-y-2">
                <Label>{t("subscription.unitPrice", "سعر الوحدة")}</Label>
                <Input
                  type="number"
                  value={editingApp?.unitPrice || 0}
                  onChange={(e) => setEditingApp({ ...editingApp, unitPrice: Number(e.target.value) })}
                />
              </div>
            )}
            {editingApp?.pricingModel === "PAY_PER_USE" && (
              <div className="space-y-2">
                <Label>{t("subscription.unitName", "Unit Name")}</Label>
                <Select
                  value={editingApp?.unitName || ""}
                  onValueChange={(val) => setEditingApp({ ...(editingApp ?? {}), unitName: val })}
                >
                  <SelectTrigger><SelectValue placeholder={t("subscription.selectUnit", "Select Unit")} /></SelectTrigger>
                  <SelectContent>
                    {["message", "request", "order", "user", "session", "GB", "month"].map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`subscription.units.${u}`, u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("subscription.freeTrial", "أيام التجربة المجانية")}</Label>
              <Input
                type="number"
                value={editingApp?.trialDays || 0}
                onChange={(e) => setEditingApp({ ...editingApp, trialDays: Number(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2 flex items-center gap-2 pt-4">
              <Switch
                checked={editingApp?.isActive ?? true}
                onCheckedChange={(val) => setEditingApp({ ...editingApp, isActive: val })}
              />
              <Label>{t("subscription.activeStatus", "حالة التفعيل")}</Label>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveApp}>{t("common.save", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-md font-cairo">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              {t("subscription.confirmDeleteTitle", "Confirm Delete")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 dark:text-slate-400">
              {deleteConfirmId === "__bulk__"
                ? t("subscription.confirmBulkDelete", "Are you sure you want to delete the selected apps?")
                : t("subscription.confirmDeleteApp", "Are you sure you want to delete this app?")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={deleteConfirmId === "__bulk__" ? confirmBulkDelete : confirmDeleteApp}
            >
              {t("common.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
