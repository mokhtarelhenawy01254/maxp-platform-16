import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
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

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
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
  const navigate = useNavigate();

  // State
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPricingModel, setSelectedPricingModel] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [viewMode, setViewMode] = useState<"sheet" | "grid">("sheet");

  // Fetch all apps
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        // Request limit 100 to fetch all apps
        const response = await apiClient.get<{ success: boolean; data: MarketplaceApp[] }>(
          "/marketplace/apps",
          { params: { limit: 100 } }
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
  }, [i18n.language]);

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
        let valA: any = "";
        let valB: any = "";

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

        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [apps, searchQuery, selectedCategory, selectedPricingModel, sortField, sortOrder, i18n.language]);

  // Export to CSV Functionality
  const exportToCSV = () => {
    try {
      const headers = [
        t("subscription.csvAppName"),
        t("subscription.csvCategory"),
        t("subscription.csvPricingModel"),
        t("subscription.csvMonthlySubPrice"),
        t("subscription.csvUsageUnitPrice"),
        t("subscription.csvFreeTrialDays"),
        t("subscription.csvInstallationStatus"),
      ];

      const rows = processedApps.map((app) => [
        i18n.language === "ar" ? app.name : app.nameEn || app.name,
        getCategoryLabel(app.category),
        app.pricingModel === "FREE"
          ? t("subscription.free")
          : app.pricingModel === "PAY_PER_USE"
            ? t("subscription.payAsYouGo")
            : t("subscription.subscription"),
        app.pricingModel === "SUBSCRIPTION" ? `${app.monthlyPrice} ${t("subscription.egp")}` : "0",
        app.unitPrice ? `${app.unitPrice} ${t("subscription.egp")} / ${app.unitName || ""}` : "-",
        app.trialDays > 0 ? `${app.trialDays}` : "0",
        app.isInstalled ? t("subscription.installed") : t("subscription.notInstalled"),
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                {t("subscription.totalApps")}
              </CardDescription>
              <CardTitle className="text-3xl font-bold font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between">
                {loading ? <Skeleton className="h-9 w-16" /> : stats.total}
                <Package className="text-blue-500/80" size={24} />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                {t("subscription.activatedApps")}
              </CardDescription>
              <CardTitle className="text-3xl font-bold font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between">
                {loading ? <Skeleton className="h-9 w-16" /> : stats.installed}
                <CheckCircle className="text-emerald-500/80" size={24} />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                {t("subscription.avgSubFee")}
              </CardDescription>
              <CardTitle className="text-3xl font-bold font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between">
                {loading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <span>
                    {stats.avgSubPrice} <span className="text-sm font-medium">{t("subscription.egpPerMonth")}</span>
                  </span>
                )}
                <DollarSign className="text-indigo-500/80" size={24} />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                {t("subscription.freeTrialSupport")}
              </CardDescription>
              <CardTitle className="text-3xl font-bold font-cairo text-slate-800 dark:text-slate-100 flex items-center justify-between">
                {loading ? <Skeleton className="h-9 w-16" /> : stats.withTrial}
                <Clock className="text-amber-500/80" size={24} />
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
                  placeholder={t("subscription.searchPlaceholder")}
                  className="pr-10 pl-4 border-slate-200 dark:border-slate-800 dark:bg-slate-950 font-cairo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters dropdown & view selector */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Pricing Model Filter */}
                <div className="flex items-center gap-2">
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
                    className="rounded-lg border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold font-cairo focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 py-16 text-center">
            <Package className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={64} />
            <CardTitle className="text-xl font-bold font-cairo mb-2 text-slate-800 dark:text-slate-200">
              {t("subscription.noResultsFound")}
            </CardTitle>
            <CardDescription className="font-cairo">
              {t("subscription.noResultsHint")}
            </CardDescription>
          </Card>
        ) : viewMode === "sheet" ? (
          /* Excel-like Table View */
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200/60 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
                      {t("subscription.action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {processedApps.map((app, idx) => (
                    <tr
                      key={app.id}
                      className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors ${
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-900/40"
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 font-cairo">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/30">
                            <Layers size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-bold">{i18n.language === "ar" ? app.name : app.nameEn || app.name}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {getCategoryLabel(app.category)}
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
                            {app.monthlyPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egpPerMonth")}</span>
                          </span>
                        ) : app.pricingModel === "FREE" ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{t("subscription.free")}</span>
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
                            <span className="text-xs font-normal text-slate-400">/ {app.unitName || t("subscription.unit")}</span>
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
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold font-cairo hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                          onClick={() => navigate(`/marketplace?app=${app.slug}`)}
                        >
                          <span className="flex items-center gap-1.5">
                            {t("subscription.details")}
                            <ExternalLink size={12} />
                          </span>
                        </Button>
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
            {processedApps.map((app) => (
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
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-100 dark:border-slate-850">
                      <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mb-1 font-cairo">
                          {t("subscription.subscriptionFee")}
                        </div>
                        <div className="text-sm font-bold font-cairo text-slate-800 dark:text-slate-200">
                          {app.pricingModel === "SUBSCRIPTION" ? (
                            <span>
                            {app.monthlyPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egpPerMonth")}</span>
                            </span>
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
                            <span>
                              {app.unitPrice} <span className="text-xs font-normal text-slate-400">{t("subscription.egp")}</span>
                              <span className="text-xs font-normal text-slate-400">/{app.unitName || t("subscription.unit")}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between mt-auto">
                  {/* Free Trial Indicators */}
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

                  {/* Actions & Status */}
                  <div className="flex items-center gap-3">
                    {app.isInstalled && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle size={14} />
                        {t("subscription.installed")}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-cairo text-xs h-8 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/20"
                      onClick={() => navigate(`/marketplace?app=${app.slug}`)}
                    >
                      {t("subscription.manageApp")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
