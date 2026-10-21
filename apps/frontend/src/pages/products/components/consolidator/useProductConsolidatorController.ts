import { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "../../../../services/apiClient";
import type {
  DuplicateGroup,
  SelectedVariant,
} from "./types";

export function useProductConsolidatorController() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [originalsAction, setOriginalsAction] = useState("HIDE");
  const [variantEdits, setVariantEdits] = useState<Record<string, Partial<SelectedVariant>>>({});

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ message: string; productId: string | null } | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/products/consolidate/duplicates");
      if (res.data?.success) {
        const groupsData = res.data.data || [];
        setGroups(groupsData);
        if (groupsData.length > 0 && !selectedGroup) {
          setSelectedGroup(groupsData[0].name);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل في جلب المجموعات المكررة");
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeGroup = useMemo(
    () => groups.find((g) => g.name === selectedGroup) || null,
    [groups, selectedGroup],
  );

  const selectedItemsList = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.items.filter((item) => selectedItems[item.id]);
  }, [activeGroup, selectedItems]);

  const selectAllInGroup = () => {
    if (!activeGroup) return;
    const next: Record<string, boolean> = {};
    activeGroup.items.forEach((item) => {
      next[item.id] = true;
    });
    setSelectedItems(next);
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setVariantEdit = (id: string, patch: Partial<SelectedVariant>) => {
    setVariantEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const canExecute = Boolean(activeGroup && selectedItemsList.length >= 1 && newName.trim().length > 0);

  const handleExecute = async () => {
    if (!canExecute || !activeGroup) return;
    setError(null);
    setResult(null);
    setExecuting(true);
    try {
      const variantSelections = selectedItemsList.map((item) => {
        const edit = variantEdits[item.id] || {};
        return {
          productId: item.id,
          name: edit.name ?? item.name,
          sku: edit.sku ?? item.sku ?? "",
          price: edit.price !== undefined ? edit.price : item.price,
          stock: edit.stock !== undefined ? edit.stock : null,
          images: edit.images ?? item.images,
        };
      });
      const res = await apiClient.post("/products/consolidate", {
        name: newName.trim(),
        description: newDescription.trim() || null,
        sourceProductIds: selectedItemsList.map((item) => item.id),
        variantSelections,
        originalsAction,
        newSlug: newSlug.trim() || null,
      });
      if (res.data?.success) {
        setResult({
          message: res.data.message || "تم الدمج بنجاح",
          productId: res.data.data?.product?.id || null,
        });
        await loadGroups();
        setSelectedItems({});
        setNewName("");
        setNewDescription("");
        setNewSlug("");
        setVariantEdits({});
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تنفيذ الدمج");
    } finally {
      setExecuting(false);
    }
  };

  return {
    groups,
    loading,
    error,
    selectedGroup,
    setSelectedGroup,
    selectedItems,
    setSelectedItems,
    newName,
    setNewName,
    newDescription,
    setNewDescription,
    newSlug,
    setNewSlug,
    originalsAction,
    setOriginalsAction,
    variantEdits,
    setVariantEdits,
    executing,
    result,
    activeGroup,
    selectedItemsList,
    canExecute,
    loadGroups,
    selectAllInGroup,
    toggleItem,
    setVariantEdit,
    handleExecute,
  };
}
