import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { aiAdminService } from "../services/aiAdminService";
import type { CreateAiKeyPayload, AiKeyUpdatePayload, AiTestResult, DashboardStats, GlobalConfig } from "../types/ai-admin";

export function useCreateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAiKeyPayload) => aiAdminService.createKey(payload),
    onSuccess: () => {
      tToast.success("hooks_useKeyMutations.success_create_a7bf");
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
      tToast.error("hooks_useKeyMutations.failed_update_status_4d28");
    },
  });
}

export function useDeleteKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiAdminService.deleteKey(id),
    onSuccess: () => {
      tToast.success("hooks_useKeyMutations.success_delete_fd98");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "keys"] });
    },
    onError: () => {
      tToast.error("hooks_useKeyMutations.failed_delete_782c");
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

export function useUpdateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AiKeyUpdatePayload }) =>
      aiAdminService.updateKey(id, payload),
    onSuccess: () => {
      tToast.success("hooks_useKeyMutations.success_update_b9b2");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "keys"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "فشل تحديث المفتاح");
    },
  });
}

export function useUpdateGlobalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<GlobalConfig>) => aiAdminService.updateGlobalConfig(payload),
    onSuccess: () => {
      tToast.success("hooks_useKeyMutations.success_update_428b");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "config"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "فشل تحديث الإعدادات");
    },
  });
}

export function useSetProviderPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providers: string[]) => aiAdminService.setProviderPriority(providers),
    onSuccess: () => {
      tToast.success("hooks_useKeyMutations.success_update_76a9");
      queryClient.invalidateQueries({ queryKey: ["ai-admin", "config"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "فشل تحديث الترتيب");
    },
  });
}
