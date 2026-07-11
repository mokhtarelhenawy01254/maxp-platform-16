import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiAdminService } from "../services/aiAdminService";
import type { CreateAiKeyPayload, AiTestResult, DashboardStats } from "../types/ai-admin";

export function useCreateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAiKeyPayload) => aiAdminService.createKey(payload),
    onSuccess: () => {
      toast.success("تم إنشاء المفتاح بنجاح");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "keys"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "فشل إنشاء المفتاح");
    },
  });
}

export function useToggleKeyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      aiAdminService.setKeyStatus(id, isActive),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? "تم تفعيل المفتاح" : "تم إلغاء تفعيل المفتاح");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "keys"] });
    },
    onError: () => {
      toast.error("فشل تحديث حالة المفتاح");
    },
  });
}

export function useDeleteKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiAdminService.deleteKey(id),
    onSuccess: () => {
      toast.success("تم حذف المفتاح");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "keys"] });
    },
    onError: () => {
      toast.error("فشل حذف المفتاح");
    },
  });
}

export function useTestKey() {
  return useMutation({
    mutationFn: (keyId: string): Promise<AiTestResult> =>
      aiAdminService.testKeyById(keyId),
  });
}

export function useBatchTestKeys() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyIds: string[]) => aiAdminService.batchTestKeys(keyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "keys"] });
    },
  });
}
