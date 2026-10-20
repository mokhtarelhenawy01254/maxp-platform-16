import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  DentalLabCase,
  DentalLabDoctor,
  DentalTechnician,
  DentalWorkType,
} from "../../shared";
import {
  fetchCases,
  fetchDoctors,
  fetchTechnicians,
  fetchWorkTypes,
} from "../../shared";
import { useDentalCasesBulk } from "./useDentalCasesBulk";
import { useDentalCaseActions } from "./useDentalCaseActions";

export function useDentalCases() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary list state
  const [cases, setCases] = useState<DentalLabCase[] | null>(null);
  const [total, setTotal] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters state with URL SearchParams support
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [doctorId, setDoctorId] = useState(() => searchParams.get("doctorId") || "");
  const [workTypeId, setWorkTypeId] = useState(() => searchParams.get("workTypeId") || "");
  const [priority, setPriority] = useState(() => searchParams.get("priority") || "");
  const [paymentStatus, setPaymentStatus] = useState(() => searchParams.get("paymentStatus") || "");
  const [technicianId, setTechnicianId] = useState(() => searchParams.get("technicianId") || "");
  const [dateRangePreset, setDateRangePreset] = useState(() => {
    const dr = searchParams.get("dateRange");
    if (dr) return dr;
    if (searchParams.get("filter") === "received_today") return "received_today";
    return "ALL";
  });
  const [agendaDate, setAgendaDate] = useState(() => searchParams.get("date") || "");
  const [agendaField, setAgendaField] = useState<"receivedDate" | "dueDate">(() => {
    return (searchParams.get("dateField") as "dueDate") || "receivedDate";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [viewMode, setViewMode] = useState<"ACTIVE" | "OVERDUE" | "TRASH">(() => {
    const tabParam = (searchParams.get("tab") || "").toUpperCase();
    if (tabParam === "OVERDUE" || searchParams.get("overdue") === "true") return "OVERDUE";
    if (tabParam === "TRASH" || searchParams.get("trash") === "true") return "TRASH";
    return "ACTIVE";
  });

  const [layoutMode, setLayoutMode] = useState<"TABLE" | "KANBAN">(() => {
    return (searchParams.get("layout") || "").toUpperCase() === "KANBAN" ? "KANBAN" : "TABLE";
  });

  // Reference data
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);

  // Dialogs & drawers
  const [createOpen, setCreateOpen] = useState(false);
  const [kioskOpen, setKioskOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<DentalLabCase | null>(null);
  const [advanceCaseData, setAdvanceCaseData] = useState<DentalLabCase | null>(null);
  const [assignCaseData, setAssignCaseData] = useState<DentalLabCase | null>(null);
  const [invoiceCase, setInvoiceCase] = useState<DentalLabCase | null>(null);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  // Inspector Drawer
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const selectedCase =
    cases?.find((c) => c.id === selectedCaseId) ||
    (selectedCaseId && editingCase?.id === selectedCaseId ? editingCase : null);

  // URL searchParams two-way filter sync helper
  const applyFilter = useCallback(
    (key: string, value: string, resetOthers = false) => {
      setSearchParams((prev) => {
        if (resetOthers) {
          const next = new URLSearchParams();
          if (value) next.set(key, value);
          const currentLayout = prev.get("layout");
          if (currentLayout) next.set("layout", currentLayout);
          return next;
        }
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      const currentLayout = prev.get("layout");
      if (currentLayout) next.set("layout", currentLayout);
      return next;
    });
    setStatus("");
    setDoctorId("");
    setWorkTypeId("");
    setPriority("");
    setPaymentStatus("");
    setTechnicianId("");
    setDateRangePreset("ALL");
    setAgendaDate("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  }, [setSearchParams]);

  // Sync state with URL params
  useEffect(() => {
    const tabParam = (searchParams.get("tab") || "").toUpperCase();
    if (tabParam === "OVERDUE" || searchParams.get("overdue") === "true") {
      setViewMode("OVERDUE");
    } else if (tabParam === "TRASH" || searchParams.get("trash") === "true") {
      setViewMode("TRASH");
    } else {
      setViewMode("ACTIVE");
    }
    const layoutParam = (searchParams.get("layout") || "").toUpperCase();
    if (layoutParam === "KANBAN") {
      setLayoutMode("KANBAN");
    } else if (layoutParam === "TABLE") {
      setLayoutMode("TABLE");
    }
    setStatus(searchParams.get("status") || "");
    setDoctorId(searchParams.get("doctorId") || "");
    setWorkTypeId(searchParams.get("workTypeId") || "");
    setPriority(searchParams.get("priority") || "");
    setPaymentStatus(searchParams.get("paymentStatus") || "");
    setTechnicianId(searchParams.get("technicianId") || "");
    const dr = searchParams.get("dateRange");
    if (dr) {
      setDateRangePreset(dr);
    } else if (searchParams.get("filter") === "received_today") {
      setDateRangePreset("received_today");
    } else {
      setDateRangePreset("ALL");
    }
    setAgendaDate(searchParams.get("date") || "");
    setAgendaField(
      (searchParams.get("dateField") as "dueDate") || "receivedDate"
    );
    const q = searchParams.get("search") || "";
    setSearch(q);
    setSearchInput(q);
  }, [searchParams]);

  const loadRefs = useCallback(async () => {
    try {
      const [docs, wts, techs] = await Promise.all([
        fetchDoctors().catch(() => []),
        fetchWorkTypes().catch(() => []),
        fetchTechnicians().catch(() => []),
      ]);
      setDoctors(docs);
      setWorkTypes(wts);
      setTechnicians(techs);
    } catch {
      // Non-critical reference load error
    }
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const params: Record<string, unknown> = {
          page,
          pageSize,
        };
        if (viewMode === "TRASH") {
          params.trash = "true";
        } else if (viewMode === "OVERDUE") {
          params.overdue = "true";
        }
        if (status) params.status = status;
        if (doctorId) params.doctorId = doctorId;
        if (workTypeId) params.workTypeId = workTypeId;
        if (priority) params.priority = priority;
        if (paymentStatus) params.paymentStatus = paymentStatus;
        if (technicianId) params.technicianId = technicianId;
        if (search) params.search = search;
        if (agendaDate) {
          params[agendaField === "dueDate" ? "dueDate" : "date"] = agendaDate;
        } else if (dateRangePreset && dateRangePreset !== "ALL") {
          params.dateRange = dateRangePreset;
        }

        const res = await fetchCases(params as never);
        setCases(res.data);
        setTotal(res.total);
        if (typeof res.trashCount === "number") {
          setTrashCount(res.trashCount);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("dentalLab.common.noData"));
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [
      agendaDate,
      agendaField,
      dateRangePreset,
      doctorId,
      page,
      paymentStatus,
      priority,
      search,
      status,
      technicianId,
      viewMode,
      workTypeId,
      pageSize,
      t,
    ]
  );

  useEffect(() => {
    const t2 = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t2);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    loadRefs();
    refresh().finally(() => setLoading(false));
  }, [refresh, loadRefs]);

  // Compose bulk operations
  const bulk = useDentalCasesBulk({ cases, doctors, refresh });

  // Compose individual case actions
  const actions = useDentalCaseActions({
    cases,
    refresh,
    setCreateOpen,
    setEditingCase,
  });

  const activeFiltersCount = [
    Boolean(status),
    Boolean(doctorId),
    Boolean(workTypeId),
    Boolean(priority),
    Boolean(paymentStatus),
    Boolean(technicianId),
    Boolean(agendaDate) || dateRangePreset !== "ALL",
    Boolean(searchInput.trim()),
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    cases,
    total,
    trashCount,
    loading,
    status,
    setStatus,
    doctorId,
    setDoctorId,
    workTypeId,
    setWorkTypeId,
    priority,
    setPriority,
    paymentStatus,
    setPaymentStatus,
    technicianId,
    setTechnicianId,
    dateRangePreset,
    setDateRangePreset,
    agendaDate,
    setAgendaDate,
    agendaField,
    setAgendaField,
    search,
    setSearch,
    searchInput,
    setSearchInput,
    page,
    setPage,
    viewMode,
    setViewMode,
    layoutMode,
    setLayoutMode,
    pageSize,
    totalPages,
    doctors,
    workTypes,
    technicians,
    createOpen,
    setCreateOpen,
    kioskOpen,
    setKioskOpen,
    editingCase,
    setEditingCase,
    advanceCaseData,
    setAdvanceCaseData,
    assignCaseData,
    setAssignCaseData,
    invoiceCase,
    setInvoiceCase,
    quickOrderOpen,
    setQuickOrderOpen,
    selectedCaseId,
    setSelectedCaseId,
    inspectorOpen,
    setInspectorOpen,
    selectedCase,
    activeFiltersCount,
    applyFilter,
    clearAllFilters,
    refresh,
    // Delegated from bulk
    selectedCaseIds: bulk.selectedCaseIds,
    setSelectedCaseIds: bulk.setSelectedCaseIds,
    bulkBusy: bulk.bulkBusy,
    bulkStatusTarget: bulk.bulkStatusTarget,
    setBulkStatusTarget: bulk.setBulkStatusTarget,
    bulkTechTarget: bulk.bulkTechTarget,
    setBulkTechTarget: bulk.setBulkTechTarget,
    bulkPriorityTarget: bulk.bulkPriorityTarget,
    setBulkPriorityTarget: bulk.setBulkPriorityTarget,
    bulkDoctorTarget: bulk.bulkDoctorTarget,
    setBulkDoctorTarget: bulk.setBulkDoctorTarget,
    toggleSelect: bulk.toggleSelect,
    toggleSelectAllPage: bulk.toggleSelectAllPage,
    handleBulkAdvance: bulk.handleBulkAdvance,
    handleBulkAssign: bulk.handleBulkAssign,
    handleBulkPriority: bulk.handleBulkPriority,
    handleBulkTrash: bulk.handleBulkTrash,
    handleBulkRestore: bulk.handleBulkRestore,
    handleBulkTransferDoctor: bulk.handleBulkTransferDoctor,
    // Delegated from actions
    actionBusyId: actions.actionBusyId,
    uploadingId: actions.uploadingId,
    handleExportCasesExcel: actions.handleExportCasesExcel,
    handleSaved: actions.handleSaved,
    handleTrashCase: actions.handleTrashCase,
    handleRestoreCase: actions.handleRestoreCase,
    handlePermanentDelete: actions.handlePermanentDelete,
    handleUpload: actions.handleUpload,
    handlePrintPanLabel: actions.handlePrintPanLabel,
    handlePrintWorkOrder: actions.handlePrintWorkOrder,
    isCaseOverdue: actions.isCaseOverdue,
    getDaysOverdue: actions.getDaysOverdue,
  };
}

export default useDentalCases;
