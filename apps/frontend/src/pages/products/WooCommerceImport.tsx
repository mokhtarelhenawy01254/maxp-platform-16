import React from "react";
import { WooCommerceHeader } from "./components/woocommerce/WooCommerceHeader";
import { WooCommerceConnectionForm } from "./components/woocommerce/WooCommerceConnectionForm";
import { WooCommerceProductsGrid } from "./components/woocommerce/WooCommerceProductsGrid";
import { useWooCommerceImportController } from "./components/woocommerce/useWooCommerceImportController";

export const WooCommerceImport: React.FC = () => {
  const {
    storeUrl,
    setStoreUrl,
    consumerKey,
    setConsumerKey,
    consumerSecret,
    setConsumerSecret,
    products,
    selectedProducts,
    loading,
    importing,
    searchTerm,
    setSearchTerm,
    filteredProducts,
    fetchProducts,
    clearData,
    importProducts,
    toggleProduct,
    toggleAll,
  } = useWooCommerceImportController();

  return (
    <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground" dir="rtl">
      <WooCommerceHeader />

      {products.length === 0 && (
        <WooCommerceConnectionForm
          storeUrl={storeUrl}
          setStoreUrl={setStoreUrl}
          consumerKey={consumerKey}
          setConsumerKey={setConsumerKey}
          consumerSecret={consumerSecret}
          setConsumerSecret={setConsumerSecret}
          loading={loading}
          fetchProducts={fetchProducts}
        />
      )}

      {products.length > 0 && (
        <WooCommerceProductsGrid
          products={products}
          filteredProducts={filteredProducts}
          selectedProducts={selectedProducts}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          toggleProduct={toggleProduct}
          toggleAll={toggleAll}
          importProducts={importProducts}
          importing={importing}
          clearData={clearData}
        />
      )}
    </div>
  );
};

export default WooCommerceImport;
