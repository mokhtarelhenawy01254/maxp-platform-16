import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type DentalWorkType,
  fetchWorkTypes,
  updateWorkType,
  deleteWorkType,
} from "../../shared";

export function useDentalWorkTypes() {
  const [rows, setRows] = useState<DentalWorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      setLoading(true);
      try {
        let data = await fetchWorkTypes();
        if (search.trim()) {
          const q = search.trim();
          data = data.filter(
            (w) =>
              w.name.includes(q) ||
              (w.category || "").includes(q) ||
              (w.materialBrand || "").includes(q)
          );
        }
        data = [...data].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        setRows(data);
        setError(null);
      } catch (e) {
        if (!quiet) {
          setError(e instanceof Error ? e.message : "حدث خطأ أثناء تحميل البيانات");
        }
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = useCallback(
    async (w: DentalWorkType) => {
      try {
        await updateWorkType(w.id, { isActive: !w.isActive });
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء التحديث");
      }
    },
    [load]
  );

  const remove = useCallback(
    async (w: DentalWorkType, confirmMsg: string, successMsg: string) => {
      if (removingId) return;
      if (!window.confirm(`${confirmMsg} (${w.name})`)) return;
      setRemovingId(w.id);
      try {
        await deleteWorkType(w.id);
        toast.success(successMsg);
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحذف");
      } finally {
        setRemovingId(null);
      }
    },
    [removingId, load]
  );

  return {
    rows,
    loading,
    error,
    setError,
    searchInput,
    setSearchInput,
    removingId,
    load,
    toggleActive,
    remove,
  };
}

export default useDentalWorkTypes;
