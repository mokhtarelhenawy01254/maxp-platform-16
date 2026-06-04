import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../services/apiClient";
import { toast } from "react-hot-toast";
import { extractErrorMessage, enrichCompanies } from "../utils";
import type { Company, FacebookPageResult, FollowUpOwner, CompanyUser, FollowUpFormData, EmployeeFormData } from "../types";

export function useAdmin() {
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch { /* ignore */ }
  return user as { id: string; [key: string]: unknown } | null;
}

export function useCompanies() {
  const admin = useAdmin();

  const query = useQuery({
    queryKey: ["super-admin", "companies"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/companies");
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في تحميل الشركات");
      return res.data.data?.companies as Company[] || [];
    },
    staleTime: 30_000,
  });

  const enriched = query.data ? enrichCompanies(query.data, admin?.id || null) : [];
  return { ...query, companies: enriched, admin };
}

export function useBulkMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["super-admin", "companies"] });

  const bulkStatus = useMutation({
    mutationFn: async ({ companyIds, isActive }: { companyIds: string[]; isActive: boolean }) => {
      const res = await apiClient.put("/admin/companies/bulk-status", { companyIds, isActive });
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في تحديث الحالة");
    },
    onSuccess: () => { invalidate(); toast.success("تم التحديث بنجاح"); },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في تحديث الحالة")),
  });

  const bulkDelete = useMutation({
    mutationFn: async (companyIds: string[]) => {
      if (companyIds.length === 1) {
        const res = await apiClient.delete(`/admin/companies/${companyIds[0]}`);
        if (!res.data?.success) throw new Error(res.data?.message || "فشل في الحذف");
      } else {
        const res = await apiClient.post("/admin/companies/bulk-delete", { companyIds });
        if (!res.data?.success) throw new Error(res.data?.message || "فشل في الحذف الجماعي");
      }
    },
    onSuccess: (_data, ids) => { invalidate(); toast.success(ids.length === 1 ? "تم حذف الشركة" : `تم حذف ${ids.length} شركة`); },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في الحذف")),
  });

  return { bulkStatus, bulkDelete, invalidate };
}

export function useCompanyMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["super-admin", "companies"] });

  const createCompany = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiClient.post("/admin/companies", payload);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في إنشاء الشركة");
    },
    onSuccess: () => { invalidate(); toast.success("تم إنشاء الشركة بنجاح"); },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في إنشاء الشركة")),
  });

  const editCompany = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: unknown }) => {
      const res = await apiClient.put(`/admin/companies/${id}`, payload);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في تحديث الشركة");
    },
    onSuccess: () => { invalidate(); toast.success("تم تحديث الشركة بنجاح"); },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في تحديث الشركة")),
  });

  return { createCompany, editCompany, invalidate };
}

export function useFacebookLookup() {
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await apiClient.get(`/admin/companies/facebook-pages/search?query=${encodeURIComponent(query)}`);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في البحث");
      return res.data.data?.results as FacebookPageResult[];
    },
  });
}

export function useFollowUpOwners() {
  return useQuery({
    queryKey: ["super-admin", "follow-up-owners"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/companies/follow-up-owners");
      if (!res.data?.success) throw new Error("فشل في تحميل المسؤولين");
      return res.data.data?.owners as FollowUpOwner[] || [];
    },
    staleTime: 60_000,
  });
}

export function useCompanyUsers(companyId: string | null) {
  return useQuery({
    queryKey: ["super-admin", "company-users", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await apiClient.get(`/admin/companies/${companyId}/users`);
      if (!res.data?.success) throw new Error("فشل في تحميل الأعضاء");
      return res.data.data?.users as CompanyUser[] || [];
    },
    enabled: !!companyId,
  });
}

export function useSaveFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, ...payload }: { companyId: string; [key: string]: unknown }) => {
      const res = await apiClient.put(`/admin/companies/${companyId}/follow-up`, payload);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في تحديث المتابعة");
      return res.data.data?.followUp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "companies"] });
      toast.success("تم تحديث المتابعة");
    },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في تحديث المتابعة")),
  });
}

export function useAddEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, ...payload }: { companyId: string; [key: string]: unknown }) => {
      const res = await apiClient.post(`/admin/companies/${companyId}/employees`, payload);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في إضافة الموظف");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "companies"] });
      toast.success("تمت إضافة الموظف بنجاح");
    },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في إضافة الموظف")),
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, targetUserId }: { companyId: string; targetUserId: string }) => {
      const res = await apiClient.post(`/admin/companies/${companyId}/transfer-ownership`, { targetUserId });
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في نقل الملكية");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "companies"] });
      toast.success("تم نقل الملكية بنجاح");
    },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في نقل الملكية")),
  });
}

export function useLoginAsAdmin() {
  return useMutation({
    mutationFn: async ({ companyId, redirectPath = "/company-dashboard" }: { companyId: string; redirectPath?: string }) => {
      const res = await apiClient.post(`/admin/companies/${companyId}/login-as-admin`);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في تسجيل الدخول");
      return res.data.data as { token: string; user: Record<string, unknown> };
    },
    onSuccess: (data) => {
      const superToken = localStorage.getItem("accessToken");
      const superUser = localStorage.getItem("user");
      if (superToken) localStorage.setItem("superAuth", superToken);
      if (superUser) localStorage.setItem("superUser", superUser);
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/company-dashboard";
    },
    onError: (err: Error) => toast.error(extractErrorMessage(err, "فشل في تسجيل الدخول كمدير")),
  });
}
