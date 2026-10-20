import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type DentalLabDoctor,
  fetchDoctorsFull,
  updateDoctor,
  deleteDoctor,
  restoreDoctor,
  permanentDeleteDoctor,
} from "../../shared";
import type { DoctorsViewMode, DoctorSummary } from "../types/doctorsTypes";

export function useDentalDoctors() {
  const [rows, setRows] = useState<DentalLabDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<DoctorsViewMode>("ACTIVE");
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      setLoading(true);
      try {
        const res = await fetchDoctorsFull({
          search: search.trim() || undefined,
          archived: viewMode === "ARCHIVED",
        });
        setRows(res.items);
        setActiveCount(res.activeCount);
        setArchivedCount(res.archivedCount);
        if (res.summary) setSummary(res.summary);
        setError(null);
      } catch (e) {
        if (!quiet) {
          setError(e instanceof Error ? e.message : "حدث خطأ أثناء تحميل البيانات");
        }
      } finally {
        setLoading(false);
      }
    },
    [search, viewMode]
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = useCallback(
    async (d: DentalLabDoctor) => {
      try {
        await updateDoctor(d.id, { isActive: !d.isActive });
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء التحديث");
      }
    },
    [load]
  );

  const remove = useCallback(
    async (d: DentalLabDoctor, confirmMsg: string, successMsg: string) => {
      if (removingId) return;
      if (!window.confirm(`${confirmMsg} (${d.name})`)) return;
      setRemovingId(d.id);
      try {
        const res = await deleteDoctor(d.id);
        toast.success(res.message || successMsg);
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحذف");
      } finally {
        setRemovingId(null);
      }
    },
    [removingId, load]
  );

  const handleRestore = useCallback(
    async (d: DentalLabDoctor) => {
      if (removingId) return;
      setRemovingId(d.id);
      try {
        await restoreDoctor(d.id);
        toast.success("تمت استعادة الطبيب إلى القائمة النشطة بنجاح");
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء الاستعادة");
      } finally {
        setRemovingId(null);
      }
    },
    [removingId, load]
  );

  const handlePermanentDelete = useCallback(
    async (d: DentalLabDoctor) => {
      if (removingId) return;
      if (
        !window.confirm(
          `تحذير: هل أنت متأكد من الحذف النهائي للطبيب (${d.name}) من قاعدة البيانات بالكامل؟`
        )
      ) {
        return;
      }
      setRemovingId(d.id);
      try {
        await permanentDeleteDoctor(d.id);
        toast.success("تم حذف الطبيب نهائياً من قاعدة البيانات");
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحذف النهائي");
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
    viewMode,
    setViewMode,
    activeCount,
    archivedCount,
    summary,
    removingId,
    load,
    toggleActive,
    remove,
    handleRestore,
    handlePermanentDelete,
  };
}

export default useDentalDoctors;
