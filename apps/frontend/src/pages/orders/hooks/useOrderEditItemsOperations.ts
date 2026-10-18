import { useCallback } from "react";
import { toast } from "sonner";

export interface UseOrderEditItemsOperationsParams {
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  setShowAddProductModal: (show: boolean) => void;
  t: (key: string, options?: any) => string;
}

export interface UseOrderEditItemsOperationsReturn {
  handleProductSelect: (product: any, variant?: any) => void;
  handleItemChange: (index: number, field: string, value: any) => void;
  handleRemoveItem: (index: number) => void;
}

export const useOrderEditItemsOperations = ({
  editForm,
  setEditForm,
  setShowAddProductModal,
  t,
}: UseOrderEditItemsOperationsParams): UseOrderEditItemsOperationsReturn => {
  const handleProductSelect = useCallback(
    (product: any, variant?: any) => {
      let productColor = "";
      let productSize = "";
      let actualPrice = product.price;
      let metadata: any = {};

      if (variant) {
        if (variant.color) productColor = variant.color;
        if (variant.size) productSize = variant.size;

        if (variant.price && parseFloat(variant.price) > 0) {
          actualPrice = parseFloat(variant.price);
        }

        if (variant.metadata) {
          try {
            const variantMeta =
              typeof variant.metadata === "string"
                ? JSON.parse(variant.metadata)
                : variant.metadata;

            metadata = variantMeta;

            if (variantMeta.attributes && Array.isArray(variantMeta.attributes)) {
              variantMeta.attributes.forEach((attr: any) => {
                if (attr.type === "color" && attr.option && !productColor) {
                  productColor = attr.option;
                }
                if (attr.type === "size" && attr.option && !productSize) {
                  productSize = attr.option;
                }
              });
            }

            const vAttrs =
              variantMeta.attributeValues ||
              (typeof variantMeta.attributes === "object" && !Array.isArray(variantMeta.attributes)
                ? variantMeta.attributes
                : null) ||
              variantMeta;
            if (vAttrs && typeof vAttrs === "object") {
              const c = vAttrs["اللون"] ?? vAttrs["لون"] ?? vAttrs["Color"] ?? vAttrs["color"];
              const s = vAttrs["المقاس"] ?? vAttrs["مقاس"] ?? vAttrs["Size"] ?? vAttrs["size"];
              if (c != null && !productColor) productColor = String(c);
              if (s != null && !productSize) productSize = String(s);
            }
          } catch (e) {
            console.error("Error parsing variant metadata:", e);
          }
        }

        if (variant.name && (!productColor || !productSize)) {
          const name = variant.name;

          if (
            variant.type === "color" &&
            !name.includes("-") &&
            !name.includes("|") &&
            !name.includes("/")
          ) {
            if (!productColor) productColor = name.trim();
          } else {
            const parts = name.split(/\s*[-–|\/]\s*/).filter((p: any) => p.trim());

            if (parts.length >= 2) {
              if (!productColor) productColor = parts[0].trim();
              if (!productSize) productSize = parts[parts.length - 1].trim();
            } else if (parts.length === 1) {
              const val = parts[0].trim();
              if (isNaN(parseFloat(val)) && !productColor) {
                productColor = val;
              } else if (!productSize) {
                productSize = val;
              }
            }
          }
        }
      }

      if (actualPrice <= 0) {
        toast.error(t("orderDetails.priceMustBeGreaterThanZero"));
        return;
      }

      const isDuplicate = editForm.items.some(
        (item: any) =>
          item.productId === product.id &&
          item.productColor === productColor &&
          item.productSize === productSize,
      );

      if (isDuplicate) {
        toast.error(t("orderDetails.productAlreadyExists"));
        return;
      }

      const getFirstImage = (imgData: any) => {
        if (!imgData) return "";
        if (Array.isArray(imgData)) return imgData[0];
        if (typeof imgData === "string") {
          if (imgData.startsWith("[")) {
            try {
              const parsed = JSON.parse(imgData);
              return Array.isArray(parsed) ? parsed[0] : parsed;
            } catch {
              return imgData;
            }
          }
          return imgData;
        }
        return "";
      };

      const productImage =
        getFirstImage(variant?.images) ||
        getFirstImage(variant?.image) ||
        getFirstImage(product.images) ||
        getFirstImage(product.image) ||
        "";

      const itemSku = variant?.sku || product.sku;

      const newItem = {
        productId: product.id,
        variantId: variant?.id || null,
        productName: product.name,
        price: actualPrice,
        quantity: 1,
        total: actualPrice,
        productColor,
        productSize: productSize != null ? String(productSize) : "",
        productImage,
        productSku: itemSku,
        metadata: {
          ...metadata,
          image: productImage,
          variantId: variant?.id || null,
          sku: itemSku,
          originalProductId: product.id,
        },
      };

      setEditForm((prev: any) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
      setShowAddProductModal(false);
    },
    [editForm.items, setEditForm, setShowAddProductModal, t],
  );

  const handleItemChange = useCallback(
    (index: number, field: string, value: any) => {
      setEditForm((prev: any) => {
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "price" || field === "quantity") {
          const price = parseFloat(newItems[index].price) || 0;
          const qty = parseInt(newItems[index].quantity) || 1;
          newItems[index].total = price * qty;
        }
        return { ...prev, items: newItems };
      });
    },
    [setEditForm],
  );

  const handleRemoveItem = useCallback(
    (index: number) => {
      setEditForm((prev: any) => {
        const newItems = [...prev.items];
        newItems.splice(index, 1);
        return { ...prev, items: newItems };
      });
    },
    [setEditForm],
  );

  return {
    handleProductSelect,
    handleItemChange,
    handleRemoveItem,
  };
};

export default useOrderEditItemsOperations;
