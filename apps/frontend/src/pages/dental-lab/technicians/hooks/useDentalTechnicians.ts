import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  createTechnician,
  deleteTechnician,
  fetchTeam,
  fetchTechnicians,
  updateTechnician,
  type DentalTechnician,
  type DentalTechnicianVacation,
  type TeamMember,
} from "../../shared";
import type { TechnicianForm } from "../types/technicianTypes";

export function useDentalTechnicians() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalTechnician[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [wageDefault, setWageDefault] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<TechnicianForm | null>(null);
  const [payoutModalTech, setPayoutModalTech] = useState<DentalTechnician | null>(null);
  const [ledgerModalTech, setLedgerModalTech] = useState<DentalTechnician | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      setLoading(true);
      try {
        const [data, teamRows] = await Promise.all([
          fetchTechnicians(),
          fetchTeam().catch(() => [] as TeamMember[]),
        ]);
        let list = data.items || [];
        if (search.trim()) {
          const q = search.trim();
          list = list.filter(
            (x) => x.name.includes(q) || (x.phone || "").includes(q)
          );
        }
        setRows(list);
        setTeam(teamRows);
        setWageDefault(data.wageDefaults?.defaultPerStage ?? 0);
        setError(null);
      } catch (e) {
        if (!quiet)
          setError(
            e instanceof Error ? e.message : t("dentalLab.common.noData")
          );
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

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "CAD_DESIGNER",
      userId: "",
      wagePerStage: "",
      workingDays: [6, 0, 1, 2, 3, 4],
      dailyCap: "0",
      backupTechnicianId: "",
      vacations: [],
      isActive: true,
    });
  };

  const openEdit = (x: DentalTechnician) => {
    setError(null);
    const existingEmail =
      x.userEmail ||
      x.user?.email ||
      team.find((mm) => mm.userId === x.userId)?.email ||
      "";
    setModal({
      id: x.id,
      name: x.name,
      phone: x.phone || "",
      email: existingEmail,
      password: "",
      role: x.role || "GENERAL_TECHNICIAN",
      userId: x.userId || "",
      wagePerStage: x.wagePerStage != null ? String(x.wagePerStage) : "",
      workingDays:
        Array.isArray(x.workingDays) && x.workingDays.length > 0
          ? x.workingDays
          : [6, 0, 1, 2, 3, 4],
      dailyCap: x.dailyCap != null ? String(x.dailyCap) : "0",
      backupTechnicianId: x.backupTechnicianId || "",
      vacations: Array.isArray(x.vacations)
        ? x.vacations.map((v) => ({
            startDate: v.startDate ? String(v.startDate).slice(0, 10) : "",
            endDate: v.endDate ? String(v.endDate).slice(0, 10) : "",
            reason: v.reason || "",
          }))
        : [],
      isActive: x.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) {
      setError("اسم عضو الفريق مطلوب");
      return;
    }
    if (!modal.id) {
      if (!modal.email.trim()) {
        setError("البريد الإلكتروني مطلوب لإنشاء حساب الفني");
        return;
      }
      if (!modal.password || modal.password.length < 6) {
        setError("كلمة المرور مطلوبة ويجب ألا تقل عن 6 أحرف");
        return;
      }
    } else if (modal.password && modal.password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    const cleanVacations: DentalTechnicianVacation[] = [];
    for (const v of modal.vacations) {
      const s = (v.startDate || "").trim();
      const e = (v.endDate || "").trim();
      if (!s && !e) continue;
      if (!s || !e) {
        setError("يرجى تحديد تاريخ البداية وتاريخ النهاية لكل إجازة مسجلة");
        return;
      }
      if (s > e) {
        setError(
          `تاريخ بداية الإجازة (${s}) يجب ألا يكون بعد تاريخ النهاية (${e})`
        );
        return;
      }
      cleanVacations.push({
        startDate: s,
        endDate: e,
        reason: (v.reason || "").trim() || undefined,
      });
    }

    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        phone: modal.phone.trim() || undefined,
        role: modal.role,
        email: modal.email.trim() || undefined,
        password: modal.password.trim() || undefined,
        userId: modal.userId.trim() || undefined,
        wagePerStage:
          modal.wagePerStage.trim() === ""
            ? undefined
            : Number(modal.wagePerStage),
        workingDays: modal.workingDays,
        dailyCap: Math.max(0, parseInt(modal.dailyCap, 10) || 0),
        backupTechnicianId: modal.backupTechnicianId.trim() || null,
        vacations: cleanVacations,
      };
      if (modal.id) {
        await updateTechnician(modal.id, {
          ...payload,
          isActive: modal.isActive,
        });
        toast.success("تم تحديث بيانات عضو فريق العمل بنجاح");
      } else {
        await createTechnician({ ...payload, isActive: true });
        toast.success("تمت إضافة الفني وإنشاء حسابه بالمنصة بنجاح");
      }
      setModal(null);
      await load(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("dentalLab.common.noData")
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (x: DentalTechnician) => {
    if (removingId) return;
    if (!window.confirm(`هل أنت متأكد من حذف (${x.name}) من فريق العمل؟`))
      return;
    setRemovingId(x.id);
    try {
      await deleteTechnician(x.id);
      toast.success("تم حذف عضو الفريق بنجاح");
      await load(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("dentalLab.common.noData")
      );
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (x: DentalTechnician) => {
    try {
      await updateTechnician(x.id, { isActive: !x.isActive });
      await load(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("dentalLab.common.noData")
      );
    }
  };

  const totalWages = rows.reduce((s, x) => s + (x.totalEarnings ?? 0), 0);
  const totalPaid = rows.reduce((s, x) => s + (x.totalPaid ?? 0), 0);
  const totalBalanceDue = totalWages - totalPaid;

  return {
    rows,
    team,
    wageDefault,
    loading,
    error,
    setError,
    searchInput,
    setSearchInput,
    modal,
    setModal,
    payoutModalTech,
    setPayoutModalTech,
    ledgerModalTech,
    setLedgerModalTech,
    saving,
    removingId,
    totalWages,
    totalPaid,
    totalBalanceDue,
    load,
    openCreate,
    openEdit,
    save,
    remove,
    toggleActive,
  };
}

export default useDentalTechnicians;
