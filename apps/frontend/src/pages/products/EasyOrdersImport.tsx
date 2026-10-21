import React from "react";
import { EasyOrdersTabsNav } from "./components/easy-orders/EasyOrdersTabsNav";
import { EasyOrdersProductsTab } from "./components/easy-orders/EasyOrdersProductsTab";
import { EasyOrdersSettingsTab } from "./components/easy-orders/EasyOrdersSettingsTab";
import { useEasyOrdersController } from "./components/easy-orders/useEasyOrdersController";

export const EasyOrdersImport: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    apiKey,
    setApiKey,
    products,
    selectedProducts,
    loading,
    importing,
    syncing,
    searchTerm,
    setSearchTerm,
    syncLogs,
    settings,
    filteredProducts,
    saveSettings,
    fetchProducts,
    syncOrders,
    importProducts,
    toggleProduct,
    toggleAll,
    loadSyncLogs,
  } = useEasyOrdersController();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 font-sans" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        <EasyOrdersTabsNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "products" ? (
          <EasyOrdersProductsTab
            products={products}
            filteredProducts={filteredProducts}
            selectedProducts={selectedProducts}
            apiKey={apiKey}
            setApiKey={setApiKey}
            loading={loading}
            importing={importing}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fetchProducts={fetchProducts}
            importProducts={importProducts}
            toggleProduct={toggleProduct}
            toggleAll={toggleAll}
          />
        ) : (
          <EasyOrdersSettingsTab
            apiKey={apiKey}
            setApiKey={setApiKey}
            loading={loading}
            syncing={syncing}
            settings={settings}
            syncLogs={syncLogs}
            saveSettings={saveSettings}
            syncOrders={syncOrders}
            loadSyncLogs={loadSyncLogs}
          />
        )}
      </div>
    </div>
  );
};

export default EasyOrdersImport;
