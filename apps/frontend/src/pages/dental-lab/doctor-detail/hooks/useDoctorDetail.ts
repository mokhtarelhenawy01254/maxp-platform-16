import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  DentalInvoice,
  DentalLabCase,
  DentalLabDoctorDetail,
  DentalWorkType,
  DoctorStatement,
} from "../../shared";
import {
  fetchDoctorDetail,
  fetchCases,
  fetchInvoices,
  fetchDoctorStatement,
  fetchWorkTypes,
  fetchDoctorPricing,
  saveDoctorPricing,
  updateDoctor,
  fetchInvoicePdf,
  fetchInvoicePaymentLink,
} from "../../shared";
import type { DetailTab } from "../types/doctorDetailTypes";

export function useDoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  // Primary Doctor State
  const [doctor, setDoctor] = useState<DentalLabDoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<DetailTab>("cases");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<DentalInvoice | null>(null);

  // Tab 1: Cases State
  const [cases, setCases] = useState<DentalLabCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState("ALL");

  // Tab 2: Invoices State
  const [invoices, setInvoices] = useState<DentalInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");

  // Tab 3: Statement State
  const [statementData, setStatementData] = useState<DoctorStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementFrom, setStatementFrom] = useState("");
  const [statementTo, setStatementTo] = useState("");

  // Tab 4: Pricing State
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<string, string>>({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);

  /* ------------------------------- Fetch Doctor ------------------------------ */
  const loadDoctor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorDetail(id);
      setDoctor(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  /* -------------------------------- Load Cases ------------------------------- */
  const loadCases = useCallback(async () => {
    if (!id) return;
    setCasesLoading(true);
    try {
      const res = await fetchCases({ doctorId: id, limit: 100 });
      setCases(res.data || []);
    } catch (e) {
      console.error("Error loading doctor cases:", e);
    } finally {
      setCasesLoading(false);
    }
  }, [id]);

  /* ------------------------------- Load Invoices ------------------------------ */
  const loadInvoices = useCallback(async () => {
    if (!id) return;
    setInvoicesLoading(true);
    try {
      const res = await fetchInvoices({ doctorId: id, limit: 100 });
      setInvoices(res || []);
    } catch (e) {
      console.error("Error loading doctor invoices:", e);
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  /* ------------------------------ Load Statement ------------------------------ */
  const loadStatement = useCallback(async () => {
    if (!id) return;
    setStatementLoading(true);
    try {
      const res = await fetchDoctorStatement({
        doctorId: id,
        from: statementFrom || undefined,
        to: statementTo || undefined,
      });
      setStatementData(res);
    } catch (e) {
      console.error("Error loading doctor statement:", e);
    } finally {
      setStatementLoading(false);
    }
  }, [id, statementFrom, statementTo]);

  /* -------------------------------- Load Pricing ------------------------------- */
  const loadPricing = useCallback(async () => {
    if (!id) return;
    setPricingLoading(true);
    try {
      const [wts, custom] = await Promise.all([
        fetchWorkTypes(),
        fetchDoctorPricing(id).catch(() => ({})),
      ]);
      setWorkTypes(wts.filter((w) => w.isActive));
      const map: Record<string, string> = {};
      for (const w of wts) {
        map[w.id] = custom[w.id] != null ? String(custom[w.id]) : "";
      }
      setPricingMap(map);
    } catch (e) {
      console.error("Error loading doctor pricing:", e);
    } finally {
      setPricingLoading(false);
    }
  }, [id]);

  // Tab switch effect to load corresponding data lazily
  useEffect(() => {
    if (!id) return;
    if (activeTab === "cases") loadCases();
    if (activeTab === "invoices") loadInvoices();
    if (activeTab === "statement") loadStatement();
    if (activeTab === "pricing") loadPricing();
  }, [activeTab, id, loadCases, loadInvoices, loadStatement, loadPricing]);

  /* -------------------------------- Save Pricing ------------------------------- */
  const handleSavePricing = async () => {
    if (!id) return;
    setPricingSaving(true);
    try {
      const clean: Record<string, number> = {};
      for (const [wid, v] of Object.entries(pricingMap)) {
        if (v.trim() !== "") clean[wid] = Number(v);
      }
      await saveDoctorPricing(id, clean);
      toast.success(t("dentalLab.doctors.pricing.saved"));
      await loadPricing();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ التسعير");
    } finally {
      setPricingSaving(false);
    }
  };

  /* ------------------------------- Toggle Status ------------------------------ */
  const handleToggleActive = async () => {
    if (!doctor) return;
    const nextState = !doctor.isActive;
    try {
      await updateDoctor(doctor.id, { isActive: nextState });
      toast.success(nextState ? "تم تنشيط الطبيب بنجاح" : "تم إلغاء تفعيل الطبيب");
      setDoctor((prev) => (prev ? { ...prev, isActive: nextState } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تغيير حالة الطبيب");
    }
  };

  /* -------------------------------- Download PDF ------------------------------ */
  const handleDownloadInvoicePdf = async (invId: string, invNum?: string) => {
    try {
      const blob = await fetchInvoicePdf(invId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invNum || invId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("فشل تحميل الفاتورة");
    }
  };

  /* ---------------------------- Copy Payment Link ---------------------------- */
  const handleCopyPaymentLink = async (invId: string) => {
    try {
      const res = await fetchInvoicePaymentLink(invId);
      if (res.checkoutUrl) {
        await navigator.clipboard.writeText(res.checkoutUrl);
        toast.success("تم نسخ رابط الدفع الإلكتروني للحافظة");
      } else {
        toast.info(res.message || "بوابة الدفع الإلكتروني غير مفعلة حالياً");
      }
    } catch {
      toast.error("فشل جلب رابط الدفع");
    }
  };

  /* ----------------------------- Clean WhatsApp ----------------------------- */
  const whatsappUrl = useMemo(() => {
    if (!doctor?.phone) return null;
    let p = doctor.phone.replace(/\D/g, "");
    if (p.startsWith("0")) p = "2" + p;
    return `https://wa.me/${p}`;
  }, [doctor?.phone]);

  const refreshAll = () => {
    loadDoctor();
    if (activeTab === "cases") loadCases();
    if (activeTab === "invoices") loadInvoices();
    if (activeTab === "statement") loadStatement();
    if (activeTab === "pricing") loadPricing();
    toast.success("تم تحديث البيانات");
  };

  return {
    id,
    doctor,
    setDoctor,
    loading,
    error,
    activeTab,
    setActiveTab,
    showEditModal,
    setShowEditModal,
    showPinDialog,
    setShowPinDialog,
    showBulkPaymentModal,
    setShowBulkPaymentModal,
    showQuickOrderModal,
    setShowQuickOrderModal,
    selectedInvoiceToPay,
    setSelectedInvoiceToPay,
    cases,
    casesLoading,
    caseSearch,
    setCaseSearch,
    caseStatusFilter,
    setCaseStatusFilter,
    invoices,
    invoicesLoading,
    invoiceStatusFilter,
    setInvoiceStatusFilter,
    statementData,
    statementLoading,
    statementFrom,
    setStatementFrom,
    statementTo,
    setStatementTo,
    workTypes,
    pricingMap,
    setPricingMap,
    pricingLoading,
    pricingSaving,
    loadDoctor,
    loadCases,
    loadInvoices,
    loadStatement,
    loadPricing,
    handleSavePricing,
    handleToggleActive,
    handleDownloadInvoicePdf,
    handleCopyPaymentLink,
    whatsappUrl,
    refreshAll,
  };
}

export default useDoctorDetail;
