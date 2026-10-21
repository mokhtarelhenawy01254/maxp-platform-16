import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { broadcastService } from "../../../../services/broadcastService";
import { customerService } from "../../../../services/customerService";
import {
  CustomerList,
  CustomerListsStats,
  CriteriaType,
  ListMember,
  CRITERIA_TYPES,
  SMART_PRESETS,
} from "./types";
import {
  buildEmptyCriteria,
  buildPresetCriteria,
  criteriaSummary,
} from "./criteriaUtils";

export const PER_PAGE = 20;

export function useCustomerListsController() {
  const navigate = useNavigate();

  const [lists, setLists] = useState<CustomerList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom" | "default">("all");

  const [stats, setStats] = useState<CustomerListsStats>({
    totalLists: 0,
    totalMembers: 0,
    active24h: 0,
    newThisMonth: 0,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomerList | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCriteriaType, setFormCriteriaType] = useState<CriteriaType>("all");
  const [formCriteria, setFormCriteria] = useState<any>({ type: "all" });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<CustomerList | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailList, setDetailList] = useState<CustomerList | null>(null);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotal, setMembersTotal] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");

  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLists = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await broadcastService.getCustomerLists();
      const arr = Array.isArray(res) ? res : (res as any)?.data || [];
      setLists(arr);

      const custom = arr.filter((l: CustomerList) => !l.isDefault);
      const totalMembers = arr.reduce((s: number, l: CustomerList) => s + (l.count || 0), 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = custom.filter((l: CustomerList) => {
        const d = l.createdAt ? new Date(l.createdAt) : null;
        return d && d >= monthStart;
      }).length;

      const active24h = (arr.find((l: CustomerList) => l.id === "active-24h") as CustomerList | undefined)?.count || 0;

      setStats({
        totalLists: arr.length,
        totalMembers,
        active24h,
        newThisMonth,
      });
    } catch (err: any) {
      toast.error(err?.message || "فشل في تحميل قوائم العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const loadTags = useCallback(async () => {
    try {
      const res = await customerService.getDistinctTags();
      const tags = Array.isArray(res)
        ? res.map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean)
        : [];
      setAvailableTags(tags);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const filteredLists = useMemo(() => {
    let out = lists;
    if (filterType === "custom") out = out.filter((l) => !l.isDefault);
    if (filterType === "default") out = out.filter((l) => l.isDefault);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      out = out.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q) ||
          criteriaSummary(l.criteria).toLowerCase().includes(q),
      );
    }
    return out;
  }, [lists, filterType, searchTerm]);

  const openCreate = () => {
    setEditingList(null);
    setFormName("");
    setFormDescription("");
    setFormCriteriaType("all");
    setFormCriteria({ type: "all" });
    setPreviewCount(null);
    setDialogOpen(true);
  };

  const openEdit = (list: CustomerList) => {
    const c = typeof list.criteria === "string"
      ? (() => { try { return JSON.parse(list.criteria); } catch { return { type: "all" }; } })()
      : (list.criteria || { type: "all" });
    const isPreset = c.type === "preset" && SMART_PRESETS.some((p) => p.value === c.preset);
    const type = (c.type && CRITERIA_TYPES.some((t) => t.value === c.type) ? c.type : "all") as CriteriaType;
    setEditingList(list);
    setFormName(list.name);
    setFormDescription(list.description || "");
    setFormCriteriaType(type);
    setFormCriteria(isPreset ? { ...c, type: "preset" } : { ...c, type });
    setPreviewCount(null);
    setDialogOpen(true);
  };

  const changeCriteriaType = (type: string) => {
    const t = type as CriteriaType;
    const exclude = formCriteria.excludeContactedInDays;
    setFormCriteriaType(t);
    setFormCriteria({ ...buildEmptyCriteria(t), ...(exclude ? { excludeContactedInDays: exclude } : {}) });
    setPreviewCount(null);
  };

  const selectPreset = (presetValue: string) => {
    setFormCriteriaType("all");
    setFormCriteria(buildPresetCriteria(presetValue));
    setPreviewCount(null);
  };

  const updateCriteriaField = (key: string, value: any) => {
    setFormCriteria((prev: any) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!dialogOpen) return;
      setPreviewLoading(true);
      try {
        const res = await broadcastService.previewCustomerListCount(formCriteria);
        if (!cancelled) setPreviewCount(res?.data?.count ?? null);
      } catch {
        if (!cancelled) setPreviewCount(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [formCriteria, dialogOpen]);

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("اسم القائمة مطلوب");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        criteria: formCriteria,
      };
      if (editingList) {
        await broadcastService.updateCustomerList(editingList.id, payload);
        toast.success("تم تحديث القائمة بنجاح");
      } else {
        await broadcastService.createCustomerList(payload);
        toast.success("تم إنشاء القائمة بنجاح");
      }
      setDialogOpen(false);
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await broadcastService.deleteCustomerList(deleteTarget.id);
      toast.success("تم حذف القائمة");
      setDeleteTarget(null);
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في حذف القائمة");
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshCount = async (list: CustomerList) => {
    if (list.isDefault) return;
    setRefreshingId(list.id);
    try {
      await broadcastService.refreshCustomerListCount(list.id);
      toast.success("تم تحديث عدد العملاء");
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في تحديث العدد");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDuplicate = async (list: CustomerList) => {
    if (list.isDefault) return;
    setSaving(true);
    try {
      const criteria = typeof list.criteria === "string"
        ? (() => { try { return JSON.parse(list.criteria); } catch { return {}; } })()
        : (list.criteria || {});
      await broadcastService.createCustomerList({
        name: `${list.name} (نسخة)`,
        description: list.description || "",
        criteria,
      });
      toast.success("تم إنشاء نسخة من القائمة");
      void loadLists(true);
    } catch (err: any) {
      toast.error(err?.message || "فشل في نسخ القائمة");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (list: CustomerList, page = 1, search = memberSearch) => {
    setDetailList(list);
    setMembersPage(page);
    setMembersLoading(true);
    try {
      const res = await broadcastService.getCustomersInListPaginated(list.id, page, PER_PAGE, search);
      setMembers(res?.data || []);
      setMembersTotal(res?.total ?? (res?.data?.length || 0));
    } catch (err: any) {
      toast.error(err?.message || "فشل في تحميل العملاء");
      setMembers([]);
      setMembersTotal(0);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleMemberPage = async (page: number) => {
    if (!detailList) return;
    setMembersPage(page);
    await openDetail(detailList, page);
  };

  const handleMemberSearchChange = (val: string) => {
    setMemberSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (detailList) void openDetail(detailList, 1, val);
    }, 350);
  };

  const handleWhatsAppSend = (list: CustomerList) => {
    navigate(`/whatsapp/template-broadcast?listId=${encodeURIComponent(list.id)}`);
  };

  const exportCsv = () => {
    if (!members.length) return;
    const header = ["الاسم", "الهاتف", "البريد", "آخر نشاط", "التقييم"];
    const rows = members.map((m) => [m.name, m.phone, m.email, m.lastActivity, m.rating]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detailList?.name || "customers-list"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    lists,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    stats,
    filteredLists,
    dialogOpen,
    setDialogOpen,
    editingList,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    formCriteriaType,
    formCriteria,
    previewCount,
    previewLoading,
    saving,
    availableTags,
    deleteTarget,
    setDeleteTarget,
    deleting,
    detailList,
    setDetailList,
    members,
    membersLoading,
    membersPage,
    membersTotal,
    memberSearch,
    refreshingId,
    searchInputRef,
    loadLists,
    openCreate,
    openEdit,
    changeCriteriaType,
    selectPreset,
    updateCriteriaField,
    handleSave,
    confirmDelete,
    handleRefreshCount,
    handleDuplicate,
    openDetail,
    handleMemberPage,
    handleMemberSearchChange,
    handleWhatsAppSend,
    exportCsv,
  };
}
