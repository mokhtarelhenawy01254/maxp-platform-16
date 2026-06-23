import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { extractErrorMessage, enrichCompanies } from "../utils";
import type { Company, FacebookPageResult, FollowUpOwner, CompanyUser, QuickStats } from "../types";

export function useAdmin() {
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch { /* ignore */ }
  return user as { id: string; [key: string]: unknown } | null;
}

export interface CompaniesQueryParams {
  search?: string;
  status?: string;
  plan?: string;
  savedView?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  startDate?: string;
  endDate?: string;
}

export function useCompanies(params: CompaniesQueryParams = {}) {
  const admin = useAdmin();

  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.plan && params.plan !== 'ALL') queryParams.set('plan', params.plan);
  if (params.savedView && params.savedView !== 'ALL') queryParams.set('savedView', params.savedView);
  if (params.page && params.page > 1) queryParams.set('page', String(params.page));
  if (params.pageSize !== undefined) queryParams.set('pageSize', String(params.pageSize));
  if (params.sort) queryParams.set('sort', params.sort);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  const queryStr = queryParams.toString();

  const query = useQuery({
    queryKey: ["super-admin", "companies", params],
    queryFn: async () => {
      const url = `/admin/companies${queryStr ? `?${queryStr}` : ''}`;
      const res = await apiClient.get(url);
      if (!res.data?.success) throw new Error(res.data?.message || "فشل في تحميل الشركات");
      return {
        companies: (res.data.data?.companies || []) as Company[],
        total: res.data.data?.total || 0,
        totalPages: res.data.data?.totalPages || 1,
        page: res.data.data?.page || 1,
        pageSize: res.data.data?.pageSize || 20,
        meta: res.data.meta || null,
      };
    },
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const enriched = query.data ? enrichCompanies(query.data.companies, admin?.id || null) : [];
  return {
    ...query,
    companies: enriched,
    total: query.data?.total || 0,
    totalPages: query.data?.totalPages || 1,
    currentPage: query.data?.page || 1,
    currentPageSize: query.data?.pageSize || 20,
    meta: query.data?.meta || null,
    serverStats: (query.data?.meta?.stats || null) as QuickStats | null,
    admin,
  };
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
    mutationFn: async ({ companyId }: { companyId: string; redirectPath?: string }) => {
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
