import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Package,
  Store,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import SuperAdminPaymentSettings from "./SuperAdminPaymentSettings";
import AppPricingSheet from "../subscription/AppPricingSheet";
import type {
  MarketplaceAppsManagementProps,
  MarketplaceManagementItem,
} from "./marketplace/types/marketplaceAdminTypes";
import { useMarketplaceManagementData } from "./marketplace/hooks/useMarketplaceManagementData";
import { MarketplaceAppsTab } from "./marketplace/components/MarketplaceAppsTab";
import { BundlesAndPricingTab } from "./marketplace/components/BundlesAndPricingTab";
import { StorefrontThemesTab } from "./marketplace/components/StorefrontThemesTab";
import { MarketplaceItemDialog } from "./marketplace/components/MarketplaceItemDialog";

// Hide the global site header while the flat app editor is open
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    body.app-editor-open header { display: none !important; }
    body.app-editor-open .business-shell-header { display: none !important; }
    body.app-editor-open main.pt-16 { padding-top: 0 !important; }
  `;
  document.head.appendChild(styleEl);
}

export const MarketplaceAppsManagement: React.FC<MarketplaceAppsManagementProps> = ({
  initialTab = 1,
  storefrontThemesOnly = false,
  pageTitle = "إدارة تطبيقات وأدوات المتجر",
  pageDescription = "إدارة تطبيقات المتجر، حزم الأدوات، وقوالب الواجهة",
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [marketplaceDialog, setMarketplaceDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceManagementItem | null>(null);
  const [appsEditing, setAppsEditing] = useState(false);

  const {
    loading,
    error,
    apps,
    pricingRules,
    bundles,
    storefrontThemes,
    catalogDiff,
    catalogDiffLoading,
    catalogDiffError,
    confirmState,
    requestConfirm,
    closeConfirm,
    fetchAllData,
    fetchCatalogDiff,
    handleDelete,
    saveMarketplaceItem,
  } = useMarketplaceManagementData({ storefrontThemesOnly });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(Number(newValue));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-md bg-muted" />
          <div className="h-4 w-80 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-40 rounded-lg bg-muted" />
        <div className="h-56 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!appsEditing && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{pageDescription}</p>
        </div>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      {!storefrontThemesOnly && !appsEditing ? (
        <Tabs value={String(activeTab)} onValueChange={handleTabChange}>
          <TabsList
            variant="line"
            className="flex h-auto w-full flex-wrap justify-start gap-1 border-b border-border bg-transparent p-0"
          >
            <TabsTrigger
              value="1"
              className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary"
            >
              <ShoppingBag className="size-4 ml-1" />
              تطبيقات المتجر
            </TabsTrigger>
            <TabsTrigger
              value="2"
              className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary"
            >
              <Package className="size-4 ml-1" />
              حزم الأدوات والأسعار
            </TabsTrigger>
            <TabsTrigger
              value="4"
              className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary"
            >
              <Store className="size-4 ml-1" />
              قوالب المتجر
            </TabsTrigger>
            <TabsTrigger
              value="5"
              className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary"
            >
              <CreditCard className="size-4 ml-1" />
              إعدادات الدفع
            </TabsTrigger>
            <TabsTrigger
              value="6"
              className="h-9 rounded-t-lg border-b-2 border-transparent px-3 text-sm data-active:border-primary data-active:bg-transparent data-active:text-primary"
            >
              <DollarSign className="size-4 ml-1" />
              أسعار التطبيقات
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {!storefrontThemesOnly && activeTab === 1 && (
        <MarketplaceAppsTab
          apps={apps}
          catalogDiff={catalogDiff}
          catalogDiffLoading={catalogDiffLoading}
          catalogDiffError={catalogDiffError}
          onDelete={handleDelete}
          onRefresh={fetchAllData}
          onRefreshCatalogDiff={() => fetchCatalogDiff({ showToast: true })}
          saveItem={(item, data) => saveMarketplaceItem(item, data, 1)}
          onEditingChange={setAppsEditing}
        />
      )}

      {!storefrontThemesOnly && activeTab === 2 && (
        <BundlesAndPricingTab
          pricingRules={pricingRules}
          bundles={bundles}
          onEdit={(item) => {
            setEditingItem(item);
            setMarketplaceDialog(true);
          }}
          onDelete={handleDelete}
          onRefresh={fetchAllData}
        />
      )}

      {(storefrontThemesOnly || activeTab === 4) && (
        <StorefrontThemesTab
          themes={storefrontThemes}
          onRefresh={fetchAllData}
          onConfirm={requestConfirm}
        />
      )}

      {!storefrontThemesOnly && activeTab === 5 && <SuperAdminPaymentSettings />}

      {!storefrontThemesOnly && activeTab === 6 && <AppPricingSheet />}

      {/* Marketplace Item Dialog */}
      {marketplaceDialog && (
        <MarketplaceItemDialog
          open={marketplaceDialog}
          onClose={() => {
            setMarketplaceDialog(false);
            setEditingItem(null);
          }}
          item={editingItem}
          type={
            activeTab === 1
              ? "app"
              : editingItem?.feature
                ? "pricing"
                : "bundle"
          }
          availableApps={apps}
          onSave={async (itemData) => {
            if (await saveMarketplaceItem(editingItem, itemData, activeTab)) {
              setMarketplaceDialog(false);
              setEditingItem(null);
            }
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <Dialog open onOpenChange={(open) => { if (!open) closeConfirm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmState.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{confirmState.message}</p>
            <DialogFooter>
              <Button variant="outline" onClick={closeConfirm}>
                إلغاء
              </Button>
              <Button
                variant="default"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const action = confirmState.onConfirm;
                  closeConfirm();
                  void action();
                }}
              >
                {confirmState.confirmLabel || "تأكيد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MarketplaceAppsManagement;
