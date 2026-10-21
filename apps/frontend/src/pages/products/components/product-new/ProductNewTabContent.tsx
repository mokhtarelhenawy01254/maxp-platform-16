import React from "react";
import { BasicTab } from "../tabs/BasicTab";
import { PricingTab } from "../tabs/PricingTab";
import { QuantityOffersTab } from "../tabs/QuantityOffersTab";
import { InventoryTab } from "../tabs/InventoryTab";
import { MediaTab } from "../tabs/MediaTab";
import { AttributesTab } from "../tabs/AttributesTab";
import { VariantsTab } from "../tabs/VariantsTab";
import { PresentationsTab } from "../tabs/PresentationsTab";
import { DisplayTab } from "../tabs/DisplayTab";
import { CommissionTab } from "../tabs/CommissionTab";
import { WhatsappTab } from "../tabs/WhatsappTab";
import { ShippingTab } from "../tabs/ShippingTab";
import { SeoTab } from "../tabs/SeoTab";
import { AdvancedTab } from "../tabs/AdvancedTab";

interface ProductNewTabContentProps {
  activeTab: string;
  isMerchant: boolean;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleInputChange: (e: any) => void;
  handleDimensionChange: (e: any) => void;
  fieldErrors: any;
  categories: any[];
  categoriesLoading: boolean;
  categoriesError: any;
  getInputClassName: (field: string) => string;
  workflowLabel: string;
  t: (key: string) => string;
  setIsCategoryModalOpen: (open: boolean) => void;
  displayCurrency: string;
  quantityOffers: any[];
  setQuantityOffers: React.Dispatch<React.SetStateAction<any[]>>;
  variants: any[];
  canEditInventoryStock: boolean;
  merchantStockControl: any;
  uploadedImages: any[];
  uploading: boolean;
  handleImageChange: (e: any) => void;
  handleDragEnd: (e: any) => void;
  removeUploadedImage: (idx: number) => void;
  attributes: any[];
  setAttributes: React.Dispatch<React.SetStateAction<any[]>>;
  attributeMode: any;
  setAttributeMode: React.Dispatch<React.SetStateAction<any>>;
  newAttributeName: string;
  setNewAttributeName: (s: string) => void;
  newAttributeValuesList: string[];
  addValueField: () => void;
  updateValueField: (idx: number, val: string) => void;
  removeValueField: (idx: number) => void;
  addAttribute: () => void;
  removeAttribute: (id: string) => void;
  generateVariations: (sku: string) => void;
  setActiveTab: (tab: string) => void;
  showVariants: boolean;
  setShowVariants: (v: boolean) => void;
  addVariant: (variant?: any) => void;
  updateVariant: (idx: number, field: string, val: any) => void;
  removeVariant: (idx: number) => void;
  uploadVariantImage: (idx: number, file: File) => void;
  bulkAction: string;
  handleBulkActionChange: (action: string) => void;
  showBulkInput: boolean;
  bulkValue: string;
  setBulkValue: (val: string) => void;
  applyBulkAction: () => void;
  resolvedShippingClassOptions: any[];
  syncWithProductPricing: () => void;
  batchUpdateVariants: any;
  uploadImageForVariants: any;
  variantSettings: any;
  setVariantSettings: React.Dispatch<React.SetStateAction<any>>;
  presentations: any[];
  presentationsLoading: boolean;
  effectiveProductId?: string;
  storefrontOrigin?: string;
  addPresentation: any;
  updatePresentation: any;
  deletePresentation: any;
  fetchPresentations: any;
  whatsappNotify: boolean;
  setWhatsappNotify: React.Dispatch<React.SetStateAction<boolean>>;
  allProducts: any[];
  isLoadingProducts: boolean;
  relatedProducts: string[];
  setRelatedProducts: React.Dispatch<React.SetStateAction<string[]>>;
  upsellProducts: string[];
  setUpsellProducts: React.Dispatch<React.SetStateAction<string[]>>;
  crossSellProducts: string[];
  setCrossSellProducts: React.Dispatch<React.SetStateAction<string[]>>;
  productMetadata: any;
  setProductMetadata: React.Dispatch<React.SetStateAction<any>>;
}

export const ProductNewTabContent: React.FC<ProductNewTabContentProps> = ({
  activeTab,
  isMerchant,
  formData,
  setFormData,
  handleInputChange,
  handleDimensionChange,
  fieldErrors,
  categories,
  categoriesLoading,
  categoriesError,
  getInputClassName,
  workflowLabel,
  t,
  setIsCategoryModalOpen,
  displayCurrency,
  quantityOffers,
  setQuantityOffers,
  variants,
  canEditInventoryStock,
  merchantStockControl,
  uploadedImages,
  uploading,
  handleImageChange,
  handleDragEnd,
  removeUploadedImage,
  attributes,
  setAttributes,
  attributeMode,
  setAttributeMode,
  newAttributeName,
  setNewAttributeName,
  newAttributeValuesList,
  addValueField,
  updateValueField,
  removeValueField,
  addAttribute,
  removeAttribute,
  generateVariations,
  setActiveTab,
  showVariants,
  setShowVariants,
  addVariant,
  updateVariant,
  removeVariant,
  uploadVariantImage,
  bulkAction,
  handleBulkActionChange,
  showBulkInput,
  bulkValue,
  setBulkValue,
  applyBulkAction,
  resolvedShippingClassOptions,
  syncWithProductPricing,
  batchUpdateVariants,
  uploadImageForVariants,
  variantSettings,
  setVariantSettings,
  presentations,
  presentationsLoading,
  effectiveProductId,
  storefrontOrigin,
  addPresentation,
  updatePresentation,
  deletePresentation,
  fetchPresentations,
  whatsappNotify,
  setWhatsappNotify,
  allProducts,
  isLoadingProducts,
  relatedProducts,
  setRelatedProducts,
  upsellProducts,
  setUpsellProducts,
  crossSellProducts,
  setCrossSellProducts,
  productMetadata,
  setProductMetadata,
}) => {
  return (
    <div className="lg:col-span-3">
      {activeTab === "basic" && (
        <BasicTab
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          fieldErrors={fieldErrors}
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          getInputClassName={getInputClassName}
          workflowLabel={workflowLabel}
          t={t}
          onAddCategoryClick={() => setIsCategoryModalOpen(true)}
        />
      )}

      {activeTab === "pricing" && (
        <PricingTab
          formData={formData}
          handleInputChange={handleInputChange}
          fieldErrors={fieldErrors}
          displayCurrency={displayCurrency}
          getInputClassName={getInputClassName}
          t={t}
        />
      )}

      {activeTab === "quantity-offers" && (
        <QuantityOffersTab
          quantityOffers={quantityOffers}
          setQuantityOffers={setQuantityOffers}
          baseUnitPrice={formData.comparePrice || formData.price}
          currentUnitPrice={formData.price}
          displayCurrency={displayCurrency}
          hasVariants={variants.length > 0}
          productName={formData.name}
        />
      )}

      {activeTab === "inventory" && (
        <InventoryTab
          formData={formData}
          handleInputChange={handleInputChange}
          fieldErrors={fieldErrors}
          getInputClassName={getInputClassName}
          canEditStock={canEditInventoryStock}
          stockLocationLabel={merchantStockControl?.stockLocationLabel}
          t={t}
        />
      )}

      {activeTab === "media" && (
        <MediaTab
          formData={formData}
          setFormData={setFormData}
          uploadedImages={uploadedImages}
          uploading={uploading}
          handleImageChange={handleImageChange}
          handleDragEnd={handleDragEnd}
          removeUploadedImage={removeUploadedImage}
          t={t}
        />
      )}

      {activeTab === "attributes" && (
        <AttributesTab
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
          generateVariations={() => generateVariations(formData.sku)}
          setActiveTab={setActiveTab}
          t={t}
        />
      )}

      {activeTab === "variants" && (
        <VariantsTab
          variants={variants}
          showVariants={showVariants}
          setShowVariants={setShowVariants}
          addVariant={addVariant}
          updateVariant={updateVariant}
          removeVariant={removeVariant}
          handleVariantImageChange={(vIdx, e) => {
            if (e.target.files?.[0]) {
              uploadVariantImage(vIdx, e.target.files[0]);
            }
          }}
          bulkAction={bulkAction}
          handleBulkActionChange={handleBulkActionChange}
          showBulkInput={showBulkInput}
          bulkValue={bulkValue}
          setBulkValue={setBulkValue}
          applyBulkAction={applyBulkAction}
          displayCurrency={displayCurrency}
          shippingClassOptions={resolvedShippingClassOptions}
          defaultPricing={{
            price: formData.price,
            comparePrice: formData.comparePrice,
            cost: formData.cost,
          }}
          syncWithProductPricing={syncWithProductPricing}
          attributes={attributes}
          uploadedImages={uploadedImages}
          onBatchUpdateVariants={batchUpdateVariants}
          onUploadImageForVariants={uploadImageForVariants}
          variantSettings={variantSettings}
          setVariantSettings={setVariantSettings}
          t={t}
        />
      )}

      {activeTab === "presentations" && (
        <PresentationsTab
          presentations={presentations}
          loading={presentationsLoading}
          productId={effectiveProductId}
          productSlug={formData.slug}
          storefrontOrigin={storefrontOrigin}
          onAdd={addPresentation}
          onUpdate={updatePresentation}
          onDelete={deletePresentation}
          onRefresh={fetchPresentations}
        />
      )}

      {activeTab === "display" && (
        <DisplayTab
          attributes={attributes}
          variants={variants}
          variantSettings={variantSettings}
          setVariantSettings={setVariantSettings}
          setActiveTab={setActiveTab}
          uploadFiles={async (files) => {
            const { uploadFiles } = await import("../../../../utils/apiHelpers");
            return uploadFiles(files);
          }}
          t={t}
        />
      )}

      {!isMerchant && activeTab === "commission" && (
        <CommissionTab
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          displayCurrency={displayCurrency}
        />
      )}

      {!isMerchant && activeTab === "whatsapp" && (
        <WhatsappTab
          whatsappNotify={whatsappNotify}
          setWhatsappNotify={setWhatsappNotify}
        />
      )}

      {activeTab === "shipping" && (
        <ShippingTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleDimensionChange={handleDimensionChange}
          shippingClassOptions={resolvedShippingClassOptions}
          t={t}
        />
      )}

      {activeTab === "seo" && (
        <SeoTab
          formData={formData}
          handleInputChange={handleInputChange}
        />
      )}

      {activeTab === "advanced" && (
        <AdvancedTab
          formData={formData}
          handleInputChange={handleInputChange}
          setFormData={setFormData}
          shippingClassOptions={resolvedShippingClassOptions}
          t={t}
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
      )}
    </div>
  );
};

export default ProductNewTabContent;
