import { useState, useCallback } from "react";
import { ProductFormData, FieldErrors } from "../types";

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  slug: "",
  price: 0,
  comparePrice: undefined,
  cost: undefined,
  sku: "",
  category: "",
  stock: 0,
  trackInventory: true,
  lowStockThreshold: 5,
  isActive: false,
  enableCheckoutForm: false,
  showAddToCartButton: true,
  saleStartDate: "",
  saleEndDate: "",
  sizeGuide: "",
  tags: [],
  weight: undefined,
  dimensions: undefined,
  isFeatured: false,
  isHidden: false,
  showFakeStock: false,
  featuredPriority: 0,
  shippingClass: "standard",
  excludeFromFreeShipping: false,
  affiliateCommission: 0,
  commissionType: "PERCENTAGE",
  allowAffiliateMarkup: false,
  affiliateVisibility: "ALL",
  affiliateVisibleAffiliateIds: [],
  mainImage: "",
  barcode: "",
  isPreOrder: false,
  preOrderDate: "",
  preOrderMessage: "",
  externalUrl: "",
  externalButtonLabel: "",
  externalVendor: "",
  externalDescription: "",
  externalOnly: false,
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
};

export const useProductForm = () => {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value, type } = e.target;
      let parsedValue: any = value;

      if (type === "checkbox") {
        parsedValue = (e.target as HTMLInputElement).checked;
      } else if (type === "number") {
        parsedValue = value === "" ? "" : parseFloat(value);
      }

      setFormData((prev) => ({
        ...prev,
        [name]: parsedValue,
      }));

      // Clear error for the field being edited
      if (fieldErrors[name as keyof FieldErrors]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name as keyof FieldErrors];
          return newErrors;
        });
      }
    },
    [fieldErrors]
  );

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setFieldErrors({});
  }, []);

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleInputChange,
    resetForm,
    initialFormData,
  };
};
