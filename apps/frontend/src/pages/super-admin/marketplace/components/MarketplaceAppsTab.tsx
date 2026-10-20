import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { buildApiUrl } from "../../../../utils/urlHelper";
import { tToast } from "../../../../utils/i18n-toast";
import {
  type MarketplaceManagementItem,
  type MarketplaceDialogFormData,
  type CatalogDiffPayload,
  getAuthHeaders,
} from "../types/marketplaceAdminTypes";
import { categoryLabels, getCategoryColor } from "../utils/marketplaceCategoryUtils";
import AppEditScreen from "./AppEditScreen";
import MarketplaceCatalogDiff from "./MarketplaceCatalogDiff";
import MarketplaceAppCard from "./MarketplaceAppCard";
import MarketplaceAppTable from "./MarketplaceAppTable";
import MarketplaceAppsToolbar, {
  type ViewMode,
  type StatusFilter,
} from "./MarketplaceAppsToolbar";

export interface MarketplaceAppsTabProps {
  apps: MarketplaceManagementItem[];
  catalogDiff: CatalogDiffPayload | null;
  catalogDiffLoading: boolean;
  catalogDiffError: string | null;
  onDelete: (id: string, typePath: "apps" | "pricing-rules" | "bundles") => void;
  onRefresh: () => Promise<void> | void;
  onRefreshCatalogDiff: () => void;
  saveItem: (
    item: MarketplaceManagementItem | null,
    data: MarketplaceDialogFormData,
  ) => Promise<boolean>;
  onEditingChange?: (editing: boolean) => void;
}

export const MarketplaceAppsTab: React.FC<MarketplaceAppsTabProps> = ({
  apps,
  catalogDiff,
  catalogDiffLoading,
  catalogDiffError,
  onDelete,
  onRefresh,
  onRefreshCatalogDiff,
  saveItem,
  onEditingChange,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState("installations");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("super_admin_apps_view_mode");
      if (
        saved === "grid" ||
        saved === "compact" ||
        saved === "table" ||
        saved === "grouped"
      ) {
        return saved;
      }
    }
    return "grid";
  });
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [showCatalogTools, setShowCatalogTools] = useState(false);
  const [editingApp, setEditingApp] = useState<{
    item: MarketplaceManagementItem | null;
  } | null>(null);

  const handleCopySlug = (slug?: string) => {
    if (!slug) return;
    navigator.clipboard.writeText(slug);
    toast.success(`تم نسخ المعرف: ${slug}`);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("super_admin_apps_view_mode", mode);
    }
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("installations");
  };

  useEffect(() => {
    const editing = !!editingApp;
    onEditingChange?.(editing);
    document.body.classList.toggle("app-editor-open", editing);
    return () => {
      document.body.classList.remove("app-editor-open");
      onEditingChange?.(false);
    };
  }, [editingApp, onEditingChange]);

  const categories = useMemo(
    () => [
      "ALL",
      ...new Set(
        apps
          .map((app) => app.category)
          .filter((category): category is string => Boolean(category)),
      ),
    ],
    [apps],
  );

  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let featured = 0;
    let paid = 0;
    let free = 0;
    for (const app of apps) {
      if (app.isActive) active++;
      else inactive++;
      if (app.isFeatured) featured++;
      const isPaid =
        (app.monthlyPrice || 0) > 0 ||
        (app.yearlyPrice || 0) > 0 ||
        app.pricingModel === "PAY_PER_USE";
      if (isPaid) paid++;
      else free++;
    }
    return {
      ALL: apps.length,
      ACTIVE: active,
      INACTIVE: inactive,
      FEATURED: featured,
      PAID: paid,
      FREE: free,
    };
  }, [apps]);

  const filteredApps = useMemo(() => {
    return apps
      .filter((app) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (app.name && app.name.toLowerCase().includes(q)) ||
          (app.slug && app.slug.toLowerCase().includes(q)) ||
          (app.description && app.description.toLowerCase().includes(q)) ||
          (app.category && app.category.toLowerCase().includes(q)) ||
          (app.mainRoute && app.mainRoute.toLowerCase().includes(q));

        const matchesCategory =
          categoryFilter === "ALL" || app.category === categoryFilter;

        let matchesStatus = true;
        if (statusFilter === "ACTIVE") matchesStatus = !!app.isActive;
        else if (statusFilter === "INACTIVE") matchesStatus = !app.isActive;
        else if (statusFilter === "FEATURED") matchesStatus = !!app.isFeatured;
        else if (statusFilter === "PAID") {
          matchesStatus =
            (app.monthlyPrice || 0) > 0 ||
            (app.yearlyPrice || 0) > 0 ||
            app.pricingModel === "PAY_PER_USE";
        } else if (statusFilter === "FREE") {
          matchesStatus =
            (app.monthlyPrice || 0) <= 0 &&
            (app.yearlyPrice || 0) <= 0 &&
            app.pricingModel !== "PAY_PER_USE";
        }

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price":
            return (b.monthlyPrice || 0) - (a.monthlyPrice || 0);
          case "rating":
            return (b.rating || 0) - (a.rating || 0);
          case "installations":
            return (
              (b._count?.installations || b.installCount || 0) -
              (a._count?.installations || a.installCount || 0)
            );
          case "name":
            return (a.name || "").localeCompare(b.name || "");
          default:
            return 0;
        }
      });
  }, [apps, searchQuery, categoryFilter, statusFilter, sortBy]);

  const appsByCategory = useMemo(() => {
    const groups: Record<string, MarketplaceManagementItem[]> = {};
    for (const app of filteredApps) {
      const cat = app.category || "OTHER";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(app);
    }
    return groups;
  }, [filteredApps]);

  const totalInstallations = useMemo(
    () =>
      apps.reduce(
        (sum, app) => sum + (app._count?.installations || app.installCount || 0),
        0,
      ),
    [apps],
  );

  const totalMonthlyRevenue = useMemo(
    () =>
      apps.reduce((sum, app) => {
        const price = app.monthlyPrice || 0;
        if (price <= 0) return sum;
        const installs = app._count?.installations || app.installCount || 0;
        return sum + installs * price;
      }, 0),
    [apps],
  );

  const activeApps = useMemo(() => apps.filter((app) => app.isActive).length, [apps]);
  const featuredApps = useMemo(() => apps.filter((app) => app.isFeatured).length, [apps]);

  const handleQuickToggle = async (
    app: MarketplaceManagementItem,
    field: "isActive" | "isPublic" | "isFeatured",
    value: boolean,
  ) => {
    try {
      await axios.put(
        buildApiUrl(`super-admin/marketplace-management/apps/${app.id}`),
        { [field]: value },
        { headers: getAuthHeaders() },
      );
      toast.success(
        `تم ${value ? "تفعيل" : "تعطيل"} ${
          field === "isActive" ? "التطبيق" : field === "isPublic" ? "الظهور" : "الميزة"
        } بنجاح`,
      );
      onRefresh();
    } catch {
      tToast.error("subscriptionCenter.msg_eb61");
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(
        buildApiUrl("super-admin/marketplace-management/export"),
        {
          headers: getAuthHeaders(),
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `marketplace-config-${new Date().toISOString().split("T")[0]}.json`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      tToast.success("subscriptionCenter.msg_9d6d");
    } catch (err) {
      console.error("Export error:", err);
      tToast.error("subscriptionCenter.msg_1144");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        buildApiUrl("super-admin/marketplace-management/import"),
        formData,
        {
          headers: getAuthHeaders({ "Content-Type": "multipart/form-data" }),
        },
      );
      tToast.success("subscriptionCenter.msg_c6b7");
      onRefresh();
    } catch (err) {
      console.error("Import error:", err);
      tToast.error("subscriptionCenter.msg_cc19");
    }
  };

  if (editingApp) {
    return (
      <AppEditScreen
        app={editingApp.item}
        onSave={saveItem}
        onClose={() => setEditingApp(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <MarketplaceAppsToolbar
        totalApps={apps.length}
        totalInstallations={totalInstallations}
        totalMonthlyRevenue={totalMonthlyRevenue}
        activeApps={activeApps}
        featuredApps={featuredApps}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        filteredAppsCount={filteredApps.length}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
        appsCountByCategory={(cat) =>
          cat === "ALL" ? apps.length : apps.filter((a) => a.category === cat).length
        }
        onResetFilters={handleResetFilters}
        onAddNewApp={() => setEditingApp({ item: null })}
        onExport={handleExport}
        onImport={handleImport}
        onToggleCatalogTools={() => setShowCatalogTools((prev) => !prev)}
      />

      {showCatalogTools && (
        <MarketplaceCatalogDiff
          catalogDiff={catalogDiff}
          catalogDiffLoading={catalogDiffLoading}
          catalogDiffError={catalogDiffError}
          onRefreshCatalogDiff={onRefreshCatalogDiff}
        />
      )}

      {/* Main Apps Views */}
      {filteredApps.length > 0 ? (
        <>
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app) => (
                <MarketplaceAppCard
                  key={app.id}
                  app={app}
                  compact={false}
                  isExpanded={expandedApp === app.id}
                  onToggleExpand={() =>
                    setExpandedApp((prev) => (prev === app.id ? null : (app.id ?? null)))
                  }
                  onCopySlug={handleCopySlug}
                  onEdit={(item) => setEditingApp({ item })}
                  onDelete={(id) => onDelete(id, "apps")}
                  onQuickToggle={handleQuickToggle}
                  onNavigateDetails={(id) => navigate(`/super-admin/apps/${id}`)}
                />
              ))}
            </div>
          )}

          {viewMode === "compact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredApps.map((app) => (
                <MarketplaceAppCard
                  key={app.id}
                  app={app}
                  compact={true}
                  onCopySlug={handleCopySlug}
                  onEdit={(item) => setEditingApp({ item })}
                  onDelete={(id) => onDelete(id, "apps")}
                  onQuickToggle={handleQuickToggle}
                  onNavigateDetails={(id) => navigate(`/super-admin/apps/${id}`)}
                />
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <MarketplaceAppTable
              apps={filteredApps}
              onNavigateDetails={(id) => navigate(`/super-admin/apps/${id}`)}
              onCopySlug={handleCopySlug}
              onEdit={(item) => setEditingApp({ item })}
              onDelete={(id) => onDelete(id, "apps")}
              onQuickToggle={handleQuickToggle}
            />
          )}

          {viewMode === "grouped" && (
            <div className="space-y-4">
              {Object.entries(appsByCategory).map(([catKey, catApps]) => {
                const isCollapsed = collapsedCategories[catKey];
                const catInstalls = catApps.reduce(
                  (sum, a) => sum + (a._count?.installations || a.installCount || 0),
                  0,
                );
                const catRevenue = catApps.reduce((sum, a) => {
                  const p = a.monthlyPrice || 0;
                  const inst = a._count?.installations || a.installCount || 0;
                  return sum + p * inst;
                }, 0);
                const catActiveCount = catApps.filter((a) => a.isActive).length;
                const catColor = getCategoryColor(catKey);

                return (
                  <div
                    key={catKey}
                    className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden"
                  >
                    <div
                      onClick={() => toggleCategoryCollapse(catKey)}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/40"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-1.5 rounded-full"
                          style={{ backgroundColor: catColor }}
                        />
                        <h3 className="font-bold text-base text-foreground">
                          {categoryLabels[catKey] || catKey}
                        </h3>
                        <Badge variant="secondary" className="text-xs font-semibold tabular-nums font-mono">
                          {catApps.length} تطبيق
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="hidden sm:flex items-center gap-3 text-muted-foreground">
                          <span>
                            نشط:{" "}
                            <strong className="text-foreground tabular-nums font-mono">
                              {catActiveCount}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            التثبيتات:{" "}
                            <strong className="text-foreground tabular-nums font-mono">
                              {catInstalls.toLocaleString("ar-EG")}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            الإيراد:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                              {catRevenue.toLocaleString("ar-EG")} ج.م
                            </strong>
                          </span>
                        </div>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {catApps.map((app) => (
                            <MarketplaceAppCard
                              key={app.id}
                              app={app}
                              compact={true}
                              onCopySlug={handleCopySlug}
                              onEdit={(item) => setEditingApp({ item })}
                              onDelete={(id) => onDelete(id, "apps")}
                              onQuickToggle={handleQuickToggle}
                              onNavigateDetails={(id) => navigate(`/super-admin/apps/${id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/60 text-card-foreground p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <Search className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground mt-3">
            لا توجد تطبيقات مطابقة للبحث أو الفلتر المختار
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            جرّب تعديل كلمات البحث، الفئة، أو خيارات التصفية السريعة
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="mt-3 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
            إعادة ضبط الفلاتر
          </Button>
        </div>
      )}
    </div>
  );
};

export default MarketplaceAppsTab;
