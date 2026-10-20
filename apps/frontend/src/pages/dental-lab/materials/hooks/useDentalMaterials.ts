import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDentalMaterial,
  createDentalSupplier,
  fetchDentalMaterials,
  fetchDentalMaterialsSummary,
  fetchDentalSuppliers,
  recordDentalMaterialStockIn,
  type DentalMaterial,
  type DentalMaterialsSummary,
  type DentalSupplier,
} from "../../shared";

export function useDentalMaterials() {
  const [materials, setMaterials] = useState<DentalMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<DentalSupplier[]>([]);
  const [summary, setSummary] = useState<DentalMaterialsSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isViewSuppliersModalOpen, setIsViewSuppliersModalOpen] = useState(false);
  const [selectedMaterialForStockIn, setSelectedMaterialForStockIn] =
    useState<DentalMaterial | null>(null);
  const [targetSupplierField, setTargetSupplierField] = useState<
    "newMat" | "stock" | null
  >(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [mats, supps, sum] = await Promise.all([
        fetchDentalMaterials(),
        fetchDentalSuppliers().catch(() => []),
        fetchDentalMaterialsSummary().catch(() => null),
      ]);
      setMaterials(mats);
      setSuppliers(supps);
      setSummary(sum);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "حدث خطأ في تحميل الخامات");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMaterials = useMemo(() => {
    if (selectedCategory === "ALL") return materials;
    return materials.filter((m) => m.category === selectedCategory);
  }, [materials, selectedCategory]);

  const handleCreateSupplier = async (data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    city?: string;
    notes?: string;
  }) => {
    setIsSubmittingSupplier(true);
    setActionError(null);
    try {
      const created = await createDentalSupplier(data);
      setSuppliers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setIsAddSupplierModalOpen(false);
      setTargetSupplierField(null);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "فشل إضافة المورد");
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleCreateMaterial = async (data: {
    name: string;
    category: any;
    brand?: string;
    supplierId?: string;
    supplierName?: string;
    defaultShade?: string;
    standardCapacity: number;
    costPerItem: number;
    minStockAlert: number;
  }) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await createDentalMaterial(data);
      setIsAddMaterialModalOpen(false);
      await loadData();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "فشل إنشاء الخامة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockIn = async (data: {
    materialId: string;
    lotNumber: string;
    shade?: string;
    thicknessMm?: number;
    initialUnits?: number;
    totalCost?: number;
    supplierId?: string;
    supplierName?: string;
    expiryDate?: string;
  }) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await recordDentalMaterialStockIn(data);
      setIsStockInModalOpen(false);
      setSelectedMaterialForStockIn(null);
      await loadData();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "فشل توريد رصيد الخامة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStockInFor = (material: DentalMaterial) => {
    setSelectedMaterialForStockIn(material);
    setIsStockInModalOpen(true);
  };

  return {
    materials,
    suppliers,
    summary,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    actionError,
    setActionError,
    filteredMaterials,
    isAddMaterialModalOpen,
    setIsAddMaterialModalOpen,
    isStockInModalOpen,
    setIsStockInModalOpen,
    isAddSupplierModalOpen,
    setIsAddSupplierModalOpen,
    isViewSuppliersModalOpen,
    setIsViewSuppliersModalOpen,
    selectedMaterialForStockIn,
    targetSupplierField,
    setTargetSupplierField,
    isSubmitting,
    isSubmittingSupplier,
    loadData,
    handleCreateSupplier,
    handleCreateMaterial,
    handleStockIn,
    openStockInFor,
  };
}

export default useDentalMaterials;
