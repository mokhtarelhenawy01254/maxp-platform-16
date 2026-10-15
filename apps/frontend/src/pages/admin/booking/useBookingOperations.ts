import { useState } from "react";
import { toast } from "sonner";
import {
  BookingBranch, BookingDoctor, BookingAppointment, BookingService, BookingPatient, BookingInvoice,
  BranchFormData, ServiceFormData, ServiceCategory,
  api, getAuthHeaders
} from "./shared";

interface UseBookingOperationsParams {
  services: BookingService[];
  appointments: BookingAppointment[];
  fetchBranches: () => Promise<void>;
  fetchDoctors: (branchId?: string) => Promise<void>;
  fetchServices: (branchId?: string) => Promise<void>;
  fetchServiceCategories: () => Promise<void>;
  fetchAppointments: () => Promise<void>;
  fetchPatients: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  setLoading: (l: boolean) => void;
  setBranchModal: (b: Partial<BookingBranch> | null | undefined) => void;
  setDoctorModal: (d: Partial<BookingDoctor> | null | undefined) => void;
  setServiceModal: (s: Partial<BookingService> | null | undefined) => void;
  setAppointmentModal: (a: Partial<BookingAppointment> | null | undefined) => void;
  setPatientModal: (p: Partial<BookingPatient> | null | undefined) => void;
  setInvoiceModal: (i: Partial<BookingInvoice> | null | undefined) => void;
  paymentInvoice: BookingInvoice | null;
  setPaymentInvoice: (p: BookingInvoice | null) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setConfirmDialog: (d: { message: string; onConfirm: () => void } | null) => void;
  setCloneTarget: (s: BookingService | null) => void;
  setCloneNameInput: (n: string) => void;
}

export function useBookingOperations({
  services,
  appointments,
  fetchBranches,
  fetchDoctors,
  fetchServices,
  fetchServiceCategories,
  fetchAppointments,
  fetchPatients,
  fetchInvoices,
  setLoading,
  setBranchModal,
  setDoctorModal,
  setServiceModal,
  setAppointmentModal,
  setPatientModal,
  setInvoiceModal,
  paymentInvoice,
  setPaymentInvoice,
  selectedIds,
  setSelectedIds,
  setConfirmDialog,
  setCloneTarget,
  setCloneNameInput,
}: UseBookingOperationsParams) {
  const apiCall = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || "فشل العملية"); return false; }
    return data.data;
  };

  const saveBranch = async (d: BranchFormData) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`branches/${d.id}`) : api("branches");
    const phones = d.phones.map(p => String(p).trim()).filter(Boolean);
    const body: Record<string, unknown> = { name: d.name, address: d.address, phone: phones[0] || d.phone || "", phones, isActive: d.isActive, facilityType: d.facilityType || "clinic" };
    if (d.workingDays) {
      const days = d.workingDays.split(",").filter(Boolean);
      if (days.length > 0) {
        const wd: Record<string, string> = {};
        days.forEach(day => {
          const h = d.dayHours?.[day] || { start: d.workStart, end: d.workEnd };
          wd[day] = `${h.start || "09:00"}-${h.end || "22:00"}`;
        });
        body["workingDays"] = wd;
      }
    }
    const maleDays = d.maleDays.sort();
    const femaleDays = d.femaleDays.sort();
    body["genderDays"] = { male: maleDays, female: femaleDays };
    if (d.maxBookingsPerSlot !== undefined) body["maxBookingsPerSlot"] = d.maxBookingsPerSlot;
    if (d.location !== undefined) body["location"] = d.location;
    if (d.landmarkImage !== undefined) body["landmarkImage"] = d.landmarkImage;
    const data = await apiCall(url, isEdit ? "PUT" : "POST", body);
    if (data !== false) { setBranchModal(undefined); fetchBranches(); }
  };

  const saveDoctor = async (d: Partial<BookingDoctor>) => {
    const data = await apiCall(api(`doctors/${d.id ? d.id : ""}`), d.id ? "PUT" : "POST", d);
    if (data !== false) { setDoctorModal(undefined); fetchDoctors(); }
  };

  const saveService = async (d: ServiceFormData) => {
    const isEdit = !!d.id;
    const common: Record<string, unknown> = {
      name: d.name, description: d.description,
      requiresConsultation: d.requiresConsultation ?? true,
      durationMinutes: d.durationMinutes || 30,
    };
    if (d.basePrice !== undefined && d.basePrice !== null) common["basePrice"] = d.basePrice;
    if (d.imageUrl !== undefined) common["imageUrl"] = d.imageUrl;
    if (d.categoryId !== undefined) common["categoryId"] = d.categoryId;
    if (d.doctorIds !== undefined) common["doctorIds"] = d.doctorIds;

    if (isEdit) {
      const data = await apiCall(api(`services/${d.id}`), "PUT", common);
      if (data === false) return;
      if (d.branches) {
        const oldService = services.find(s => s.id === d.id);
        const oldBranchIds = new Set(oldService?.branchServices?.map(bs => bs.branchId) || []);
        const newBranchIds = new Set(d.branches.map(b => b.branchId));
        for (const branchId of oldBranchIds) {
          if (!newBranchIds.has(branchId)) await fetch(api(`services/${d.id}/branches/${branchId}`), { method: "DELETE", headers: getAuthHeaders() });
        }
        for (const b of d.branches) {
          await fetch(api(`services/${d.id}/branches`), {
            method: "POST", headers: getAuthHeaders(),
            body: JSON.stringify({ branchId: b.branchId, packages: b.packages?.filter(p => p.count > 0) || null })
          });
        }
      }
    } else {
      const payload: Record<string, unknown> = { ...common };
      if (d.branches?.length) payload["branches"] = d.branches.map(b => ({ branchId: b.branchId, packages: b.packages?.filter(p => p.count > 0) || null }));
      const data = await apiCall(api("services"), "POST", payload);
      if (data === false) return;
    }
    setServiceModal(undefined); fetchServices();
  };

  const saveServiceCategory = async (d: Partial<ServiceCategory>) => {
    const isEdit = !!d.id;
    const data = await apiCall(api(`services/categories${isEdit ? `/${d.id}` : ""}`), isEdit ? "PUT" : "POST", d);
    if (data !== false) fetchServiceCategories();
  };

  const deleteServiceCategory = async (id: string) => {
    setConfirmDialog({
      message: "تأكيد حذف القسم؟ الخدمات المرتبطة به لن تُحذف.",
      onConfirm: async () => {
        const data = await apiCall(api(`services/categories/${id}`), "DELETE");
        if (data !== false) fetchServiceCategories();
      }
    });
  };

  const cloneService = async (s: BookingService) => {
    setCloneTarget(s);
    setCloneNameInput(`نسخة من ${s.name}`);
  };

  const saveAppointment = async (d: Partial<BookingAppointment>) => {
    const isEdit = !!d.id;
    const data = await apiCall(api(`appointments${isEdit ? `/${d.id}` : ""}`), isEdit ? "PUT" : "POST", d);
    if (data !== false) { setAppointmentModal(undefined); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
  };

  const savePatient = async (d: Partial<BookingPatient>) => {
    const isEdit = !!d.id;
    const data = await apiCall(api(`patients${isEdit ? `/${d.id}` : ""}`), isEdit ? "PUT" : "POST", d);
    if (data !== false) { setPatientModal(undefined); fetchPatients(); }
  };

  const saveInvoice = async (d: Partial<BookingInvoice> & { initialPayment?: number; method?: string }) => {
    const isEdit = !!d.id;
    const body = { ...d };
    delete body.initialPayment;
    delete body.method;
    const payload: Record<string, unknown> = { ...body, initialPayment: d.initialPayment, method: d.method };
    const data = await apiCall(api(`invoices${isEdit ? `/${d.id}` : ""}`), isEdit ? "PUT" : "POST", payload);
    if (data !== false) { setInvoiceModal(undefined); fetchInvoices(); fetchAppointments(); }
  };

  const payInvoice = async (d: { amount: number; method: string; notes?: string }) => {
    if (!paymentInvoice) return;
    const data = await apiCall(api(`invoices/${paymentInvoice.id}/payments`), "POST", d);
    if (data !== false) { setPaymentInvoice(null); fetchInvoices(); fetchAppointments(); }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const data = await apiCall(api(`appointments/${id}/status`), "PUT", { status });
    if (data !== false) { setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === appointments.length && appointments.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(appointments.map(a => a.id)));
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setConfirmDialog({
      message: `تأكيد تغيير حالة (${ids.length}) موعد إلى "${status}"؟`,
      onConfirm: async () => {
        const data = await apiCall(api("appointments/bulk-status"), "PUT", { ids, status });
        if (data !== false) { setSelectedIds(new Set()); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
      }
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setConfirmDialog({
      message: `تأكيد حذف (${ids.length}) موعد بشكل نهائي؟`,
      onConfirm: async () => {
        const data = await apiCall(api("appointments/bulk-delete"), "POST", { ids });
        if (data !== false) { setSelectedIds(new Set()); setLoading(true); fetchAppointments().finally(() => setLoading(false)); }
      }
    });
  };

  const toggleActive = async (type: string, id: string, current: boolean) => {
    const data = await apiCall(api(`${type}/${id}`), "PUT", { isActive: !current });
    if (data !== false) {
      if (type === "branches") fetchBranches();
      else if (type === "doctors") fetchDoctors();
      else if (type === "patients") fetchPatients();
      else fetchServices();
    }
  };

  const deleteItem = async (type: string, id: string) => {
    setConfirmDialog({
      message: "تأكيد الحذف؟",
      onConfirm: async () => {
        const data = await apiCall(api(`${type}/${id}`), "DELETE");
        if (data !== false) {
          if (type === "branches") fetchBranches();
          else if (type === "doctors") fetchDoctors();
          else if (type === "patients") fetchPatients();
          else if (type === "invoices") fetchInvoices();
          else fetchServices();
        }
      }
    });
  };

  return {
    apiCall,
    saveBranch,
    saveDoctor,
    saveService,
    saveServiceCategory,
    deleteServiceCategory,
    cloneService,
    saveAppointment,
    savePatient,
    saveInvoice,
    payInvoice,
    updateAppointmentStatus,
    toggleSelect,
    toggleSelectAll,
    bulkUpdateStatus,
    bulkDelete,
    toggleActive,
    deleteItem,
  };
}

export default useBookingOperations;
