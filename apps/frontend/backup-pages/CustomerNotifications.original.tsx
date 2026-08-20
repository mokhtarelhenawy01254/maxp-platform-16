import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Bell,
  CalendarClock,
  Gift,
  Wallet,
  Star,
  Save,
  RefreshCw,
  TestTube2,
  Link2,
  Unlink,
  Plus,
  FileText,
  Globe,
  CheckCircle2,
  Pencil,
  Image,
} from "lucide-react";

// ΓöÇΓöÇ Shared Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
type Channel = "AUTO" | "BAILEYS" | "META_CLOUD";

interface TemplateItem {
  id: string | null;
  eventType?: string;
  name: string;
  content: string;
  channel: string;
  isActive: boolean;
  isDefault?: boolean;
  variables?: string | null;
  headerFormat?: string | null;
  headerMediaHandle?: string | null;
  metaTemplateName?: string | null;
  metaTemplateId?: string | null;
  metaTemplateStatus?: string | null;
}

interface ScheduleRow {
  id: string;
  eventType: string;
  enabled: boolean;
  activeChannel: Channel;
  delayValue: number;
  delayUnit: "HOURS" | "DAYS";
  label: string;
  category: string;
  trigger: string;
  templates: TemplateItem[];
}

interface WhatsAppSession {
  id: string;
  name?: string;
  phoneNumber?: string;
  provider?: string;
  status?: string;
}

interface MetaTemplateOption {
  name: string;
  status: string;
  language?: string;
  category?: string;
  boundToLocalTemplateId?: string | null;
  boundToEventType?: string | null;
  components?: Array<{ type: string; text?: string; example?: string }>;
}

// ΓöÇΓöÇ Event groups for the template tabs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const EVENT_GROUPS: Record<string, string[]> = {
  loyalty: [
    "LOYALTY_POINTS_AWARDED",
    "LOYALTY_TIER_UPGRADED",
    "LOYALTY_TIER_DOWNGRADED",
    "LOYALTY_POINTS_EXPIRY_WARNING",
    "LOYALTY_POINTS_EXPIRED",
    "LOYALTY_POINTS_REDEEMED",
  ],
  cashback: ["CASHBACK_CREDITED", "CASHBACK_REVERSED"],
  quality: ["CUSTOMER_QUALITY_UPGRADED", "CUSTOMER_QUALITY_DOWNGRADED"],
};

const CHANNEL_LABELS: Record<Channel, string> = {
  AUTO: "╪¬┘ä┘é╪º╪ª┘è",
  BAILEYS: "┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è",
  META_CLOUD: "┘à┘è╪¬╪º (┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪»)",
};

const CHANNEL_COLORS: Record<string, string> = {
  AUTO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  BAILEYS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  META_CLOUD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const emptyTemplate = (eventType: string, channel: string): TemplateItem => ({
  id: null,
  eventType,
  name: "",
  content: "",
  channel,
  isActive: true,
});

interface ScheduleResponse {
  success: boolean;
  data: ScheduleRow[];
}

interface TemplatesResponse {
  success: boolean;
  templates: TemplateItem[];
}

interface SessionsResponse {
  sessions: WhatsAppSession[];
}

interface SimpleResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const CustomerNotifications: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [allTemplates, setAllTemplates] = useState<TemplateItem[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [metaSessionId, setMetaSessionId] = useState("");

  const [editing, setEditing] = useState<{
    row: ScheduleRow;
    enabled: boolean;
    activeChannel: Channel;
    delayValue: number;
    delayUnit: "HOURS" | "DAYS";
  } | null>(null);
  const [savingEvent, setSavingEvent] = useState("");

  const [templateDialog, setTemplateDialog] = useState<{
    eventType: string;
    slot: string;
    template: TemplateItem;
    category: string;
    metaOptions?: MetaTemplateOption[];
    metaLoading?: boolean;
  } | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [testing, setTesting] = useState(false);

  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});

  const togglePreview = useCallback((key: string) => {
    setExpandedPreviews((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ΓöÇΓöÇ Meta flows state ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resubmittingMeta, setResubmittingMeta] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  const metaSessions = useMemo(
    () => sessions.filter((s) => String(s.provider || "").toUpperCase() === "META_CLOUD"),
    [sessions],
  );

  const eventsByType = useMemo(() => {
    const map: Record<string, ScheduleRow | undefined> = {};
    for (const s of schedules) map[s.eventType] = s;
    return map;
  }, [schedules]);

  const templatesForEvent = useCallback((eventType: string): TemplateItem[] => {
    return allTemplates.filter((t) => t.eventType === eventType);
  }, [allTemplates]);

  const slotTemplate = useCallback(
    (eventType: string, slot: string): TemplateItem | undefined => {
      const list = templatesForEvent(eventType);
      if (slot === "META_CLOUD") {
        return list.find((t) => (t.channel || "").toUpperCase() === "META_CLOUD");
      }
      return (
        list.find((t) => (t.channel || "").toUpperCase() === "BAILEYS") ||
        list.find((t) => (t.channel || "").toUpperCase() === "AUTO") ||
        list.find((t) => !t.channel) ||
        undefined
      );
    },
    [templatesForEvent],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleRes, templatesRes, sessionsRes] = await Promise.all([
        apiClient.get<ScheduleResponse>("/hr/customer-loyalty/notifications/schedule"),
        apiClient.get<TemplatesResponse>("/whatsapp-notifications/templates"),
        apiClient.get<SessionsResponse>("/whatsapp/sessions").catch(() => ({ data: { sessions: [] } })),
      ]);

      const rows: ScheduleRow[] = scheduleRes.data?.data || [];
      setSchedules(rows);

      const all: TemplateItem[] = (templatesRes.data?.templates || []).filter(
        (t: TemplateItem) => !!t.eventType && Object.values(EVENT_GROUPS).flat().includes(t.eventType),
      );
      setAllTemplates(all);

      const sessionsList: WhatsAppSession[] = sessionsRes.data?.sessions || [];
      setSessions(sessionsList);
      const meta = sessionsList.find((s) => String(s.provider || "").toUpperCase() === "META_CLOUD");
      setMetaSessionId(meta?.id || "");
    } catch (error) {
      console.error("Error loading customer notifications:", error);
      toast.error("╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveSchedule = async (row: ScheduleRow) => {
    if (!editing) return;
    setSavingEvent(row.eventType);
    try {
      const res = await apiClient.put<SimpleResponse>("/hr/customer-loyalty/notifications/schedule", {
        eventType: row.eventType,
        enabled: editing.enabled,
        activeChannel: editing.activeChannel,
        delayValue: editing.delayValue,
        delayUnit: editing.delayUnit,
      });
      if (res.data?.success) {
        toast.success("╪¬┘à ╪¡┘ü╪╕ ╪º┘ä╪¼╪»┘ê┘ä ╪¿┘å╪¼╪º╪¡");
        setEditing(null);
        await fetchAll();
      } else {
        toast.error(res.data?.error || "┘ü╪┤┘ä ╪º┘ä╪¡┘ü╪╕");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSavingEvent("");
    }
  };

  const openTemplateDialog = async (eventType: string, slot: string) => {
    const existing = slotTemplate(eventType, slot) || emptyTemplate(eventType, slot);
    // ╪º┘ü╪¬╪▒╪º╪╢┘è╪º┘ï ┘ü╪ª╪⌐ CUSTOMER (╪¬╪¬╪▒╪¼┘à ┘ä┘Ç UTILITY ╪╣┘ä┘ë ┘à┘è╪¬╪º = ╪ú╪│┘ç┘ä ┘ü┘è ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐)
    const defaultCategory = slot === "META_CLOUD" ? "CUSTOMER" : "CUSTOMER";
    setTemplateDialog({ eventType, slot, template: { ...existing }, category: defaultCategory });

    // ╪¼┘ä╪¿ ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪¬╪º╪¡╪⌐ ┘ä┘ä╪▒╪¿╪╖ ╪╣┘å╪» ┘ü╪¬╪¡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º
    if (slot === "META_CLOUD") {
      const metaId = selectedMetaSession || metaSessionId || sessions.find((s) => String(s.provider || "").toUpperCase() === "META_CLOUD")?.id;
      if (metaId && !selectedMetaSession) setSelectedMetaSession(metaId);
      if (metaId) {
        try {
          setTemplateDialog((d) => (d ? { ...d, metaLoading: true } : d));
          const res = await apiClient.get<{ success: boolean; templates: MetaTemplateOption[] }>(
            "/whatsapp-notifications/templates/meta-available",
            { params: { sessionId: metaId } },
          );
          setTemplateDialog((d) =>
            d && d.eventType === eventType
              ? { ...d, metaOptions: res.data?.templates || [], metaLoading: false }
              : d,
          );
        } catch (e) {
          setTemplateDialog((d) =>
            d && d.eventType === eventType ? { ...d, metaOptions: [], metaLoading: false } : d,
          );
        }
      }
    }
  };

  // ╪¡┘ü╪╕ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ╪º┘ä╪¡╪º┘ä┘è ┘ü┘è ╪º┘ä╪»┘è╪º┘ä┘ê╪¼ ┘ê╪Ñ╪▒╪¼╪º╪╣ id
  const persistLocalTemplate = async (): Promise<string | null> => {
    if (!templateDialog) return null;
    const { eventType, slot, template, category } = templateDialog;
    if (!template.content.trim()) {
      toast.error("┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ┘à╪╖┘ä┘ê╪¿");
      return null;
    }

    const payload: Record<string, unknown> = {
      name: template.name.trim() || (slot === "META_CLOUD" ? "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º" : "┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿"),
      category: category || "CUSTOMER",
      eventType,
      content: template.content,
      channel: slot,
      variables: extractVariables(template.content),
      isActive: template.isActive,
    };
    if (slot === "META_CLOUD" && template.headerFormat && template.headerFormat !== "TEXT") {
      payload["headerFormat"] = template.headerFormat;
      payload["headerMediaHandle"] = template.headerMediaHandle || null;
    }

    try {
      if (template.id) {
        await apiClient.put<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`, payload);
        return template.id;
      }
      const res = await apiClient.post<{ success: boolean; template?: { id?: string } }>(
        "/whatsapp-notifications/templates",
        payload,
      );
      const newId = res.data?.template?.id;
      if (!newId) {
        toast.error("┘ü╪┤┘ä ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º┘ä╪¿");
        return null;
      }
      setTemplateDialog((d) => (d ? { ...d, template: { ...d.template, id: newId } } : d));
      return newId;
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘é╪º┘ä╪¿");
      return null;
    }
  };

  const uploadHeaderMedia = async (file: File) => {
    const metaId = selectedMetaSession || metaSessionId || metaSessions[0]?.id;
    if (!metaId) {
      toast.error("╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï");
      return;
    }
    setUploadingHeader(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", metaId);
      const res = await apiClient.post<{ success?: boolean; mediaId?: string; fileName?: string; error?: string }>(
        "/whatsapp-templates/templates/upload-media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const data = res.data;
      if (data?.success && data.mediaId) {
        setTemplateDialog((d) =>
          d
            ? {
                ...d,
                template: {
                  ...d.template,
                  headerFormat: "IMAGE",
                  headerMediaHandle: data.mediaId!,
                },
              }
            : d,
        );
        toast.success("╪¬┘à ╪▒┘ü╪╣ ╪º┘ä╪╡┘ê╪▒╪⌐ ΓÇö ╪│╪¬┘Å╪│╪¬╪«╪»┘à ┘â┘ç┘è╪»╪▒ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘å╪» ╪º┘ä┘å╪┤╪▒");
      } else {
        toast.error(data?.error || "┘ü╪┤┘ä ╪▒┘ü╪╣ ╪º┘ä╪╡┘ê╪▒╪⌐");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "┘ü╪┤┘ä ╪▒┘ü╪╣ ╪º┘ä╪╡┘ê╪▒╪⌐ ╪Ñ┘ä┘ë ┘à┘è╪¬╪º");
    } finally {
      setUploadingHeader(false);
    }
  };

  const publishToMeta = async (templateId: string) => {
    const metaId = selectedMetaSession || metaSessionId || metaSessions[0]?.id;
    if (!metaId) {
      toast.error("╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï");
      return;
    }
    setPublishingId(templateId);
    try {
      await apiClient.post<SimpleResponse>(`/whatsapp-notifications/templates/${templateId}/publish`, {
        sessionId: metaId,
      });
      toast.success("╪¬┘à ╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪Ñ┘ä┘ë ┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐");
      // ╪Ñ╪╣╪º╪»╪⌐ ╪¼┘ä╪¿ ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪¬╪º╪¡╪⌐ ┘ä╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪º┘ä╪▒╪¿╪╖
      await openTemplateDialog(templateDialog?.eventType || "", "META_CLOUD");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë ┘à┘è╪¬╪º");
    } finally {
      setPublishingId(null);
    }
  };

  const createMetaTemplate = async () => {
    if (!templateDialog) return;
    if (!selectedMetaSession && !metaSessionId) {
      toast.error("╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï");
      return;
    }
    if (!templateDialog.template.content.trim()) {
      toast.error("┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ┘à╪╖┘ä┘ê╪¿");
      return;
    }
    const templateId = await persistLocalTemplate();
    if (!templateId) return;
    await publishToMeta(templateId);
  };

  const handleResubmitMeta = async () => {
    if (!templateDialog?.template.id) return;
    const metaId = selectedMetaSession || metaSessionId;
    if (!metaId) {
      toast.error("╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï");
      return;
    }
    const saved = await persistLocalTemplate();
    if (!saved) return;
    setResubmittingMeta(true);
    try {
      const res = await apiClient.post<{ success?: boolean; applied?: boolean; message?: string; metaTemplateName?: string; applyReason?: string }>(
        `/whatsapp-notifications/templates/${saved}/resubmit-meta`,
        { sessionId: metaId },
      );
      const data = res.data;
      if (data?.applied && data?.success) {
        toast.success(data.message || "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ΓÇö ╪º┘ä╪¡╪º┘ä╪⌐ ┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐");
      } else if (data?.success && data?.metaTemplateName) {
        toast.success(data.message || "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ΓÇö ╪│┘è╪¬┘à ╪¬┘ü╪╣┘è┘ä┘ç ╪¿╪╣╪» ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐");
      } else if (data?.applied === false) {
        toast.warning(data.applyReason || "┘à┘è╪¬╪º ┘ä╪│┘ç ╪┤╪º┘è┘ä╪⌐ ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪»┘è┘à ΓÇö ╪¼╪▒╪¿ ╪¬╪º┘å┘è ╪¿╪╣╪» ╪┤┘ê┘è╪⌐");
      } else {
        toast.warning(data?.applyReason || "╪¬┘à ╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘é╪º┘ä╪¿ ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à╪▒╪⌐ ╪ú╪«╪▒┘ë");
      }
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º");
    } finally {
      setResubmittingMeta(false);
    }
  };

  const syncMetaStatuses = async () => {
    const metaId = selectedMetaSession || metaSessionId;
    if (!metaId) {
      toast.error("╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï");
      return;
    }
    setSyncingStatus(true);
    try {
      const res = await apiClient.post<SimpleResponse>("/whatsapp-notifications/templates/sync-status", {
        sessionId: metaId,
      });
      toast.success(res.data?.success ? "╪¬┘à╪¬ ┘à╪▓╪º┘à┘å╪⌐ ╪¡╪º┘ä╪º╪¬ ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º" : "╪¬╪╣╪░╪▒╪¬ ╪º┘ä┘à╪▓╪º┘à┘å╪⌐");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ┘à╪▓╪º┘à┘å╪⌐ ╪¡╪º┘ä╪º╪¬ ┘à┘è╪¬╪º");
    } finally {
      setSyncingStatus(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateDialog) return;
    const { eventType, slot, template, category } = templateDialog;
    if (!template.name.trim() || !template.content.trim()) {
      toast.error("╪º╪│┘à ╪º┘ä┘é╪º┘ä╪¿ ┘ê╪º┘ä┘à╪¡╪¬┘ê┘ë ┘à╪╖┘ä┘ê╪¿╪º┘å");
      return;
    }

    const payload = {
      name: template.name.trim(),
      category: category || "CUSTOMER",
      eventType,
      content: template.content,
      channel: slot,
      variables: extractVariables(template.content),
      isActive: template.isActive,
    };

    try {
      if (template.id) {
        await apiClient.put<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`, payload);
        toast.success("╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘å╪¼╪º╪¡");
      } else {
        await apiClient.post<SimpleResponse>("/whatsapp-notifications/templates", payload);
        toast.success("╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘å╪¼╪º╪¡");
      }
      setTemplateDialog(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘é╪º┘ä╪¿");
    }
  };

  const deleteTemplate = async (template: TemplateItem) => {
    if (!template.id) return;
    if (!window.confirm("┘ç┘ä ╪¬╪▒┘è╪» ╪¡╪░┘ü ┘ç╪░╪º ╪º┘ä┘é╪º┘ä╪¿╪ƒ")) return;
    try {
      await apiClient.delete<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`);
      toast.success("╪¬┘à ╪¡╪░┘ü ╪º┘ä┘é╪º┘ä╪¿");
      setTemplateDialog(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪¡╪░┘ü ╪º┘ä┘é╪º┘ä╪¿");
    }
  };

  const bindMetaTemplate = async (metaName: string) => {
    if (!templateDialog) return;
    const metaId = selectedMetaSession || metaSessionId || metaSessions[0]?.id;
    if (!metaId) {
      toast.error("╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï");
      return;
    }
    // ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ┘ä╪│┘ç ┘à┘ü┘è╪┤ id╪î ┘å╪¡┘ü╪╕┘ç ╪º┘ä╪ú┘ê┘ä
    let templateId = templateDialog.template.id;
    if (!templateId) {
      templateId = await persistLocalTemplate();
      if (!templateId) return;
    }
    try {
      await apiClient.post<SimpleResponse>(`/whatsapp-notifications/templates/${templateId}/bind-meta`, {
        sessionId: metaId,
        metaTemplateName: metaName,
        metaTemplateLanguage: "ar",
      });
      toast.success("╪¬┘à ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º");
      setTemplateDialog((d) =>
        d ? { ...d, template: { ...d.template, id: templateId, metaTemplateName: metaName } } : d,
      );
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ╪▒╪¿╪╖ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º");
    }
  };

  const confirmUnbind = async (template: TemplateItem) => {
    if (!template.id) return;
    if (!window.confirm("┘ç┘ä ╪¬╪▒┘è╪» ┘ü┘â ╪▒╪¿╪╖ ┘ç╪░╪º ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º╪ƒ")) return;
    try {
      await apiClient.put<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`, {
        metaTemplateName: null,
        metaTemplateId: null,
        metaTemplateStatus: null,
      });
      toast.success("╪¬┘à ┘ü┘â ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿");
      setTemplateDialog(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "┘ü╪┤┘ä ┘ü┘â ╪º┘ä╪▒╪¿╪╖");
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim() || !testEvent) {
      toast.error("╪ú╪»╪«┘ä ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ┘ê╪º╪«╪¬╪▒ ╪º┘ä╪¡╪»╪½");
      return;
    }
    setTesting(true);
    try {
      const res = await apiClient.post<SimpleResponse>("/whatsapp-notifications/test", {
        phone: testPhone.trim(),
        eventType: testEvent,
      });
      if (res.data?.success) toast.success("╪¬┘à ╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä╪¬╪¼╪▒┘è╪¿┘è");
      else toast.error(res.data?.message || res.data?.error || "┘ü╪┤┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || "┘ü╪┤┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¬╪¼╪▒┘è╪¿┘è");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const eventOptions = schedules.map((s) => (
    <option key={s.eventType} value={s.eventType}>
      {s.label}
    </option>
  ));

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* ΓöÇΓöÇ Header ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ╪Ñ╪»╪º╪▒╪⌐ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘ê┘ä╪º╪í ┘ê╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ┘ê╪¬┘é╪│┘è┘à ╪º┘ä╪╣┘à┘ä╪º╪í ΓÇö ╪º┘ä┘é┘ê╪º┘ä╪¿ ┘ê┘à┘ê╪º╪╣┘è╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 ml-1" />
          ╪¬╪¡╪»┘è╪½
        </Button>
      </div>

      {/* ΓöÇΓöÇ Test sender strip ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] items-end">
            <div>
              <Label className="text-xs text-gray-500">╪Ñ╪▒╪│╪º┘ä ╪¬╪¼╪▒┘è╪¿┘è (╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü)</Label>
              <Input
                dir="ltr"
                className="mt-1"
                placeholder="01000000000"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">╪º┘ä╪¡╪»╪½</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value)}
              >
                <option value="">╪º╪«╪¬╪▒ ╪º┘ä╪¡╪»╪½...</option>
                {eventOptions}
              </select>
            </div>
            <Button onClick={sendTest} disabled={testing} className="gap-1">
              <TestTube2 className="h-4 w-4" />
              {testing ? "╪¼╪º╪▒┘ì ╪º┘ä╪Ñ╪▒╪│╪º┘ä..." : "╪Ñ╪▒╪│╪º┘ä ╪¬╪¼╪▒┘è╪¿┘è"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schedule">
        <TabsList className="flex-wrap">
          <TabsTrigger value="schedule" className="gap-1">
            <CalendarClock className="h-4 w-4" /> ╪¼╪»┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1">
            <Gift className="h-4 w-4" /> ┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê┘ä╪º╪í
          </TabsTrigger>
          <TabsTrigger value="cashback" className="gap-1">
            <Wallet className="h-4 w-4" /> ┘é┘ê╪º┘ä╪¿ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1">
            <Star className="h-4 w-4" /> ┘é┘ê╪º┘ä╪¿ ╪º┘ä╪¬┘é╪│┘è┘à
          </TabsTrigger>
        </TabsList>

        {/* ΓöÇΓöÇ Schedule tab ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>╪¼╪»┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬</CardTitle>
              <CardDescription>
                ╪¡╪»╪» ┘ä┘â┘ä ╪¡╪»╪½: ┘ç┘ä ┘è╪¬╪¿╪╣╪¬╪î ╪º┘ä┘é┘å╪º╪⌐ ╪º┘ä┘å╪┤╪╖╪⌐╪î ┘ê┘à╪¬┘ë ┘è╪¬╪¿╪╣╪¬ (╪¿╪╣╪» ┘é╪» ╪Ñ┘è┘ç)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="py-3 px-2 text-right font-medium">╪º┘ä╪¡╪»╪½</th>
                    <th className="py-3 px-2 text-right font-medium">┘è╪¬╪¿╪╣╪¬ ╪º┘à╪¬┘è</th>
                    <th className="py-3 px-2 text-right font-medium">╪¿╪╣╪» ┘é╪» ╪º┘è┘ç</th>
                    <th className="py-3 px-2 text-right font-medium">╪º┘ä┘é┘å╪º╪⌐ ╪º┘ä┘å╪┤╪╖╪⌐</th>
                    <th className="py-3 px-2 text-right font-medium">╪º┘ä┘é┘ê╪º┘ä╪¿</th>
                    <th className="py-3 px-2 text-right font-medium">┘à┘ü╪╣┘æ┘ä</th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((row) => {
                    const isEditing = editing?.row.eventType === row.eventType;
                    const normalTpl = slotTemplate(row.eventType, "BAILEYS");
                    const metaTpl = slotTemplate(row.eventType, "META_CLOUD");
                    return (
                      <tr
                        key={row.eventType}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <td className="py-3 px-2">
                          <p className="font-medium text-gray-900 dark:text-white">{row.label}</p>
                          <p className="text-xs text-gray-400" dir="ltr">
                            {row.eventType}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{row.trigger}</td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                className="w-20"
                                value={editing!.delayValue}
                                onChange={(e) =>
                                  setEditing((d) => (d ? { ...d, delayValue: Number(e.target.value) || 0 } : d))
                                }
                              />
                              <Select
                                value={editing!.delayUnit}
                                onValueChange={(v) =>
                                  setEditing((d) => (d ? { ...d, delayUnit: v as "HOURS" | "DAYS" } : d))
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="HOURS">╪│╪º╪╣╪⌐</SelectItem>
                                  <SelectItem value="DAYS">┘è┘ê┘à</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : row.delayValue > 0 ? (
                            <span className="text-gray-700 dark:text-gray-200">
                              {row.delayValue} {row.delayUnit === "DAYS" ? "┘è┘ê┘à" : "╪│╪º╪╣╪⌐"}
                            </span>
                          ) : (
                            <span className="text-gray-400">┘ü┘ê╪▒┘è</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <Select
                              value={editing!.activeChannel}
                              onValueChange={(v) =>
                                setEditing((d) => (d ? { ...d, activeChannel: v as Channel } : d))
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AUTO">╪¬┘ä┘é╪º╪ª┘è (┘à┘è╪¬╪º ΓåÉ ╪╣╪º╪»┘è)</SelectItem>
                                <SelectItem value="BAILEYS">┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è</SelectItem>
                                <SelectItem value="META_CLOUD">┘à┘è╪¬╪º ┘ü┘é╪╖</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={CHANNEL_COLORS[row.activeChannel]}>
                              {CHANNEL_LABELS[row.activeChannel]}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline">
                              ╪╣╪º╪»┘è: {normalTpl ? (normalTpl.name || "╪º┘ü╪¬╪▒╪º╪╢┘è") : "╪║┘è╪▒ ┘à╪¡╪»╪»"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={metaTpl?.metaTemplateStatus === "APPROVED" ? "border-blue-400 text-blue-600" : ""}
                            >
                              ┘à┘è╪¬╪º: {metaTpl ? metaTpl.name || "╪║┘è╪▒ ┘à╪│┘à┘æ┘ë" : "╪║┘è╪▒ ┘à╪¡╪»╪»"}
                              {metaTpl?.metaTemplateStatus === "APPROVED" ? " (┘à╪╣╪¬┘à╪»)" : ""}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Switch
                            checked={isEditing ? editing!.enabled : row.enabled}
                            onCheckedChange={(v) => {
                              if (isEditing) {
                                setEditing((d) => (d ? { ...d, enabled: v } : d));
                              } else {
                                setEditing({
                                  row,
                                  enabled: v,
                                  activeChannel: row.activeChannel,
                                  delayValue: row.delayValue,
                                  delayUnit: row.delayUnit,
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => saveSchedule(row)}
                                disabled={savingEvent === row.eventType}
                                className="gap-1"
                              >
                                <Save className="h-3.5 w-3.5" />
                                ╪¡┘ü╪╕
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                ╪Ñ┘ä╪║╪º╪í
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditing({
                                  row,
                                  enabled: row.enabled,
                                  activeChannel: row.activeChannel,
                                  delayValue: row.delayValue,
                                  delayUnit: row.delayUnit,
                                })
                              }
                            >
                              ╪¬╪╣╪»┘è┘ä
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ΓöÇΓöÇ Template tabs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        {(["loyalty", "cashback", "quality"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>
                    {tab === "loyalty"
                      ? "┘é┘ê╪º┘ä╪¿ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘ê┘ä╪º╪í"
                      : tab === "cashback"
                        ? "┘é┘ê╪º┘ä╪¿ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â"
                        : "┘é┘ê╪º┘ä╪¿ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪¬┘é╪│┘è┘à"}
                  </CardTitle>
                  <CardDescription>
                    ┘ä┘â┘ä ╪¡╪»╪½ ┘é╪º┘ä╪¿╪º┘å (┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è + ┘à┘è╪¬╪º) ΓÇö ╪╣╪»┘æ┘ä ╪º┘ä┘é╪º┘ä╪¿┘è┘å ┘ê╪¡╪»╪» ╪º┘ä┘ü╪╣┘æ╪º┘ä ┘à┘å ╪¼╪»┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬
                  </CardDescription>
                </div>
                {sessions.some((s) => String(s.provider || "").toUpperCase() === "META_CLOUD") && (
                  <div className="w-64">
                    <Label className="text-xs text-gray-500">╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘ä┘ä╪▒╪¿╪╖</Label>
                    <Select value={metaSessionId} onValueChange={(v) => v && setMetaSessionId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions
                          .filter((s) => String(s.provider || "").toUpperCase() === "META_CLOUD")
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name || s.phoneNumber || s.id}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {(EVENT_GROUPS[tab] || []).map((eventType) => {
                  const row = eventsByType[eventType];
                  return (
                    <div key={eventType} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {row?.label || eventType}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {row?.trigger} ΓÇö <span className="font-mono" dir="ltr">{eventType}</span>
                          </p>
                        </div>
                        {row && (
                          <Badge className={CHANNEL_COLORS[row.activeChannel]}>
                            ╪º┘ä┘é┘å╪º╪⌐: {CHANNEL_LABELS[row.activeChannel]}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <TemplateSlotCard
                          slot="BAILEYS"
                          eventType={eventType}
                          template={slotTemplate(eventType, "BAILEYS")}
                          isPreviewExpanded={!!expandedPreviews[`BAILEYS-${eventType}`]}
                          onTogglePreview={() => togglePreview(`BAILEYS-${eventType}`)}
                          onOpen={() => openTemplateDialog(eventType, "BAILEYS")}
                        />
                        <TemplateSlotCard
                          slot="META_CLOUD"
                          eventType={eventType}
                          template={slotTemplate(eventType, "META_CLOUD")}
                          isPreviewExpanded={!!expandedPreviews[`META_CLOUD-${eventType}`]}
                          onTogglePreview={() => togglePreview(`META_CLOUD-${eventType}`)}
                          onOpen={() => openTemplateDialog(eventType, "META_CLOUD")}
                          onUnbind={(tpl) => confirmUnbind(tpl)}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ΓöÇΓöÇ Template editor dialog ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <Dialog
        open={!!templateDialog}
        onOpenChange={(open) => !open && setTemplateDialog(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {templateDialog && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    templateDialog.slot === "META_CLOUD"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}
                >
                  {templateDialog.slot === "META_CLOUD" ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {templateDialog.slot === "META_CLOUD" ? "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º" : "┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è"}
                </span>
              )}
              <DialogTitle className="text-base">
                {templateDialog && eventsByType[templateDialog.eventType]?.label}
              </DialogTitle>
            </div>
            <DialogDescription>
              {templateDialog && (
                <span className="font-mono" dir="ltr">
                  {templateDialog.eventType}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {templateDialog && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>╪º╪│┘à ╪º┘ä┘é╪º┘ä╪¿</Label>
                <Input
                  value={templateDialog.template.name}
                  onChange={(e) =>
                    setTemplateDialog((d) =>
                      d ? { ...d, template: { ...d.template, name: e.target.value } } : d,
                    )
                  }
                  placeholder={templateDialog.slot === "META_CLOUD" ? "┘à╪½╪º┘ä: ┘â╪│╪¿ ┘å┘é╪º╪╖ ┘ê┘ä╪º╪í" : "┘à╪½╪º┘ä: ╪Ñ╪┤╪╣╪º╪▒ ┘â╪│╪¿ ┘å┘é╪º╪╖"}
                />
              </div>

              {/* ┘ü╪ª╪⌐ ╪º┘ä┘é╪º┘ä╪¿ ΓÇö ╪¬╪¡╪»╪» ╪¬╪╡┘å┘è┘ü ┘à┘è╪¬╪º ╪╣┘å╪» ╪º┘ä┘å╪┤╪▒ */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  ┘å┘ê╪╣/┘ü╪ª╪⌐ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ΓÇö ╪¿╪¬╪¡╪»╪» ╪¬╪╡┘å┘è┘ü ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪╣┘å╪» ╪º┘ä┘å╪┤╪▒
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={templateDialog.category}
                    onValueChange={(v) =>
                      setTemplateDialog((d) => (d ? { ...d, category: v || "CUSTOMER" } : d))
                    }
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">UTILITY (┘à┘Å┘ê╪╡┘ë ╪¿┘ç ┘ä┘ä┘ê┘ä╪º╪í)</SelectItem>
                      <SelectItem value="SYSTEM">UTILITY (┘å╪╕╪º┘à┘è)</SelectItem>
                      <SelectItem value="MARKETING">MARKETING (╪¬╪▒┘ê┘è╪¼┘è)</SelectItem>
                      <SelectItem value="GENERAL">UTILITY (╪╣╪º┘à)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-relaxed text-gray-400">
                    <strong>UTILITY</strong> ┘è╪¬╪▒╪¼┘à ┘ä┘Ç UTILITY ╪╣┘ä┘ë ┘à┘è╪¬╪º = ┘à┘ê╪º┘ü┘é╪⌐ ╪ú╪│╪▒╪╣.
                    <strong> MARKETING</strong> ┘à╪¡╪¬╪º╪¼ opt-in ┘à┘å ╪º┘ä╪╣┘à┘è┘ä ┘ê┘à╪▒╪º╪¼╪╣╪⌐ ╪ú╪┤╪».
                  </p>
                </div>
              </div>

              {/* ╪╡┘ê╪▒╪⌐ ╪º┘ä╪▒╪ú╪│ (┘à┘è╪¬╪º ┘ü┘é╪╖) */}
              {templateDialog.slot === "META_CLOUD" && (
                <div className="space-y-1.5 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    ╪╡┘ê╪▒╪⌐ ╪º┘ä╪▒╪ú╪│ (HEADER) ΓÇö ╪º╪«╪¬┘è╪º╪▒┘è
                  </Label>
                  {templateDialog.template.headerMediaHandle ? (
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                      <Image className="size-4 shrink-0 text-slate-400" />
                      <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400" dir="ltr">
                        {templateDialog.template.headerMediaHandle}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplateDialog((d) =>
                            d ? { ...d, template: { ...d.template, headerFormat: "TEXT", headerMediaHandle: null } } : d,
                          )
                        }
                        className="shrink-0 text-[11px] font-medium text-red-500 hover:text-red-600"
                      >
                        ╪Ñ╪▓╪º┘ä╪⌐
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                      <Image className="size-4" />
                      {uploadingHeader ? "╪¼╪º╪▒┘è ╪º┘ä╪▒┘ü╪╣ ╪Ñ┘ä┘ë ┘à┘è╪¬╪º..." : "╪º╪«╪¬╪▒ ╪╡┘ê╪▒╪⌐ ┘ä┘ä╪▒╪ú╪│"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingHeader}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadHeaderMedia(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                    ┘à┘è╪¬╪º ╪¬╪¬╪╖┘ä╪¿ sample media ┘ä┘ç┘è╪»╪▒ IMAGE ΓÇö ╪¬┘Å╪▒┘ü╪╣ ╪º┘ä╪╡┘ê╪▒╪⌐ ┘ê╪¬┘Å╪│╪¬╪«╪»┘à ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘å╪» ╪º┘ä┘å╪┤╪▒.
                  </p>
                </div>
              )}

              {/* ╪º┘ä┘à╪¡╪▒╪▒ + ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪¼┘å╪¿ ╪¿╪╣╪╢ */}
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿</Label>
                    <span
                      className={`text-[10px] font-medium tabular-nums ${
                        templateDialog.slot === "META_CLOUD" &&
                        templateDialog.template.content.length > 1024
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {templateDialog.template.content.length} / {templateDialog.slot === "META_CLOUD" ? 1024 : "Γê₧"}
                    </span>
                  </div>
                  <Textarea
                    rows={7}
                    className="font-mono text-sm"
                    value={templateDialog.template.content}
                    onChange={(e) =>
                      setTemplateDialog((d) =>
                        d ? { ...d, template: { ...d.template, content: e.target.value } } : d,
                      )
                    }
                    placeholder="╪º┘â╪¬╪¿ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘ç┘å╪º... ╪º╪│╪¬╪«╪»┘à {╪º┘ä┘à╪¬╪║┘è╪▒} ┘ä┘ä┘à╪¬╪║┘è╪▒╪º╪¬"
                  />
                  <p className="text-xs text-gray-400">
                    ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬: <code>{extractVariables(templateDialog.template.content).map((v) => `{${v}}`).join(" ")}</code>
                  </p>
                </div>

                <WhatsAppBubblePreview
                  content={resolveVariablesForPreview(templateDialog.template.content)}
                  isMeta={templateDialog.slot === "META_CLOUD"}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowVariables(!showVariables)}
                className="text-[11px] text-indigo-600 hover:text-indigo-700"
              >
                {showVariables ? "╪Ñ╪«┘ü╪º╪í ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐" : "╪╣╪▒╪╢ ┘â┘ä ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐"}
              </button>
              {showVariables && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-gray-50 text-right dark:bg-gray-800">
                        <th className="px-2 py-1 font-medium text-gray-500">╪º┘ä┘à╪¬╪║┘è╪▒</th>
                        <th className="px-2 py-1 font-medium text-gray-500">╪º┘ä┘ê╪╡┘ü</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {Object.entries(VARIABLE_DESCRIPTIONS).map(([v, desc]) => (
                        <tr key={v} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="whitespace-nowrap px-2 py-1 font-mono text-indigo-600 dark:text-indigo-400">
                            {`{${v}}`}
                          </td>
                          <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>┘é╪º┘ä╪¿ ┘ü╪╣╪º┘ä</Label>
                  <Switch
                    checked={templateDialog.template.isActive}
                    onCheckedChange={(v) =>
                      setTemplateDialog((d) =>
                        d ? { ...d, template: { ...d.template, isActive: v } } : d,
                      )
                    }
                  />
                </div>
                {templateDialog.template.id && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteTemplate(templateDialog.template)}>
                    ╪¡╪░┘ü
                  </Button>
                )}
              </div>

              {templateDialog.slot === "META_CLOUD" && (
                <div className="space-y-3">
                  {/* ╪¬┘ê╪╢┘è╪¡ ╪│┘ä┘ê┘â ╪º┘ä┘é┘å╪º╪⌐ */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300">
                    Γÿü∩╕Å <strong>┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪» (APPROVED) ┘ç┘ê ╪º┘ä┘ä┘è ╪¿┘è╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä</strong> ╪╣┘å╪»┘à╪º ╪¬┘â┘ê┘å ╪º┘ä╪¼┘ä╪│╪⌐
                    ╪º┘ä╪ú╪│╪º╪│┘è╪⌐ Meta Cloud ┘ê╪º┘ä┘é┘å╪º╪⌐ ╪º┘ä┘å╪┤╪╖╪⌐ ┘ü┘è ╪º┘ä╪¼╪»┘ê┘ä "┘à┘è╪¬╪º ┘ü┘é╪╖" ╪ú┘ê "╪¬┘ä┘é╪º╪ª┘è".
                    ╪º┘ä┘å╪╡ ╪º┘ä┘ä┘è ╪¿╪¬┘â╪¬╪¿┘ç ┘ç┘å╪º ┘ç┘ê ╪º┘ä┘à╪▒╪¼╪╣ ┘ä┘ä╪▒╪¿╪╖/╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë ┘à┘è╪¬╪º.
                  </div>

                  {/* ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘ä┘ä╪▒╪¿╪╖/╪º┘ä┘å╪┤╪▒</Label>
                    <Select
                      value={selectedMetaSession || metaSessionId}
                      onValueChange={(v) => v && setSelectedMetaSession(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º" />
                      </SelectTrigger>
                      <SelectContent>
                        {metaSessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name || s.phoneNumber || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à╪╣ ┘à┘è╪¬╪º */}
                  {templateDialog.template.metaTemplateName && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600"
                      disabled={syncingStatus}
                      onClick={syncMetaStatuses}
                    >
                      {syncingStatus ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      ┘à╪▓╪º┘à┘å╪⌐ ╪¡╪º┘ä╪⌐ ╪º┘ä┘é╪º┘ä╪¿ ┘à╪╣ ┘à┘è╪¬╪º
                    </Button>
                  )}

                  {/* ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪» */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    disabled={!!publishingId}
                    onClick={createMetaTemplate}
                  >
                    {publishingId ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {publishingId ? "╪¼╪º╪▒┘ì ╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë ┘à┘è╪¬╪º..." : "╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪» ┘ê┘å╪┤╪▒┘ç"}
                  </Button>

                  {/* ╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» ┘à┘ê╪¼┘ê╪» */}
                  <div className="border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Link2 className="h-4 w-4 text-blue-600" />
                      ╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» ┘à┘ê╪¼┘ê╪»
                    </div>
                    {templateDialog.metaLoading ? (
                      <p className="text-xs text-gray-400">╪¼╪º╪▒┘ì ╪¼┘ä╪¿ ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º...</p>
                    ) : templateDialog.metaOptions && templateDialog.metaOptions.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          value={templateDialog.template.metaTemplateName || ""}
                          onChange={(e) => {
                            const opt = templateDialog.metaOptions?.find((m) => m.name === e.target.value);
                            setTemplateDialog((d) =>
                              d
                                ? {
                                    ...d,
                                    template: {
                                      ...d.template,
                                      metaTemplateName: e.target.value || null,
                                      metaTemplateId: opt?.name || null,
                                    },
                                  }
                                : d,
                            );
                          }}
                        >
                          <option value="">╪º╪«╪¬╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º...</option>
                          {templateDialog.metaOptions
                            .filter(
                              (m) =>
                                !m.boundToLocalTemplateId ||
                                m.boundToLocalTemplateId === templateDialog.template.id,
                            )
                            .map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name} {m.category ? `(${m.category})` : ""}
                                {m.boundToEventType ? ` - ┘à╪▒╪¿┘ê╪╖ ╪¿┘Ç ${m.boundToEventType}` : ""}
                              </option>
                            ))}
                        </select>
                        {templateDialog.template.metaTemplateName && (
                          <Button size="sm" className="w-full" onClick={() => bindMetaTemplate(templateDialog.template.metaTemplateName!)}>
                            <Link2 className="h-3.5 w-3.5" />
                            ╪¡┘ü╪╕ ╪º┘ä╪▒╪¿╪╖
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600">
                        ┘ä╪º ╪¬┘ê╪¼╪» ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪»╪⌐ ┘à╪¬╪º╪¡╪⌐ ΓÇö ╪ú┘å╪┤╪ª ┘é╪º┘ä╪¿╪º┘ï ┘à┘å ╪º┘ä╪▓╪▒ ╪ú╪╣┘ä╪º┘ç ╪ú┘ê ╪¬╪ú┘â╪» ┘à┘å ╪º╪¬╪╡╪º┘ä ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º
                      </p>
                    )}
                  </div>

                  {/* ╪¬╪╖╪º╪¿┘é ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬: {{1}} ΓåÉ ╪º┘ä┘à╪¬╪║┘è╪▒ ╪º┘ä┘à╪¡┘ä┘è */}
                  <VariableMappingTable template={templateDialog.template} metaOptions={templateDialog.metaOptions || []} />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {templateDialog?.slot === "META_CLOUD" && templateDialog.template.metaTemplateName && (
              <Button
                variant="outline"
                className="text-blue-700 border-blue-300"
                disabled={resubmittingMeta}
                onClick={handleResubmitMeta}
              >
                {resubmittingMeta ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                ╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»
              </Button>
            )}
            <Button variant="outline" onClick={() => setTemplateDialog(null)}>
              ╪Ñ┘ä╪║╪º╪í
            </Button>
            <Button onClick={saveTemplate} className="gap-1">
              <Save className="h-4 w-4" />
              ╪¡┘ü╪╕ ╪º┘ä┘é╪º┘ä╪¿
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const extractVariables = (content: string): string[] => {
  const matches = content.match(/\{(\w+)\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
};

// ┘é┘è┘à ┘å┘à┘ê╪░╪¼┘è╪⌐ ┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘ü┘è ┘â╪▒┘ê╪¬ ╪º┘ä┘é┘ê╪º┘ä╪¿
const PREVIEW_VARIABLES: Record<string, string> = {
  customerName: "╪╣┘à┘è┘ä┘å╪º ╪º┘ä┘â╪▒┘è┘à",
  points: "50",
  currentPoints: "120",
  reason: "╪╖┘ä╪¿ #10025",
  tierName: "╪░┘ç╪¿┘è",
  expiryDate: "2026-09-01",
  programName: "╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í",
  cashAmount: "25.00",
  currency: "╪¼.┘à",
  orderNumber: "10025",
  balance: "75.00",
  qualityTier: "VIP",
  score: "85",
};

function resolveVariablesForPreview(content: string): string {
  return content.replace(/\{(\w+)\}/g, (_, name) => PREVIEW_VARIABLES[name] || name);
}

// ╪º╪│╪¬╪«╪▒╪º╪¼ ╪ú╪│┘à╪º╪í ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¡┘ä┘è╪⌐ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪░┘è ╪¬╪╕┘ç╪▒ ╪¿┘ç ┘ü┘è ╪º┘ä┘à╪¡╪¬┘ê┘ë
// ┘è┘Å╪│╪¬╪«╪»┘à ┘ä╪▒╪¿╪╖ ┘â┘ä ┘à╪¬╪║┘è╪▒ ┘à╪¡┘ä┘è {customerName} ╪¿╪▒┘é┘à ┘à┘è╪¬╪º {{1}}╪î {{2}}... ╪¿╪╡╪▒┘è╪º┘ï
function extractLocalVariableOrder(content: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const re = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1];
    if (!name) continue;
    if (!seen.has(name)) {
      seen.add(name);
      order.push(name);
    }
  }
  return order;
}

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  customerName: "╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä",
  points: "╪╣╪»╪» ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä┘à┘â╪¬╪│╪¿╪⌐/╪º┘ä┘à╪│╪¬╪¿╪»┘ä╪⌐",
  currentPoints: "╪▒╪╡┘è╪» ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä╪¡╪º┘ä┘è",
  reason: "╪│╪¿╪¿ ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐/╪º┘ä╪«╪╡┘à",
  tierName: "╪º╪│┘à ╪º┘ä┘à╪│╪¬┘ê┘ë ╪º┘ä╪¼╪»┘è╪»",
  expiryDate: "╪¬╪º╪▒┘è╪« ╪º┘å╪¬┘ç╪º╪í ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐",
  programName: "╪º╪│┘à ╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í",
  cashAmount: "┘é┘è┘à╪⌐ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â/╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä",
  currency: "╪º┘ä╪╣┘à┘ä╪⌐ (╪¼.┘à)",
  orderNumber: "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿",
  balance: "╪▒╪╡┘è╪» ╪º┘ä┘à╪¡┘ü╪╕╪⌐ ╪º┘ä╪¡╪º┘ä┘è",
  qualityTier: "╪¬╪╡┘å┘è┘ü ╪º┘ä╪¼┘ê╪»╪⌐ (VIP/╪╣╪º┘ä┘è/┘à╪¬┘ê╪│╪╖/┘à┘å╪«┘ü╪╢)",
  score: "╪»╪▒╪¼╪⌐ ╪º┘ä╪¼┘ê╪»╪⌐ ┘à┘å 100",
};

// ┘à╪╣╪º┘è┘å╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐ ╪╣┘ä┘ë ╪┤┘â┘ä ┘ü┘é╪º╪╣╪⌐ ┘ê╪º╪¬╪│╪º╪¿
function WhatsAppBubblePreview({ content, isMeta }: { content: string; isMeta?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-[#e5ddd5] p-3 dark:border-gray-700 dark:bg-slate-900/70">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          ┘à╪╣╪º┘è┘å╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐
        </p>
        <span className="text-[9px] text-gray-400">┘à╪¬╪¼╪▒┘â</span>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#d9fdd3] px-3 py-2 shadow-sm dark:bg-green-900/40">
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-800 dark:text-gray-100">
            {content.trim() ? content : "╪º┘â╪¬╪¿ ╪º┘ä┘à╪¡╪¬┘ê┘ë ┘ä╪¬╪▒┘ë ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ┘ç┘å╪º..."}
          </p>
          <p className="mt-1 text-right text-[9px] text-gray-500 dark:text-gray-400" dir="ltr">
            {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} Γ£ôΓ£ô
          </p>
        </div>
      </div>
      {isMeta && (
        <p className="mt-2 rounded bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Γÿü∩╕Å ╪│┘è┘Å╪▒╪│┘ä ╪╣╪¿╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»
        </p>
      )}
    </div>
  );
}

// ΓöÇΓöÇ Template slot card (┘å┘ü╪│ ╪¬┘é╪│┘è┘à╪⌐ ╪╡┘ü╪¡╪⌐ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬) ΓöÇΓöÇ
interface TemplateSlotCardProps {
  slot: "BAILEYS" | "META_CLOUD";
  eventType: string;
  template: TemplateItem | undefined;
  isPreviewExpanded: boolean;
  onTogglePreview: () => void;
  onOpen: () => void;
  onUnbind?: (template: TemplateItem) => void;
}

function TemplateSlotCard({
  slot,
  eventType,
  template,
  isPreviewExpanded,
  onTogglePreview,
  onOpen,
  onUnbind,
}: TemplateSlotCardProps) {
  const isMeta = slot === "META_CLOUD";
  const bound = !!template?.metaTemplateName;
  const metaStatus = String(template?.metaTemplateStatus || "").toUpperCase();
  const hasContent = !!template?.content;

  const colors = isMeta
    ? {
        border: "border-blue-200 dark:border-blue-800/40",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        bg: "bg-blue-50/40 dark:bg-blue-900/10",
        accent: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30",
      }
    : {
        border: "border-emerald-200 dark:border-emerald-800/40",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        bg: "bg-emerald-50/40 dark:bg-emerald-900/10",
        accent: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
      };

  const statusBadge = isMeta
    ? bound
      ? metaStatus === "APPROVED"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : metaStatus === "REJECTED"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : template
        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : template
      ? template.isActive === false
        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

  const statusLabel = isMeta
    ? bound
      ? metaStatus === "APPROVED"
        ? "Γ£à ┘à╪╣╪¬┘à╪»"
        : metaStatus === "REJECTED"
          ? "Γ¥î ┘à╪▒┘ü┘ê╪╢"
          : metaStatus
            ? `ΓÅ│ ${metaStatus}`
            : "┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐"
      : template
        ? "┘à╪¡┘ü┘ê╪╕ (╪¿╪»┘ê┘å ╪▒╪¿╪╖)"
        : "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿"
    : template
      ? template.isActive === false
        ? "ΓÅ╕ ┘à╪¬┘ê┘é┘ü"
        : "┘è┘ê╪¼╪» ┘é╪º┘ä╪¿"
      : "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿";

  return (
    <div data-testid={`${slot}-slot-${eventType}`} className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors.badge}`}>
          {isMeta ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          {isMeta ? "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º" : "┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è"}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge}`}>
          {isMeta && bound ? <CheckCircle2 className="h-3 w-3" /> : null}
          {statusLabel}
        </span>
      </div>

      {isMeta && bound && template?.metaTemplateName && (
        <p className="mt-1.5 truncate font-mono text-[11px] text-blue-700 dark:text-blue-300" dir="ltr">
          {template.metaTemplateName}
        </p>
      )}

      <div className="mt-1.5 min-h-[2.75rem]">
        {template ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {template.name || "┘é╪º┘ä╪¿ ╪║┘è╪▒ ┘à╪│┘à┘æ┘ë"}
              {template.isDefault ? " (╪º┘ü╪¬╪▒╪º╪╢┘è)" : ""}
            </p>
            {hasContent && (
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-400">
                {resolveVariablesForPreview(template.content)}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMeta ? "┘ä╪º ┘è┘ê╪¼╪» ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ä┘ç╪░╪º ╪º┘ä╪¡╪»╪½" : "┘ä╪º ┘è┘ê╪¼╪» ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è ΓÇö ╪º╪│╪¬╪«╪»┘à ╪▓╪▒ ╪º┘ä╪Ñ┘å╪┤╪º╪í"}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {hasContent && (
          <button
            onClick={onTogglePreview}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            <FileText className="h-3 w-3" />
            {isPreviewExpanded ? "╪Ñ╪«┘ü╪º╪í" : "┘à╪╣╪º┘è┘å╪⌐"}
          </button>
        )}
        <button
          onClick={onOpen}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${colors.accent}`}
        >
          {template ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {template ? (isMeta ? "╪¬╪╣╪»┘è┘ä ╪º┘ä╪▒╪¿╪╖" : "╪¬╪╣╪»┘è┘ä") : "╪Ñ┘å╪┤╪º╪í"}
        </button>
        {isMeta && bound && onUnbind && template && (
          <button
            onClick={() => onUnbind(template)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Unlink className="h-3 w-3" />
            ┘ü┘â ╪º┘ä╪▒╪¿╪╖
          </button>
        )}
      </div>

      {hasContent && isPreviewExpanded && (
        <div className="mt-2 rounded-md bg-white/70 p-2 dark:bg-white/5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘â╪º┘à┘ä╪⌐
          </p>
          <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300">
            {resolveVariablesForPreview(template!.content)}
          </p>
        </div>
      )}
    </div>
  );
}

// ╪¼╪»┘ê┘ä ╪¬╪╖╪º╪¿┘é ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬: {{1}} ┘ü┘è ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ΓåÉ ╪º┘ä┘à╪¬╪║┘è╪▒ ╪º┘ä┘à╪¡┘ä┘è ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿
const META_BODY_CHAR_LIMIT = 1024;

function VariableMappingTable({
  template,
  metaOptions,
}: {
  template: TemplateItem;
  metaOptions: MetaTemplateOption[];
}) {
  const selectedMeta = metaOptions.find((m) => m.name === template.metaTemplateName);
  const metaBody = selectedMeta?.components?.find((c) => c.type === "BODY")?.text || "";
  const localVars = extractLocalVariableOrder(template.content);
  const metaNums = [...metaBody.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => m[1]);
  const isOverLimit = template.content.length > META_BODY_CHAR_LIMIT;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      {/* ╪╣╪»╪º╪» ╪¡╪▒┘ê┘ü ┘à┘è╪¬╪º */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          ╪¡╪» ╪¡╪▒┘ê┘ü ┘à┘è╪¬╪º
        </span>
        <span
          className={`text-[10px] font-medium tabular-nums ${
            isOverLimit ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {template.content.length} / {META_BODY_CHAR_LIMIT}
        </span>
      </div>
      {isOverLimit && (
        <p className="text-[11px] text-red-600 dark:text-red-400" role="alert">
          ΓÜá∩╕Å ╪º┘ä┘å╪╡ ╪ú╪╖┘ê┘ä ┘à┘å ╪¡╪» ┘à┘è╪¬╪º ({META_BODY_CHAR_LIMIT} ╪¡╪▒┘ü) ΓÇö ╪º┘ä┘é╪º┘ä╪¿ ┘ç┘è╪¬╪▒┘ü╪╢ ╪╣┘å╪» ╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë Meta Cloud API.
        </p>
      )}

      {selectedMeta ? (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            ┘à╪¡╪¬┘ê┘ë ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪¡╪»╪» ({selectedMeta.name})
          </p>
          <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300">{metaBody}</p>

          {metaNums.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                ╪¬╪╖╪º╪¿┘é ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬
              </p>
              {metaNums.map((n, i) => {
                const local = localVars[i];
                const matched = !!local;
                const numLabel = n ?? String(i + 1);
                return (
                  <div key={`${numLabel}-${i}`} className="flex items-center gap-2 text-[11px]">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {`{{${numLabel}}}`}
                    </span>
                    <span className="text-slate-400">ΓåÉ</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono ${
                        matched
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {local ? `{${local}}` : "ΓÇö"}
                    </span>
                    {local && (
                      <span className="text-slate-500">{VARIABLE_DESCRIPTIONS[local] || ""}</span>
                    )}
                    {!matched && (
                      <span className="text-red-500">
                        ┘å╪º┘é╪╡ ΓÇö ╪▒╪¬╪¿ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘ü┘è ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪¡╪│╪¿ ╪¬╪▒╪¬┘è╪¿ {`{{${numLabel}}}`}
                      </span>
                    )}
                  </div>
                );
              })}
              {localVars.length > metaNums.length && (
                <p className="text-[11px] text-amber-600">
                  ΓÜá∩╕Å ╪╣┘å╪»┘â ┘à╪¬╪║┘è╪▒╪º╪¬ ┘à╪¡┘ä┘è╪⌐ ╪▓┘è╪º╪»╪⌐ ({localVars.slice(metaNums.length).map((v) => `{${v}}`).join(", ")}) ΓÇö
                  ┘à┘è╪¬╪º ┘à╪┤ ┘ç╪¬╪╣╪▒╪╢┘ç┘à (╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪¬╪¬╪▒╪¬╪¿ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪¿╪│).
                </p>
              )}
              {localVars.length < metaNums.length && (
                <p className="text-[11px] text-red-600">
                  Γ¥î ╪╣╪»╪» ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪ú┘é┘ä ┘à┘å ╪º┘ä┘à╪╖┘ä┘ê╪¿ ΓÇö ╪ú╪╢┘ü {metaNums.length - localVars.length} ┘à╪¬╪║┘è╪▒ ╪Ñ╪╢╪º┘ü┘è ┘ä┘ä┘à╪¡╪¬┘ê┘ë ┘é╪¿┘ä ╪º┘ä╪¡┘ü╪╕.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪»┘ç ┘à┘å ╪║┘è╪▒ ┘à╪¬╪║┘è╪▒╪º╪¬ ΓÇö ╪º┘ä┘à╪¬┘å╪º╪│┘é ╪¬┘à╪º┘à╪º┘ï. ┘ä┘ê ╪╣╪º┘è╪▓ ┘à╪¬╪║┘è╪▒╪º╪¬╪î ╪º┘â╪¬╪¿┘ç╪º ┘ü┘è ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪¡┘ä┘è
              (╪▓┘è <code>{`{customerName}`}</code>) ┘ê╪│┘è╪¿ ┘à┘è╪¬╪º ┘è╪¿┘å┘è┘ç╪º ╪¿╪¬╪▒╪¬┘è╪¿ ╪╕┘ç┘ê╪▒┘ç╪º.
            </p>
          )}
        </>
      ) : template.metaTemplateName && metaOptions.length === 0 ? (
        <p className="text-xs text-slate-500">╪º┘ä┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ΓÇö ╪¡╪»┘æ╪½ ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪¬╪º╪¡╪⌐ ┘ä┘à╪┤╪º┘ç╪»╪⌐ ╪º┘ä╪¬╪╖╪º╪¿┘é.</p>
      ) : (
        <p className="text-xs text-slate-500">
          ≡ƒÆí <strong>╪Ñ╪▓╪º┘è ╪¬╪╣╪▒┘ü ┘à╪¬╪║┘è╪▒╪º╪¬ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º╪ƒ</strong> ┘à┘è╪¬╪º ╪¿╪¬╪│╪¬╪«╪»┘à ╪ú╪▒┘é╪º┘à ({`{{1}}, {{2}}`}...) ┘à╪┤ ╪ú╪│┘à╪º╪í.
          ╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪¿┘è╪¬╪¡╪»╪» ┘à┘å <strong>╪¬╪▒╪¬┘è╪¿ ╪╕┘ç┘ê╪▒ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘ü┘è ┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è</strong>: ╪ú┘ê┘ä{" "}
          <code>{`{customerName}`}</code> = {`{{1}}`}╪î ╪º┘ä╪¬╪º┘å┘è = {`{{2}}`} ┘ê┘ç┘â╪░╪º. ╪º╪«╪¬╪º╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à┘å ┘ü┘ê┘é ┘ê╪┤┘ê┘ü ╪º┘ä╪¬╪╖╪º╪¿┘é ┘ç┘å╪º.
        </p>
      )}
    </div>
  );
}

export default CustomerNotifications;
