import React from "react";
import { ProductNewHeader } from "./components/product-new/ProductNewHeader";
import { ProductNewAlerts } from "./components/product-new/ProductNewAlerts";
import { ProductNewTabsNav } from "./components/product-new/ProductNewTabsNav";
import { ProductNewTabContent } from "./components/product-new/ProductNewTabContent";
import { ProductNewModals } from "./components/product-new/ProductNewModals";
import { useProductNewController } from "./components/product-new/useProductNewController";

export const ProductNewFinal: React.FC = () => {
  const {
    navigate,
    id,
    isEditMode,
    switchCompany,
    accessibleTargetCompany,
    t,
    isMerchant,
    canManageProductWorkflow,
    canSubmitProductReview,
    displayCurrency,
    storefrontOrigin,
    activeTab,
    setActiveTab,
    changeTab,
    productMetadata,
    setProductMetadata,
    workflow,
    isFetchingProduct,
    showVariants,
    setShowVariants,
    showConvertModal,
    setShowConvertModal,
    convertSuccess,
    setConvertSuccess,
    linkCopied,
    categories,
    setCategories,
    categoriesLoading,
    categoriesError,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    canEditInventoryStock,
    merchantStockControl,
    relatedProducts,
    setRelatedProducts,
    upsellProducts,
    setUpsellProducts,
    crossSellProducts,
    setCrossSellProducts,
    quantityOffers,
    setQuantityOffers,
    allProducts,
    isLoadingProducts,
    whatsappNotify,
    setWhatsappNotify,
    formData,
    setFormData,
    fieldErrors,
    handleInputChange,
    uploadedImages,
    uploading,
    handleImageChange,
    handleDragEnd,
    removeUploadedImage,
    variants,
    attributes,
    setAttributes,
    newAttributeName,
    setNewAttributeName,
    newAttributeValuesList,
    bulkAction,
    bulkValue,
    setBulkValue,
    showBulkInput,
    attributeMode,
    setAttributeMode,
    variantSettings,
    setVariantSettings,
    addVariant,
    updateVariant,
    removeVariant,
    uploadVariantImage,
    batchUpdateVariants,
    uploadImageForVariants,
    addAttribute,
    addValueField,
    updateValueField,
    removeValueField,
    removeAttribute,
    generateVariations,
    handleBulkActionChange,
    applyBulkAction,
    syncWithProductPricing,
    loading,
    error,
    setError,
    success,
    successMessage,
    effectiveProductId,
    presentations,
    presentationsLoading,
    fetchPresentations,
    addPresentation,
    updatePresentation,
    deletePresentation,
    convertToPresentation,
    resolvedShippingClassOptions,
    getInputClassName,
    handleDimensionChange,
    runWorkflowAction,
    handleSaveChanges,
    handlePreview,
    handleConverted,
    handleCopyConvertLink,
    tabs,
    workflowLabel,
    workflowColorClass,
  } = useProductNewController();

  if (isFetchingProduct && isEditMode) {
    return (
      <div className="flex justify-center items-center h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-sans" dir="rtl">
      <ProductNewHeader
        isEditMode={isEditMode}
        workflow={workflow}
        workflowLabel={workflowLabel}
        workflowColorClass={workflowColorClass}
        loading={loading}
        effectiveProductId={effectiveProductId || undefined}
        canSubmitProductReview={canSubmitProductReview}
        canManageProductWorkflow={canManageProductWorkflow}
        handleSaveChanges={handleSaveChanges}
        handlePreview={handlePreview}
        setShowConvertModal={setShowConvertModal}
        runWorkflowAction={runWorkflowAction}
        navigate={navigate}
        t={t}
      />

      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ProductNewAlerts
          error={error}
          success={success}
          successMessage={successMessage}
          convertSuccess={convertSuccess}
          accessibleTargetCompany={accessibleTargetCompany}
          fieldErrors={fieldErrors}
          linkCopied={linkCopied}
          switchCompany={switchCompany}
          setIsCategoryModalOpen={setIsCategoryModalOpen}
          setConvertSuccess={setConvertSuccess}
          handleCopyConvertLink={handleCopyConvertLink}
          t={t}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          <ProductNewTabsNav
            tabs={tabs}
            activeTab={activeTab}
            changeTab={changeTab}
            isEditMode={isEditMode}
            productId={id}
            showVariants={showVariants}
            fieldErrors={fieldErrors}
          />

          <ProductNewTabContent
            activeTab={activeTab}
            isMerchant={isMerchant}
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
            handleDimensionChange={handleDimensionChange}
            fieldErrors={fieldErrors}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            getInputClassName={getInputClassName}
            workflowLabel={workflowLabel}
            t={t}
            setIsCategoryModalOpen={setIsCategoryModalOpen}
            displayCurrency={displayCurrency}
            quantityOffers={quantityOffers}
            setQuantityOffers={setQuantityOffers}
            variants={variants}
            canEditInventoryStock={canEditInventoryStock}
            merchantStockControl={merchantStockControl}
            uploadedImages={uploadedImages}
            uploading={uploading}
            handleImageChange={handleImageChange}
            handleDragEnd={handleDragEnd}
            removeUploadedImage={removeUploadedImage}
            attributes={attributes}
            setAttributes={setAttributes}
            attributeMode={attributeMode}
            setAttributeMode={setAttributeMode}
            newAttributeName={newAttributeName}
            setNewAttributeName={setNewAttributeName}
            newAttributeValuesList={newAttributeValuesList}
            addValueField={addValueField}
            updateValueField={updateValueField}
            removeValueField={removeValueField}
            addAttribute={addAttribute}
            removeAttribute={removeAttribute}
            generateVariations={generateVariations}
            setActiveTab={setActiveTab}
            showVariants={showVariants}
            setShowVariants={setShowVariants}
            addVariant={addVariant}
            updateVariant={updateVariant}
            removeVariant={removeVariant}
            uploadVariantImage={uploadVariantImage}
            bulkAction={bulkAction}
            handleBulkActionChange={handleBulkActionChange}
            showBulkInput={showBulkInput}
            bulkValue={bulkValue}
            setBulkValue={setBulkValue}
            applyBulkAction={applyBulkAction}
            resolvedShippingClassOptions={resolvedShippingClassOptions}
            syncWithProductPricing={syncWithProductPricing}
            batchUpdateVariants={batchUpdateVariants}
            uploadImageForVariants={uploadImageForVariants}
            variantSettings={variantSettings}
            setVariantSettings={setVariantSettings}
            presentations={presentations}
            presentationsLoading={presentationsLoading}
            effectiveProductId={effectiveProductId || undefined}
            storefrontOrigin={storefrontOrigin}
            addPresentation={addPresentation}
            updatePresentation={updatePresentation}
            deletePresentation={deletePresentation}
            fetchPresentations={fetchPresentations}
            whatsappNotify={whatsappNotify}
            setWhatsappNotify={setWhatsappNotify}
            allProducts={allProducts}
            isLoadingProducts={isLoadingProducts}
            relatedProducts={relatedProducts}
            setRelatedProducts={setRelatedProducts}
            upsellProducts={upsellProducts}
            setUpsellProducts={setUpsellProducts}
            crossSellProducts={crossSellProducts}
            setCrossSellProducts={setCrossSellProducts}
            productMetadata={productMetadata}
            setProductMetadata={setProductMetadata}
          />
        </div>
      </div>

      <ProductNewModals
        showConvertModal={showConvertModal}
        effectiveProductId={effectiveProductId || undefined}
        displayCurrency={displayCurrency}
        setShowConvertModal={setShowConvertModal}
        convertToPresentation={convertToPresentation}
        handleConverted={handleConverted}
        isCategoryModalOpen={isCategoryModalOpen}
        setIsCategoryModalOpen={setIsCategoryModalOpen}
        setCategories={setCategories}
        setFormData={setFormData}
        setError={setError}
      />
    </div>
  );
};

export default ProductNewFinal;
