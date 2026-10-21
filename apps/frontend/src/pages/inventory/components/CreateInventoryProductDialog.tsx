import React from "react";
import {
  QuickAddProductModal,
  WarehouseOption,
} from "../../products/components/QuickAddProductModal";

export type { WarehouseOption };

export interface CreateInventoryProductDialogProps {
  open: boolean;
  warehouses: WarehouseOption[];
  defaultWarehouseId?: string;
  onClose: () => void;
  onCreated: (product: { id: string; name?: string }) => void;
}

export const CreateInventoryProductDialog: React.FC<CreateInventoryProductDialogProps> = ({
  open,
  warehouses,
  defaultWarehouseId,
  onClose,
  onCreated,
}) => {
  return (
    <QuickAddProductModal
      open={open}
      onClose={onClose}
      onSuccess={onCreated}
      warehouses={warehouses}
      defaultWarehouseId={defaultWarehouseId}
      showWarehouseSelect={true}
    />
  );
};

export default CreateInventoryProductDialog;
