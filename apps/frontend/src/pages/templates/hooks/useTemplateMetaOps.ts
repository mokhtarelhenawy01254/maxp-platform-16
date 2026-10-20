import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { META_BODY_CHAR_LIMIT } from "../utils";
import type {
  TemplateScopeConfig,
  StatusWithTemplate,
  Template,
  MetaSession,
  MetaAvailableTemplate,
  DeliveryPreviewItem,
} from "../types";

export interface UseTemplateMetaOpsProps {
  config: TemplateScopeConfig;
  statuses: StatusWithTemplate[];
  deliveryPreview: Record<string, DeliveryPreviewItem>;
  fetchData: () => Promise<void>;
  fetchDeliveryPreview: () => Promise<void>;
  setDialogOpen: (open: boolean) => void;
  dialogOpen: boolean;
  persistLocalTemplate: () => Promise<string | null>;
  selectedTemplate: Template | null;
  templateFormContent: string;
  metaCategory?: string;
  onDirtyDialog: () => void;
}

export function useTemplateMetaOps({
  config,
  statuses,
  deliveryPreview,
  fetchData,
  fetchDeliveryPreview,
  setDialogOpen,
  dialogOpen,
  persistLocalTemplate,
  selectedTemplate,
  templateFormContent,
  metaCategory,
  onDirtyDialog,
}: UseTemplateMetaOpsProps) {
  const [metaSessions, setMetaSessions] = useState<MetaSession[]>([]);
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resubmittingMeta, setResubmittingMeta] = useState(false);
  const [availableMetaTemplates, setAvailableMetaTemplates] = useState<MetaAvailableTemplate[]>([]);
  const [loadingMetaTemplates, setLoadingMetaTemplates] = useState(false);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [unbindTarget, setUnbindTarget] = useState<StatusWithTemplate | null>(null);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [batchPublishing, setBatchPublishing] = useState(false);

  const metaSessionsCacheRef = useRef<{ data: MetaSession[]; at: number } | null>(null);
  const autoSyncDoneRef = useRef(false);

  const fetchMetaSessions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && metaSessionsCacheRef.current && now - metaSessionsCacheRef.current.at < 30_000) {
      const cached = metaSessionsCacheRef.current.data;
      setMetaSessions(cached);
      if (cached.length > 0 && !selectedMetaSession) setSelectedMetaSession(cached[0].id);
      return;
    }
    try {
      const res = await apiClient.get(config.endpoints?.sessions || "/whatsapp/sessions");
      const list: MetaSession[] = res.data?.sessions || [];
      const cloud = list.filter((s) => s.provider === "META_CLOUD");
      metaSessionsCacheRef.current = { data: cloud, at: now };
      setMetaSessions(cloud);
      if (cloud.length > 0 && !selectedMetaSession) {
        setSelectedMetaSession(cloud[0].id);
      }
    } catch {}
  }, [selectedMetaSession, config]);

  const fetchAvailableMetaTemplates = useCallback(async () => {
    if (!selectedMetaSession) return;
    setLoadingMetaTemplates(true);
    try {
      const res = await apiClient.get(`${config.metaOpsBase}/meta-available`, {
        params: { sessionId: selectedMetaSession },
      });
      setAvailableMetaTemplates(res.data?.templates || []);
    } catch {
      setAvailableMetaTemplates([]);
    } finally {
      setLoadingMetaTemplates(false);
    }
  }, [selectedMetaSession, config.metaOpsBase]);

  useEffect(() => {
    if (dialogOpen && selectedMetaSession) {
      fetchAvailableMetaTemplates();
    }
  }, [dialogOpen, selectedMetaSession, fetchAvailableMetaTemplates]);

  const uploadHeaderMedia = useCallback(async (file: File) => {
    if (!selectedMetaSession) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setHeaderUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", selectedMetaSession);
      const res = await apiClient.post<{ success?: boolean; mediaId?: string; fileName?: string; error?: string }>(
        config.endpoints?.uploadMedia || "/whatsapp-templates/templates/upload-media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const data = res.data;
      if (data?.success && data.mediaId) {
        toast.success("تم رفع الوسيط — جاهز للنشر على ميتا");
        return { mediaId: data.mediaId, fileName: data.fileName || file.name };
      }
      toast.error(data?.error || "فشل رفع الوسيط");
      return null;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل رفع الوسيط");
      return null;
    } finally {
      setHeaderUploading(false);
    }
  }, [selectedMetaSession, config]);

  const publishToMeta = async (templateId: string) => {
    if (!selectedMetaSession) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setPublishingId(templateId);
    try {
      await apiClient.post(`${config.metaOpsBase}/${templateId}/publish`, {
        sessionId: selectedMetaSession,
        metaCategory: metaCategory || undefined,
      });
      toast.success("تم إرسال القالب لميتا للمراجعة");
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل النشر على ميتا");
    } finally {
      setPublishingId(null);
    }
  };

  const createMetaTemplate = async () => {
    if (!selectedMetaSession) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    if (!templateFormContent.trim()) {
      toast.error("محتوى الرسالة مطلوب");
      return;
    }
    if (templateFormContent.length > META_BODY_CHAR_LIMIT) {
      toast.error(`النص أطول من حد ميتا (${META_BODY_CHAR_LIMIT} حرف) — قلّل النص قبل النشر`);
      return;
    }
    const templateId = await persistLocalTemplate();
    if (!templateId) return;
    await publishToMeta(templateId);
  };

  const bindMetaTemplate = async (templateId: string, metaTemplateName: string, metaTemplateLanguage: string) => {
    if (!selectedMetaSession) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setBindingId(templateId);
    try {
      await apiClient.post(`${config.metaOpsBase}/${templateId}/bind-meta`, {
        sessionId: selectedMetaSession,
        metaTemplateName,
        metaTemplateLanguage,
      });
      toast.success("تم ربط القالب بقالب ميتا المعتمد");
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل ربط القالب بميتا");
    } finally {
      setBindingId(null);
    }
  };

  const handleResubmitMeta = async () => {
    if (!selectedTemplate?.id) return;
    if (!templateFormContent.trim()) {
      toast.error("محتوى الرسالة مطلوب");
      return;
    }
    const saved = await persistLocalTemplate();
    if (!saved) return;
    if (templateFormContent.length > META_BODY_CHAR_LIMIT) {
      toast.error(`النص أطول من حد ميتا (${META_BODY_CHAR_LIMIT} حرف) — قلّل النص قبل النشر`);
      return;
    }
    setResubmittingMeta(true);
    try {
      const res = await apiClient.post(`${config.metaOpsBase}/${selectedTemplate.id}/resubmit-meta`, {
        sessionId: selectedMetaSession,
      });
      const data = res.data;
      if (data?.applied && data?.success) {
        const status = data.verifiedStatus || "PENDING";
        toast.success(data.message || `تم تحديث القالب على ميتا — الحالة: ${status}`);
        setDialogOpen(false);
      } else if (data?.success && data?.metaTemplateName) {
        toast.success(data.message || "تم تحديث القالب على ميتا — سيتم تفعيله بعد الموافقة");
        setDialogOpen(false);
      } else if (data?.applied === false) {
        toast.warning(data.applyReason || "ميتا لسه شايلة المحتوى القديم — جرب تاني بعد شوية");
      } else {
        toast.warning(data?.applyReason || "تم تحديث القالب على ميتا — هيتراجع تاني");
      }
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحديث القالب على ميتا");
    } finally {
      setResubmittingMeta(false);
    }
  };

  const requestUnbindMeta = (status: StatusWithTemplate) => {
    const target = status.metaTemplate || (status.template?.metaTemplateName ? status.template : null);
    if (!target?.id) return;
    setUnbindTarget(status);
  };

  const unbindMeta = async (status: StatusWithTemplate) => {
    const target = status.metaTemplate || (status.template?.metaTemplateName ? status.template : null);
    if (!target?.id) return;
    try {
      await apiClient.put(`${config.templateCrudBase}/${target.id}`, {
        metaTemplateName: null,
        metaTemplateId: null,
        metaTemplateStatus: null,
      });
      toast.success("تم فك ربط القالب بقالب ميتا");
      setUnbindTarget(null);
      onDirtyDialog();
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل ربط القالب بميتا");
      setUnbindTarget(null);
    }
  };

  const syncMetaStatuses = async (silent = false) => {
    const metaSessionId = selectedMetaSession || metaSessions[0]?.id;
    if (!metaSessionId) {
      if (!silent) toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    if (!silent) setSyncingStatus(true);
    try {
      const res = await apiClient.post(`${config.metaOpsBase}/sync-status`, { sessionId: metaSessionId });
      const data = res.data as { success?: boolean; synced?: number };
      if (data?.success) {
        const synced = data.synced ?? 0;
        if (synced === 0) {
          if (!silent) toast.success("كل القوالب محدّثة — مفيش حاجة اتغيرت");
        } else {
          toast.success(`تمت مزامنة ${synced} قالب`);
          const rejectedCount = Object.values(deliveryPreview).filter((p) => p.metaTemplateStatus === "REJECTED").length;
          if (rejectedCount > 0) {
            toast.warning(`${rejectedCount} قالب اترفض من ميتا — راجعهم`);
          }
        }
        fetchData();
        fetchDeliveryPreview();
      }
    } catch (err: any) {
      if (silent) console.warn("[META-SYNC] auto-sync failed:", err?.message);
      else toast.error(err?.response?.data?.error || "فشلت المزامنة من ميتا");
    } finally {
      if (!silent) setSyncingStatus(false);
    }
  };

  useEffect(() => {
    if (autoSyncDoneRef.current) return;
    if (statuses.length === 0 || metaSessions.length === 0) return;
    autoSyncDoneRef.current = true;
    const hasBoundMeta = statuses.some((s) => s.template?.metaTemplateName || s.metaTemplate?.metaTemplateName);
    if (hasBoundMeta) syncMetaStatuses(true);
  }, [statuses, metaSessions]);

  const handleBatchPublishToMeta = async (templateIds: string[]) => {
    if (metaSessions.length === 0) {
      toast.error("يرجى ربط وتفعيل جلسة Meta Cloud في واتساب أولاً لتتمكن من إرسال القوالب لميتا");
      return;
    }
    const sessionId = selectedMetaSession || metaSessions[0]?.id;
    if (!sessionId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setBatchPublishing(true);
    try {
      const res = await apiClient.post(`${config.metaOpsBase}/batch-publish-meta`, {
        sessionId,
        templateIds,
      });
      const data = res.data as { success?: boolean; submittedCount?: number; message?: string };
      if (data?.success) {
        toast.success(data.message || `تم إرسال ${data.submittedCount ?? 0} قوالب إلى Meta للمراجعة بنجاح`);
        fetchData();
      } else {
        toast.error("فشل إرسال بعض القوالب إلى Meta");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إرسال القوالب إلى Meta");
    } finally {
      setBatchPublishing(false);
    }
  };

  return {
    metaSessions,
    selectedMetaSession,
    setSelectedMetaSession,
    fetchMetaSessions,
    availableMetaTemplates,
    loadingMetaTemplates,
    headerUploading,
    uploadHeaderMedia,
    publishingId,
    createMetaTemplate,
    bindMetaTemplate,
    bindingId,
    resubmittingMeta,
    handleResubmitMeta,
    unbindTarget,
    setUnbindTarget,
    requestUnbindMeta,
    unbindMeta,
    syncingStatus,
    syncMetaStatuses,
    batchPublishing,
    handleBatchPublishToMeta,
  };
}
