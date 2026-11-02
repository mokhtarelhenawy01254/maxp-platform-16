import { useState } from "react";
import { toast } from "sonner";
import { buildApiUrl } from "../../../../utils/urlHelper";
import { tokenManager } from "../../../../utils/tokenManager";
import type { Task } from "../../types";
import type { DeliveryEvidencePayload, DeliveryGateFiles } from "../DeliveryGateModal";

interface UseTaskGateModalsOptions {
  onReloadTasks?: () => void;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
}

export function useTaskGateModals({ onReloadTasks, updateTaskStatus }: UseTaskGateModalsOptions) {
  const [deliveryGateTask, setDeliveryGateTask] = useState<Task | null>(null);
  const [approvalGateTask, setApprovalGateTask] = useState<Task | null>(null);
  const [isSubmittingGate, setIsSubmittingGate] = useState(false);

  const handleDeliverySubmit = async (
    payload: DeliveryEvidencePayload,
    files?: DeliveryGateFiles | File | null
  ) => {
    if (!deliveryGateTask) return;
    try {
      setIsSubmittingGate(true);
      const token = tokenManager.getAccessToken();

      let beforeAttachmentId = payload.beforeAttachmentId;
      let afterAttachmentId = payload.afterAttachmentId;
      let beforeAttachmentUrl = payload.beforeAttachmentUrl;
      let afterAttachmentUrl = payload.afterAttachmentUrl;

      let beforeFileToUpload: File | null = null;
      let afterFileToUpload: File | null = null;

      if (files instanceof File) {
        afterFileToUpload = files;
      } else if (files && typeof files === "object") {
        beforeFileToUpload = files.beforeFile || null;
        afterFileToUpload = files.afterFile || null;
      }

      if (beforeFileToUpload) {
        const formData = new FormData();
        formData.append("file", beforeFileToUpload);
        formData.append("taskId", deliveryGateTask.id);
        const uploadRes = await fetch(buildApiUrl("tasks/attachments"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.data?.id) {
          beforeAttachmentId = uploadData.data.id;
          beforeAttachmentUrl = uploadData.data.filePath;
        }
      }

      if (afterFileToUpload) {
        const formData = new FormData();
        formData.append("file", afterFileToUpload);
        formData.append("taskId", deliveryGateTask.id);
        const uploadRes = await fetch(buildApiUrl("tasks/attachments"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.data?.id) {
          afterAttachmentId = uploadData.data.id;
          afterAttachmentUrl = uploadData.data.filePath;
        }
      }

      const proofAttachmentId = afterAttachmentId || beforeAttachmentId || payload.proofAttachmentId;
      const proofAttachmentUrl = afterAttachmentUrl || beforeAttachmentUrl || payload.proofAttachmentUrl;

      const res = await fetch(buildApiUrl(`tasks/${deliveryGateTask.id}/submit-review`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
          beforeAttachmentId,
          beforeAttachmentUrl,
          afterAttachmentId,
          afterAttachmentUrl,
          proofAttachmentId,
          proofAttachmentUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("تم تسليم المهمة للمراجعة بنجاح");
        setDeliveryGateTask(null);
        if (onReloadTasks) await onReloadTasks();
        else updateTaskStatus(deliveryGateTask.id, "in_review");
      } else {
        const errMsg = data.error || data.message || "فشل تسليم المهمة للمراجعة";
        toast.error(errMsg);
        const gateErr: any = new Error(errMsg);
        gateErr.missingFields = data.missingFields;
        throw gateErr;
      }
    } catch (err: any) {
      if (!err?.missingFields) {
        toast.error(err?.message || "حدث خطأ أثناء تسليم المهمة");
      }
      throw err;
    } finally {
      setIsSubmittingGate(false);
    }
  };

  const handleApprove = async (options: {
    ownerOverride?: boolean;
    ownerOverrideReason?: string;
    criteriaChecked?: boolean;
  }) => {
    if (!approvalGateTask) return;
    try {
      setIsSubmittingGate(true);
      const token = tokenManager.getAccessToken();
      const res = await fetch(buildApiUrl(`tasks/${approvalGateTask.id}/approve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم اعتماد المهمة بنجاح");
        setApprovalGateTask(null);
        if (onReloadTasks) await onReloadTasks();
        else updateTaskStatus(approvalGateTask.id, "completed");
      } else {
        toast.error(data.error || "فشل اعتماد المهمة");
      }
    } catch {
      toast.error("حدث خطأ أثناء اعتماد المهمة");
    } finally {
      setIsSubmittingGate(false);
    }
  };

  const handleDirectApprove = async (taskToApprove: Task) => {
    try {
      setIsSubmittingGate(true);
      const token = tokenManager.getAccessToken();
      const res = await fetch(buildApiUrl(`tasks/${taskToApprove.id}/approve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم اعتماد المهمة بنجاح");
        if (onReloadTasks) await onReloadTasks();
        else updateTaskStatus(taskToApprove.id, "completed");
      } else {
        toast.error(data.error || "فشل اعتماد المهمة");
      }
    } catch {
      toast.error("حدث خطأ أثناء اعتماد المهمة");
    } finally {
      setIsSubmittingGate(false);
    }
  };

  const handleReturn = async (
    reason: string,
    options?: { returnReasonType?: string; returnSeverity?: number }
  ) => {
    if (!approvalGateTask) return;
    try {
      setIsSubmittingGate(true);
      const token = tokenManager.getAccessToken();
      const res = await fetch(buildApiUrl(`tasks/${approvalGateTask.id}/return-revision`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason,
          revisionReason: reason,
          returnReasonType: options?.returnReasonType,
          returnSeverity: options?.returnSeverity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.warning("تم إرجاع المهمة للتعديل بنجاح");
        setApprovalGateTask(null);
        if (onReloadTasks) await onReloadTasks();
        else updateTaskStatus(approvalGateTask.id, "in_progress");
      } else {
        toast.error(data.error || "فشل طلب التعديلات");
      }
    } catch {
      toast.error("حدث خطأ أثناء إرجاع المهمة");
    } finally {
      setIsSubmittingGate(false);
    }
  };

  return {
    deliveryGateTask,
    setDeliveryGateTask,
    approvalGateTask,
    setApprovalGateTask,
    isSubmittingGate,
    handleDeliverySubmit,
    handleApprove,
    handleDirectApprove,
    handleReturn,
  };
}
