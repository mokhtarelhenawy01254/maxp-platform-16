import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  MyCase,
  nextStatusOf,
  advanceCase,
  uploadTechAttachment,
} from "../../../shared";
import {
  BenchFilterPriority,
  BenchViewMode,
  Active3DAttachment,
} from "../types/dentalTechBenchTypes";

interface UseBenchCasesOptions {
  cases: MyCase[];
  initialFilter?: BenchFilterPriority;
  onReload: () => Promise<void>;
  onStopTimer?: (caseId: string) => void;
}

export function useBenchCases({
  cases,
  initialFilter = "ALL",
  onReload,
  onStopTimer,
}: UseBenchCasesOptions) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<BenchFilterPriority>(initialFilter);
  const [viewMode, setViewMode] = useState<BenchViewMode>("CARDS");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modals state
  const [active3DAttachment, setActive3DAttachment] = useState<Active3DAttachment | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const isCaseOverdue = useCallback((c: MyCase) => {
    if (!c.dueDate || c.isDeleted || ["DELIVERED", "CLOSED"].includes(c.status)) return false;
    return new Date(c.dueDate) < new Date();
  }, []);

  const getOverdueDays = useCallback((c: MyCase) => {
    if (!c.dueDate) return 0;
    const diff = Date.now() - new Date(c.dueDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const safeCases = useMemo(() => (Array.isArray(cases) ? cases : []), [cases]);

  const overdueCasesList = useMemo(() => {
    return safeCases.filter(isCaseOverdue);
  }, [safeCases, isCaseOverdue]);

  const filteredCases = useMemo(() => {
    let list = [...safeCases];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.caseNumber || "").toLowerCase().includes(q) ||
          (c.patientName || "").toLowerCase().includes(q) ||
          (c.doctorName || "").toLowerCase().includes(q) ||
          (c.workTypeName || "").toLowerCase().includes(q) ||
          (c.shade || "").toLowerCase().includes(q)
      );
    }
    if (filterPriority === "OVERDUE") {
      list = list.filter(isCaseOverdue);
    } else if (filterPriority === "URGENT") {
      list = list.filter(
        (c) =>
          c.priority === "URGENT" ||
          c.priority === "RUSH" ||
          c.priority === "IMMEDIATE"
      );
    } else if (filterPriority === "SCAN") {
      list = list.filter(
        (c) => c.hasScan || (c.attachments && c.attachments.length > 0)
      );
    }

    return list.sort((a, b) => {
      const aOver = isCaseOverdue(a) ? 1 : 0;
      const bOver = isCaseOverdue(b) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      const aUrg = a.priority === "URGENT" ? 1 : 0;
      const bUrg = b.priority === "URGENT" ? 1 : 0;
      return bUrg - aUrg;
    });
  }, [safeCases, search, filterPriority, isCaseOverdue]);

  const handleAdvance = useCallback(
    async (c: MyCase) => {
      const next = nextStatusOf(c.status);
      if (!next) return;
      setBusyId(c.id);
      try {
        await advanceCase(c.id, next);
        toast.success(
          `تم إنهاء مرحلة [${c.workTypeName || c.caseNumber}] ونقلها للمرحلة التالية بنجاح`
        );
        if (onStopTimer) {
          onStopTimer(c.id);
        }
        await onReload();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "فشل في تحديث حالة الشغل"
        );
      } finally {
        setBusyId(null);
      }
    },
    [onReload, onStopTimer]
  );

  const handleUploadSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!uploadCaseId || !uploadFile) return;
      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("kind", "STAGE_OUTPUT");
        await uploadTechAttachment(uploadCaseId, formData);
        toast.success("تم رفع الملف بنجاح وإرفاقه بالحالة");
        setUploadCaseId(null);
        setUploadFile(null);
        await onReload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "فشل في رفع الملف");
      } finally {
        setUploadingFile(false);
      }
    },
    [uploadCaseId, uploadFile, onReload]
  );

  const openUploadModal = useCallback((caseId: string) => {
    setUploadCaseId(caseId);
    setUploadFile(null);
  }, []);

  const closeUploadModal = useCallback(() => {
    setUploadCaseId(null);
    setUploadFile(null);
  }, []);

  return {
    search,
    setSearch,
    filterPriority,
    setFilterPriority,
    viewMode,
    setViewMode,
    busyId,
    safeCases,
    overdueCasesList,
    filteredCases,
    isCaseOverdue,
    getOverdueDays,
    handleAdvance,
    // 3D modal
    active3DAttachment,
    setActive3DAttachment,
    // Upload modal
    uploadCaseId,
    uploadFile,
    setUploadFile,
    uploadingFile,
    handleUploadSubmit,
    openUploadModal,
    closeUploadModal,
  };
}
