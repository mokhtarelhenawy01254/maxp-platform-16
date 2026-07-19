import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Clock3,
  Copy,
  Database,
  Edit,
  FileText,
  Globe,
  Image as ImageIcon,
  Link2,
  Link2Off,
  Lock,
  MessageSquareText,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Settings,
  Smartphone,
  Tag,
  Trash2,
  Users,
  Video,
  XCircle,
  HelpCircle,
  Briefcase,
  Key,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

import {
  getContactDisplayPhone,
} from "./whatsappContactDisplay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useQueryClient } from "@tanstack/react-query";
import { indexedDBStorage } from "../../services/indexedDBStorage";
import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import useSocket from "../../hooks/useSocket";
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

type TabId =
  | "sessions"
  | "general"
  | "quick-replies"
  | "business"
  | "privacy"
  | "labels";

type WhatsAppProvider = "BAILEYS" | "META_CLOUD";

interface TabDefinition {
  id: TabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Session {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  liveStatus: string;
  qrCode: string | null;
  pairingCode?: string | null;
  autoReply: boolean;
  welcomeMessage: string | null;
  awayMessage: string | null;
  workingHoursEnabled: boolean;
  workingHours: unknown;
  isDefault: boolean;
  loadBalanceWeight?: number;
  createdAt: string;
  provider?: WhatsAppProvider;
  metaPhoneNumberId?: string | null;
  metaWabaId?: string | null;
  metaBusinessId?: string | null;
  metaAccessToken?: string | null;
  metaTokenExpiresAt?: string | null;
  metaWebhookVerifyToken?: string | null;
  metaWebhookSecret?: string | null;
  metaDisplayPhoneNumber?: string | null;
  metaQualityRating?: string | null;
  metaMessagingLimit?: number | null;
  metaApiVersion?: string | null;
  _count: {
    messages: number;
    contacts: number;
  };
}

interface WorkspaceSettings {
  id: string;
  isEnabled: boolean;
  maxSessions: number;
  notificationSound: boolean;
  browserNotifications: boolean;
  maxImageSize: number;
  maxVideoSize: number;
  maxDocumentSize: number;
  autoCompressImages: boolean;
  autoArchiveDays: number | null;
}

interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string;
  usageCount: number;
  isActive: boolean;
}

interface BusinessProfileState {
  description: string;
  email: string;
  websites: string[];
  address: string;
  category: string;
}

interface PrivacySettingsState {
  readReceipts: string;
  profilePhoto: string;
  status: string;
  online: string;
  lastSeen: string;
  groupAdd: string;
}

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

interface DeleteState {
  kind: "session" | "quickReply" | "label";
  id: string;
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const providerLabels: Record<WhatsAppProvider, string> = {
  BAILEYS: "Baileys",
  META_CLOUD: "Meta Cloud API",
};

const statusBadgeClasses: Record<string, string> = {
  CONNECTED:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  QR_PENDING:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  PAIRING_CODE_PENDING:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  CONNECTING:
    "border-sky-300/70 bg-sky-500/10 text-sky-800 dark:border-sky-500/40 dark:text-sky-200",
  AUTHENTICATING:
    "border-purple-300/70 bg-purple-500/10 text-purple-800 dark:border-purple-500/40 dark:text-purple-200",
  RECONNECTING:
    "border-violet-300/70 bg-violet-500/10 text-violet-800 dark:border-violet-500/40 dark:text-violet-200",
  DISCONNECTED:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
};

const quickReplyCategoryKeys = [
  "general",
  "welcome",
  "thanks",
  "apology",
  "info",
  "order",
] as const;

const privacyOptionKeys = [
  "all",
  "contacts",
  "contact_blacklist",
  "none",
] as const;

const businessCategoryKeys = [
  "RETAIL",
  "RESTAURANT",
  "HEALTH",
  "EDUCATION",
  "FINANCE",
  "PROFESSIONAL_SERVICES",
  "OTHER",
] as const;

const labelPalette = [
  "#25D366",
  "#128C7E",
  "#075E54",
  "#34B7F1",
  "#00A884",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
];

const tabsRequiringScopedSession = new Set<TabId>([
  "business",
  "privacy",
  "labels",
]);

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiErrorShape;
  return apiError.response?.data?.error || fallback;
}

function isConnectedStatus(status?: string | null) {
  return status === "connected" || status === "CONNECTED";
}

function isPendingStatus(status?: string | null) {
  return (
    status === "qr_pending" || status === "QR_PENDING" ||
    status === "pairing_code_pending" || status === "PAIRING_CODE_PENDING"
  );
}

function isReconnectingStatus(status?: string | null) {
  return status === "reconnecting" || status === "RECONNECTING";
}

function formatPairingCode(code?: string | null) {
  return String(code || "")
    .replace(/\s+/g, "")
    .match(/.{1,4}/g)
    ?.join(" ") || "";
}

function SettingsToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[color:var(--color-foreground)]">
            {label}
          </p>
          {description ? (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

function SessionScopeSelector({
  label,
  sessions,
  value,
  onValueChange,
}: {
  label: string;
  sessions: Session[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="min-w-[15rem] bg-[color:var(--color-card)]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => {
            const isCuid = session.name && session.name.length === 25 && /^[a-z0-9]+$/.test(session.name);
            const nameToUse = isCuid ? "جلسة واتساب" : session.name;
            const phone = session.metaDisplayPhoneNumber || session.phoneNumber;
            return (
              <SelectItem key={session.id} value={session.id}>
                {phone ? `${nameToUse} (${phone})` : nameToUse}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

interface WhatsAppSettingsProps {
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}

const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({
  companyId,
  companyName,
  superAdminMode = false,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageTitle = companyName
    ? `${t("whatsappSettings.title")} · ${companyName}`
    : t("whatsappSettings.title");
  const workspaceHref =
    superAdminMode && companyId
      ? `/super-admin/whatsapp/companies/${companyId}`
      : undefined;
  const notificationsHref =
    superAdminMode && companyId
      ? `/super-admin/whatsapp/companies/${companyId}/notifications`
      : "/whatsapp/notifications";
  const eyebrow =
    superAdminMode && companyName
      ? i18n.language === "ar"
        ? `شركة: ${companyName}`
        : `Company: ${companyName}`
      : undefined;

  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get("tab") as TabId) || "sessions",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [connectingSessionId, setConnectingSessionId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfileState | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [privacySettings, setPrivacySettings] =
    useState<PrivacySettingsState | null>(null);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const queryClient = useQueryClient();

  const invalidateSessionsCache = useCallback(async () => {
    try {
      await indexedDBStorage.removeItem("whatsapp_sessions").catch(console.error);
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "sessions"] });
    } catch (err) {
      console.error("Error invalidating whatsapp sessions cache:", err);
    }
  }, [queryClient]);

  const [scopedSessionId, setScopedSessionId] = useState("");

  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [quickReplyDialogOpen, setQuickReplyDialogOpen] = useState(false);
  const [editingQuickReply, setEditingQuickReply] =
    useState<QuickReply | null>(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [keepHistory, setKeepHistory] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentQR, setCurrentQR] = useState<string | null>(null);
  const [currentPairingCode, setCurrentPairingCode] = useState<string | null>(
    null,
  );
  const [currentPairingPhone, setCurrentPairingPhone] = useState<string | null>(
    null,
  );
  const [qrRefreshed, setQrRefreshed] = useState(false);

  const [newSessionName, setNewSessionName] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newImportHistory, setNewImportHistory] = useState(false);
  const [newKeepHistoryOnDelete, setNewKeepHistoryOnDelete] = useState(true);
  const [newSessionProvider, setNewSessionProvider] =
    useState<WhatsAppProvider>("BAILEYS");
  const [newMetaPhoneNumberId, setNewMetaPhoneNumberId] = useState("");
  const [newMetaWabaId, setNewMetaWabaId] = useState("");
  const [newMetaBusinessId, setNewMetaBusinessId] = useState("");
  const [newMetaAccessToken, setNewMetaAccessToken] = useState("");
  const [newMetaApiVersion, setNewMetaApiVersion] = useState("v25.0");
  const [newMetaWebhookVerifyToken, setNewMetaWebhookVerifyToken] =
    useState("");
  const [newMetaWebhookSecret, setNewMetaWebhookSecret] = useState("");
  const [newMetaDisplayPhoneNumber, setNewMetaDisplayPhoneNumber] =
    useState("");

  const [quickReplyForm, setQuickReplyForm] = useState({
    title: "",
    shortcut: "",
    content: "",
    category: "general",
  });
  const [labelForm, setLabelForm] = useState({
    name: "",
    color: "#25D366",
  });

  const tabs = useMemo<TabDefinition[]>(
    () => [
      {
        id: "sessions",
        label: t("whatsappSettings.sidebarTitle"),
        icon: Smartphone,
        description: t("whatsappSettings.description"),
      },
      {
        id: "general",
        label: t("whatsappSettings.generalSettings"),
        icon: Settings,
        description: t("whatsappSettings.generalSettings"),
      },
      {
        id: "quick-replies",
        label: t("whatsappSettings.quickReplies"),
        icon: Copy,
        description: t("whatsappSettings.quickReplies"),
      },
      {
        id: "business",
        label: t("whatsappSettings.businessProfile"),
        icon: Database,
        description: t("whatsappSettings.businessProfile"),
      },
      {
        id: "privacy",
        label: t("whatsappSettings.privacy"),
        icon: Lock,
        description: t("whatsappSettings.privacySettings"),
      },
      {
        id: "labels",
        label: t("whatsappSettings.labels"),
        icon: Tag,
        description: t("whatsappSettings.manageLabels"),
      },

    ],
    [t],
  );

  const connectedSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const status = session.liveStatus || session.status;
        return isConnectedStatus(status) || isReconnectingStatus(status);
      }),
    [sessions],
  );

  const linkedContactsCount = sessions.reduce(
    (sum, session) => sum + (session._count?.contacts || 0),
    0,
  );
  const sessionMessagesCount = sessions.reduce(
    (sum, session) => sum + (session._count?.messages || 0),
    0,
  );

  const currentScopedSession =
    connectedSessions.find((session) => session.id === scopedSessionId) || null;

  const showError = useCallback(
    (error: unknown, fallback: string) => {
      toast.error(getApiErrorMessage(error, fallback));
    },
    [],
  );

  const generateRandomVerifyToken = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMetaWebhookVerifyToken(token);
  }, []);

  const resetNewSessionForm = useCallback(() => {
    setNewSessionName("");
    setNewPhoneNumber("");
    setNewImportHistory(false);
    setNewKeepHistoryOnDelete(true);
    setNewSessionProvider("BAILEYS");
    setNewMetaPhoneNumberId("");
    setNewMetaWabaId("");
    setNewMetaBusinessId("");
    setNewMetaAccessToken("");
    setNewMetaApiVersion("v25.0");
    setNewMetaWebhookVerifyToken("");
    setNewMetaWebhookSecret("");
    setNewMetaDisplayPhoneNumber("");
    setWizardStep(1);
    setShowAdvancedMeta(false);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsResponse, settingsResponse, quickRepliesResponse] =
        await Promise.allSettled([
          apiClient.get("/whatsapp/sessions", withCompanyConfig()),
          apiClient.get("/whatsapp/settings", withCompanyConfig()),
          apiClient.get("/whatsapp/quick-replies", withCompanyConfig()),
        ]);

      if (sessionsResponse.status === "fulfilled") {
        setSessions(sessionsResponse.value.data.sessions || []);
      } else {
        setSessions([]);
        showError(
          sessionsResponse.reason,
          t("whatsappSettings.dialogs.errorLoading"),
        );
      }

      if (settingsResponse.status === "fulfilled") {
        setSettings(settingsResponse.value.data.settings || null);
      } else {
        setSettings(null);
        showError(
          settingsResponse.reason,
          t("whatsappSettings.dialogs.errorLoading"),
        );
      }

      if (quickRepliesResponse.status === "fulfilled") {
        setQuickReplies(quickRepliesResponse.value.data.quickReplies || []);
      } else {
        setQuickReplies([]);
        showError(
          quickRepliesResponse.reason,
          t("whatsappSettings.dialogs.errorLoading"),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [showError, t, withCompanyConfig]);

  const loadBusinessProfile = useCallback(
    async (sessionId: string) => {
      setLoadingBusiness(true);
       try {
         const profileResponse = await apiClient.get(
           "/whatsapp/business/profile",
           withCompanyConfig({ params: { sessionId } }),
         );

         setBusinessProfile(profileResponse.data.profile || null);
       } catch (error) {
        showError(error, t("whatsappSettings.dialogs.errorLoading"));
      } finally {
        setLoadingBusiness(false);
      }
    },
    [showError, t, withCompanyConfig],
  );

  const loadPrivacySettings = useCallback(
    async (sessionId: string) => {
      setLoadingPrivacy(true);
      try {
        const [privacyResponse, blocklistResponse] = await Promise.all([
          apiClient.get(
            "/whatsapp/privacy/settings",
            withCompanyConfig({ params: { sessionId } }),
          ),
          apiClient.get(
            "/whatsapp/privacy/blocklist",
            withCompanyConfig({ params: { sessionId } }),
          ),
        ]);

        setPrivacySettings(privacyResponse.data.settings || null);
        setBlocklist(blocklistResponse.data.blocklist || []);
      } catch (error) {
        showError(error, t("whatsappSettings.dialogs.errorLoading"));
      } finally {
        setLoadingPrivacy(false);
      }
    },
    [showError, t, withCompanyConfig],
  );

  const loadLabels = useCallback(
    async (sessionId: string) => {
      setLoadingLabels(true);
      try {
        const response = await apiClient.get(
          "/whatsapp/labels",
          withCompanyConfig({ params: { sessionId } }),
        );
        setLabels(response.data.labels || []);
      } catch (error) {
        showError(error, t("whatsappSettings.dialogs.errorLoading"));
      } finally {
        setLoadingLabels(false);
      }
    },
    [showError, t, withCompanyConfig],
  );

  const loadScopedTabData = useCallback(
    async (tabId: TabId, sessionId: string) => {
      switch (tabId) {
        case "business":
          await loadBusinessProfile(sessionId);
          break;
        case "privacy":
          await loadPrivacySettings(sessionId);
          break;
        case "labels":
          await loadLabels(sessionId);
          break;

        default:
          break;
      }
    },
    [
      loadBusinessProfile,
      loadLabels,
      loadPrivacySettings,
    ],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = searchParams.get("tab") as TabId | null;
    if (!tab || tab === activeTab) {
      return;
    }

    setActiveTab(tab);
    if (tabsRequiringScopedSession.has(tab) && scopedSessionId) {
      void loadScopedTabData(tab, scopedSessionId);
    }
  }, [activeTab, loadScopedTabData, scopedSessionId, searchParams]);

  useEffect(() => {
    if (connectedSessions.length === 0) {
      if (scopedSessionId) {
        setScopedSessionId("");
      }
      return;
    }

    if (connectedSessions.some((session) => session.id === scopedSessionId)) {
      return;
    }

    const nextSessionId = connectedSessions[0].id;
    setScopedSessionId(nextSessionId);

    if (tabsRequiringScopedSession.has(activeTab)) {
      void loadScopedTabData(activeTab, nextSessionId);
    }
  }, [activeTab, connectedSessions, loadScopedTabData, scopedSessionId]);

  // ponytail: no polling — socket events (whatsapp:connection, whatsapp:sessions:status) keep sessions fresh

  // 📡 Socket event listeners for real-time WhatsApp updates
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleQRCode = (data: { sessionId: string; qr: string; refreshed?: boolean }) => {
      setSessions((previous) =>
        previous.map((session) =>
          session.id === data.sessionId
            ? {
                ...session,
                qrCode: data.qr,
                pairingCode: null,
                status: "QR_PENDING",
              }
            : session,
        ),
      );
      setCurrentQR(data.qr);
      setCurrentPairingCode(null);
      if (data.refreshed) {
        setQrRefreshed(true);
        setTimeout(() => setQrRefreshed(false), 3000);
      }
    };

    const handlePairingCode = (data: {
      sessionId: string;
      pairingCode: string;
      phoneNumber?: string;
    }) => {
      setSessions((previous) =>
        previous.map((session) =>
          session.id === data.sessionId
            ? {
                ...session,
                pairingCode: data.pairingCode,
                phoneNumber: data.phoneNumber || session.phoneNumber,
                status: "PAIRING_CODE_PENDING",
              }
            : session,
        ),
      );
      setCurrentQR(null);
      setCurrentPairingCode(data.pairingCode);
      setCurrentPairingPhone(data.phoneNumber || null);
    };

    const handleConnectionUpdate = (data: {
      sessionId: string;
      status: string;
      phoneNumber?: string;
    }) => {
      const normalizedStatus = data.status?.toLowerCase() || "";
      
      setSessions((previous) =>
        previous.map((session) =>
          session.id === data.sessionId
            ? {
                ...session,
                status: data.status,
                liveStatus: normalizedStatus,
                phoneNumber: data.phoneNumber || session.phoneNumber,
              }
            : session,
        ),
      );

      if (isConnectedStatus(data.status)) {
        setQrDialogOpen(false);
        setCurrentQR(null);
        setCurrentPairingCode(null);
        setCurrentPairingPhone(null);
        setQrRefreshed(false);
        toast.success(t("whatsappSettings.dialogs.linkedSuccess"));
      } else if (data.status === "DISCONNECTED" || data.status === "disconnected") {
        toast.warning(t("whatsappSettings.dialogs.disconnectedAlert"));
      } else if (data.status === "authenticating" || data.status === "AUTHENTICATING") {
        setQrRefreshed(false);
      }
    };

    // 📡 Handle bulk session status updates (emitted on socket reconnect)
    const handleSessionsStatus = (data: {
      sessionId: string;
      status: string;
      phoneNumber?: string;
    }) => {
      const normalizedStatus = data.status?.toLowerCase() || "";
      setSessions((previous) =>
        previous.map((session) =>
          session.id === data.sessionId
            ? {
                ...session,
                status: data.status,
                liveStatus: normalizedStatus,
                phoneNumber: data.phoneNumber || session.phoneNumber,
              }
            : session,
        ),
      );
      if (isConnectedStatus(data.status)) {
        setQrDialogOpen(false);
        setCurrentQR(null);
        setCurrentPairingCode(null);
        setCurrentPairingPhone(null);
        setQrRefreshed(false);
      }
    };

    socket.on("whatsapp:qr", handleQRCode);
    socket.on("whatsapp:pairing_code", handlePairingCode);
    socket.on("whatsapp:connection", handleConnectionUpdate);
    socket.on("whatsapp:sessions:status", handleSessionsStatus);

    return () => {
      socket.off("whatsapp:qr", handleQRCode);
      socket.off("whatsapp:pairing_code", handlePairingCode);
      socket.off("whatsapp:connection", handleConnectionUpdate);
      socket.off("whatsapp:sessions:status", handleSessionsStatus);
    };
  }, [socket, t, withCompanyConfig]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
      if (tabsRequiringScopedSession.has(activeTab) && scopedSessionId) {
        await loadScopedTabData(activeTab, scopedSessionId);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });

    if (tabsRequiringScopedSession.has(tabId) && scopedSessionId) {
      void loadScopedTabData(tabId, scopedSessionId);
    }
  };

  const handleScopedSessionChange = (sessionId: string) => {
    setScopedSessionId(sessionId);
    if (tabsRequiringScopedSession.has(activeTab)) {
      void loadScopedTabData(activeTab, sessionId);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.warning(t("whatsappSettings.dialogs.sessionName"));
      return;
    }

    if (creatingSession) {
      return;
    }

    try {
      setCreatingSession(true);
      setSaving(true);

      const payload: Record<string, string | boolean> & {
        name: string;
        provider: WhatsAppProvider;
      } = {
        name: newSessionName.trim(),
        provider: newSessionProvider,
      };

      if (newSessionProvider === "BAILEYS" && newPhoneNumber.trim()) {
        payload.phoneNumber = newPhoneNumber.trim();
      }
      if (newSessionProvider === "BAILEYS" && newImportHistory) {
        payload.importHistory = true;
      }
      if (newSessionProvider === "BAILEYS") {
        payload.keepHistoryOnDelete = newKeepHistoryOnDelete;
      }

      if (newSessionProvider === "META_CLOUD") {
        if (newMetaPhoneNumberId.trim()) {
          payload.metaPhoneNumberId = newMetaPhoneNumberId.trim();
        }
        if (newMetaWabaId.trim()) {
          payload.metaWabaId = newMetaWabaId.trim();
        }
        if (newMetaBusinessId.trim()) {
          payload.metaBusinessId = newMetaBusinessId.trim();
        }
        if (newMetaAccessToken.trim()) {
          payload.metaAccessToken = newMetaAccessToken.trim();
        }
        if (newMetaApiVersion.trim()) {
          payload.metaApiVersion = newMetaApiVersion.trim();
        }
        if (newMetaWebhookVerifyToken.trim()) {
          payload.metaWebhookVerifyToken = newMetaWebhookVerifyToken.trim();
        }
        if (newMetaWebhookSecret.trim()) {
          payload.metaWebhookSecret = newMetaWebhookSecret.trim();
        }
        if (newMetaDisplayPhoneNumber.trim()) {
          payload.metaDisplayPhoneNumber = newMetaDisplayPhoneNumber.trim();
        }
      }

      const response = await apiClient.post(
        "/whatsapp/sessions",
        payload,
        withCompanyConfig(),
      );
      const createdSession = response.data.session;

      setSessions((previous) => [...previous, createdSession]);
      setCreateSessionDialogOpen(false);
      resetNewSessionForm();
      void invalidateSessionsCache();

      if (newSessionProvider === "META_CLOUD") {
        toast.success("Meta Cloud API session created.");
      } else {
        setCurrentQR(createdSession?.qrCode || null);
        setCurrentPairingCode(createdSession?.pairingCode || null);
        setCurrentPairingPhone(createdSession?.phoneNumber || null);
        setQrDialogOpen(true);
        toast.info(t("whatsappSettings.dialogs.sessionCreated"));
      }
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
      setCreatingSession(false);
    }
  };

  const handleConnectSession = async (session: Session) => {
    if (connectingSessionId === session.id) {
      return;
    }

    try {
      setConnectingSessionId(session.id);
      const response = await apiClient.post(
        `/whatsapp/sessions/${session.id}/connect`,
        {
          phoneNumber: session.phoneNumber || undefined,
          preferPairingCode: Boolean(session.phoneNumber),
        },
        withCompanyConfig(),
      );
      const updatedSession = response.data.session;
      if (updatedSession) {
        setSessions((previous) =>
          previous.map((item) =>
            item.id === session.id ? { ...item, ...updatedSession } : item,
          ),
        );
      }
      setCurrentQR(updatedSession?.qrCode || null);
      setCurrentPairingCode(updatedSession?.pairingCode || null);
      setCurrentPairingPhone(updatedSession?.phoneNumber || session.phoneNumber);
      if (isConnectedStatus(updatedSession?.liveStatus) || isConnectedStatus(updatedSession?.status)) {
        setQrDialogOpen(false);
        toast.success(t("whatsappSettings.dialogs.linkedSuccess"));
      } else {
        setQrDialogOpen(true);
        toast.info(t("whatsappSettings.connecting"));
      }
      void invalidateSessionsCache();
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setConnectingSessionId(null);
    }
  };

  const handleDisconnectSession = async (sessionId: string) => {
    try {
      await apiClient.post(
        `/whatsapp/sessions/${sessionId}/disconnect`,
        undefined,
        withCompanyConfig(),
      );
      toast.success(t("whatsappSettings.dialogs.disconnectedAlert"));
      await loadData();
      void invalidateSessionsCache();
    } catch (error) {
      showError(error, t("common.error"));
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(
        `/whatsapp/sessions/${editingSession.id}`,
        editingSession,
        withCompanyConfig(),
      );
      setSessions((previous) =>
        previous.map((session) =>
          session.id === editingSession.id
            ? { ...session, ...editingSession }
            : session,
        ),
      );
      setEditingSession(null);
      toast.success(t("whatsappSettings.dialogs.sessionUpdated"));
      void invalidateSessionsCache();
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.put("/whatsapp/settings", settings, withCompanyConfig());
      toast.success(t("whatsappSettings.dialogs.settingsSaved"));
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuickReply = async () => {
    try {
      setSaving(true);

      if (editingQuickReply) {
        await apiClient.put(
          `/whatsapp/quick-replies/${editingQuickReply.id}`,
          quickReplyForm,
          withCompanyConfig(),
        );
        setQuickReplies((previous) =>
          previous.map((reply) =>
            reply.id === editingQuickReply.id
              ? { ...reply, ...quickReplyForm }
              : reply,
          ),
        );
      } else {
        const response = await apiClient.post(
          "/whatsapp/quick-replies",
          quickReplyForm,
          withCompanyConfig(),
        );
        setQuickReplies((previous) => [
          ...previous,
          response.data.quickReply,
        ]);
      }

      setQuickReplyDialogOpen(false);
      setEditingQuickReply(null);
      setQuickReplyForm({
        title: "",
        shortcut: "",
        content: "",
        category: "general",
      });
      toast.success(t("whatsappSettings.dialogs.quickReplySaved"));
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessProfile = async () => {
    if (!scopedSessionId || !businessProfile) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.post(
        "/whatsapp/business/profile",
        {
          sessionId: scopedSessionId,
          profileData: businessProfile,
        },
        withCompanyConfig(),
      );
      toast.success(t("whatsappSettings.dialogs.businessProfileSaved"));
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!scopedSessionId || !privacySettings) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.post(
        "/whatsapp/privacy/settings",
        {
          sessionId: scopedSessionId,
          settings: privacySettings,
        },
        withCompanyConfig(),
      );
      toast.success(t("whatsappSettings.dialogs.privacySaved"));
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (jid: string) => {
    if (!scopedSessionId) {
      return;
    }

    try {
      await apiClient.post(
        "/whatsapp/contacts/unblock",
        {
          sessionId: scopedSessionId,
          jid,
        },
        withCompanyConfig(),
      );
      setBlocklist((previous) => previous.filter((item) => item !== jid));
      toast.success(t("whatsappSettings.dialogs.unblockedSuccess"));
    } catch (error) {
      showError(error, t("common.error"));
    }
  };

  const handleCreateLabel = async () => {
    if (!scopedSessionId || !labelForm.name.trim()) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.post(
        "/whatsapp/labels",
        {
          sessionId: scopedSessionId,
          name: labelForm.name.trim(),
          color: labelForm.color,
        },
        withCompanyConfig(),
      );
      setLabels((previous) => [...previous, response.data.label]);
      setLabelDialogOpen(false);
      setLabelForm({ name: "", color: "#25D366" });
      toast.success(t("whatsappSettings.dialogs.labelCreated"));
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteState) {
      return;
    }

    try {
      setSaving(true);

      if (deleteState.kind === "session") {
        await apiClient.delete(
          `/whatsapp/sessions/${deleteState.id}?keepHistory=${keepHistory}`,
          withCompanyConfig(),
        );
        setSessions((previous) =>
          previous.filter((session) => session.id !== deleteState.id),
        );
        toast.success(t("whatsappSettings.dialogs.sessionDeleted"));
        void invalidateSessionsCache();
      }

      if (deleteState.kind === "quickReply") {
        await apiClient.delete(
          `/whatsapp/quick-replies/${deleteState.id}`,
          withCompanyConfig(),
        );
        setQuickReplies((previous) =>
          previous.filter((reply) => reply.id !== deleteState.id),
        );
      }

      if (deleteState.kind === "label" && scopedSessionId) {
        await apiClient.delete(
          `/whatsapp/labels/${deleteState.id}`,
          withCompanyConfig({
            data: { sessionId: scopedSessionId },
          }),
        );
        setLabels((previous) =>
          previous.filter((label) => label.id !== deleteState.id),
        );
        toast.success(t("whatsappSettings.dialogs.labelDeleted"));
      }

      setDeleteState(null);
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const openCreateQuickReplyDialog = () => {
    setEditingQuickReply(null);
    setQuickReplyForm({
      title: "",
      shortcut: "",
      content: "",
      category: "general",
    });
    setQuickReplyDialogOpen(true);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
      case "CONNECTED":
        return t("whatsappSettings.connected");
      case "qr_pending":
      case "QR_PENDING":
      case "pairing_code_pending":
      case "PAIRING_CODE_PENDING":
        return t("whatsappSettings.pendingQR");
      case "connecting":
      case "CONNECTING":
        return t("whatsappSettings.connecting");
      case "authenticating":
      case "AUTHENTICATING":
        return t("whatsappSettings.authenticating") || "Authenticating...";
      case "reconnecting":
      case "RECONNECTING":
        return t("whatsappSettings.reconnecting") || "Reconnecting...";
      default:
        return t("whatsappSettings.disconnected");
    }
  };

  const shellActions = (
    <>
      <Button
        variant="outline"
        className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
        onClick={() => void handleRefresh()}
        disabled={refreshing}
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        {t("whatsappSettings.update")}
      </Button>
      {activeTab === "sessions" ? (
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={() => setCreateSessionDialogOpen(true)}
          disabled={sessions.length >= (settings?.maxSessions || 3)}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addSession")}
        </Button>
      ) : null}
      {activeTab === "quick-replies" ? (
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={openCreateQuickReplyDialog}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addQuickReply")}
        </Button>
      ) : null}
      {activeTab === "labels" ? (
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={() => setLabelDialogOpen(true)}
          disabled={!scopedSessionId}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addLabel")}
        </Button>
      ) : null}
    </>
  );

  const renderEmptyScopedSessionState = (message: string) => (
    <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
      <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
      <AlertTitle>{t("whatsappSettings.selectSession")}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );

  const renderSessionsTab = () => (
    <div className="space-y-3 sm:space-y-4">
      <WhatsAppSurfaceCard
        title={t("whatsappSettings.sidebarTitle")}
        description={t("whatsappSettings.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
              onClick={() => void handleRefresh()}
            >
              <RefreshCw className="size-4" />
              {t("whatsappSettings.update")}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
              onClick={() => setCreateSessionDialogOpen(true)}
              disabled={sessions.length >= (settings?.maxSessions || 3)}
            >
              <Plus className="size-4" />
              {t("whatsappSettings.addSession")}
            </Button>
          </div>
        }
      >
        {sessions.length === 0 ? (
          <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
            <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
            <AlertTitle>{t("whatsappSettings.sidebarTitle")}</AlertTitle>
            <AlertDescription>{t("whatsappSettings.noSessions")}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => {
              const statusValue = (session.liveStatus || session.status || "DISCONNECTED").toUpperCase();
              const phoneLabel =
                session.provider === "META_CLOUD"
                  ? session.metaDisplayPhoneNumber ||
                    session.phoneNumber ||
                    (session.metaPhoneNumberId ? `ID: ${session.metaPhoneNumberId}` : t("whatsappSettings.disconnected"))
                  : session.phoneNumber || t("whatsappSettings.disconnected");

              return (
                <div
                  key={session.id}
                  className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-3 shadow-sm sm:rounded-3xl sm:p-5 sm:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar size="lg" className="bg-primary/10">
                        <AvatarFallback className="bg-transparent text-[color:var(--color-primary)]">
                          <Smartphone className="size-5" />
                        </AvatarFallback>
                        <AvatarBadge
                          className={cn(
                            "ring-[color:var(--app-panel-bg)]",
                            isConnectedStatus(statusValue)
                              ? "bg-emerald-500 text-white"
                              : isPendingStatus(statusValue)
                                ? "bg-amber-500 text-white"
                                : isReconnectingStatus(statusValue)
                                  ? "bg-violet-500 text-white"
                                  : "bg-rose-500 text-white",
                          )}
                        >
                          {isConnectedStatus(statusValue) ? (
                            <CheckCircle2 className="size-3" />
                          ) : isPendingStatus(statusValue) || isReconnectingStatus(statusValue) ? (
                            <RefreshCw className={`size-3 ${isReconnectingStatus(statusValue) ? "animate-spin" : ""}`} />
                          ) : (
                            <XCircle className="size-3" />
                          )}
                        </AvatarBadge>
                      </Avatar>

                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <p className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                            {session.name}
                          </p>
                          {session.isDefault ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200 text-[10px] sm:text-xs"
                            >
                              {t("whatsappSettings.default")}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-[color:var(--color-muted-foreground)] sm:text-sm">
                          {phoneLabel}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full shrink-0 text-[11px] sm:text-xs",
                        statusBadgeClasses[statusValue] ||
                          statusBadgeClasses.DISCONNECTED,
                      )}
                    >
                      {getStatusText(statusValue)}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[11px] sm:text-xs"
                    >
                      {providerLabels[session.provider || "BAILEYS"]}
                    </Badge>
                    {session.autoReply ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200 text-[11px] sm:text-xs"
                      >
                        {t("whatsappSettings.dialogs.autoReply")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                    <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)] bg-[color:var(--color-muted)] px-3 py-2 sm:rounded-2xl sm:px-4 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] sm:text-xs">
                        {t("whatsappSettings.contacts")}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-[color:var(--color-foreground)] sm:mt-1 sm:text-lg">
                        {session._count?.contacts || 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)] bg-[color:var(--color-muted)] px-3 py-2 sm:rounded-2xl sm:px-4 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] sm:text-xs">
                        {t("whatsappSettings.messages")}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-[color:var(--color-foreground)] sm:mt-1 sm:text-lg">
                        {session._count?.messages || 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] pt-3 sm:mt-5 sm:gap-2 sm:pt-4">
                    {isConnectedStatus(statusValue) ? (
                      <Button
                        variant="outline"
                        className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                        onClick={() => void handleDisconnectSession(session.id)}
                      >
                        <Link2Off className="size-4" />
                        {t("whatsappSettings.disconnect")}
                      </Button>
                    ) : isReconnectingStatus(statusValue) ? (
                      <Button
                        variant="outline"
                        className="rounded-full border-violet-300/70 bg-violet-500/10 text-violet-800 hover:bg-violet-500/15 dark:border-violet-500/40 dark:text-violet-200"
                        disabled
                      >
                        <RefreshCw className="size-4 animate-spin" />
                        {t("whatsappSettings.reconnecting") || "Reconnecting..."}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="rounded-full border-emerald-300/70 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200"
                        onClick={() => void handleConnectSession(session)}
                        disabled={connectingSessionId === session.id}
                      >
                        {connectingSessionId === session.id ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <Link2 className="size-4" />
                        )}
                        {t("whatsappSettings.connect")}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                      onClick={() => setEditingSession({ ...session })}
                    >
                      <Edit className="size-4" />
                      {t("whatsappSettings.edit")}
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                      onClick={() => {
                        let defaultKeep = true;
                        if (session.metadata) {
                          try {
                            const meta = JSON.parse(session.metadata);
                            if (typeof meta.keepHistoryOnDelete === "boolean") {
                              defaultKeep = meta.keepHistoryOnDelete;
                            }
                          } catch {
                            defaultKeep = true;
                          }
                        }
                        setKeepHistory(defaultKeep);
                        setDeleteState({ kind: "session", id: session.id });
                      }}
                    >
                      <Trash2 className="size-4" />
                      {t("whatsappSettings.delete")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WhatsAppSurfaceCard>
    </div>
  );

  const renderGeneralTab = () => {
    if (!settings) {
      return (
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappSettings.generalSettings")}</AlertTitle>
          <AlertDescription>{t("whatsappSettings.dialogs.errorLoading")}</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <WhatsAppSurfaceCard
          title={t("whatsappSettings.notifications")}
          description={t("whatsappSettings.autoNotificationsDesc")}
        >
          <div className="space-y-4">
            <SettingsToggle
              label={t("whatsappSettings.notificationSound")}
              checked={settings.notificationSound}
              onCheckedChange={(checked) =>
                setSettings((previous) =>
                  previous
                    ? { ...previous, notificationSound: checked }
                    : previous,
                )
              }
            />
            <SettingsToggle
              label={t("whatsappSettings.browserNotifications")}
              checked={settings.browserNotifications}
              onCheckedChange={(checked) =>
                setSettings((previous) =>
                  previous
                    ? { ...previous, browserNotifications: checked }
                    : previous,
                )
              }
            />

            <div className="rounded-3xl border border-emerald-300/70 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <Bell className="size-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-emerald-900">
                    {t("whatsappSettings.autoNotifications")}
                  </p>
                  <p className="text-sm leading-6 text-emerald-800">
                    {t("whatsappSettings.autoNotificationsDesc")}
                  </p>
                  <Button
                    variant="outline"
                    className="rounded-full border-emerald-300/70 bg-[color:var(--color-card)] text-emerald-900 hover:bg-[color:var(--color-card)]"
                    onClick={() => navigate(notificationsHref)}
                  >
                    {t("whatsappSettings.openNotificationSettings")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </WhatsAppSurfaceCard>

        <Button
          className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
          onClick={() => void handleSaveSettings()}
          disabled={saving}
        >
          {saving ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {t("whatsappSettings.saveSettings")}
        </Button>
      </div>
    );
  };

  const renderQuickRepliesTab = () => (
    <WhatsAppSurfaceCard
      title={t("whatsappSettings.quickReplies")}
      description={t("whatsappSettings.quickReplies")}
      action={
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={openCreateQuickReplyDialog}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addQuickReply")}
        </Button>
      }
    >
      {quickReplies.length === 0 ? (
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappSettings.quickReplies")}</AlertTitle>
          <AlertDescription>{t("whatsappSettings.noQuickReplies")}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {quickReplies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[color:var(--color-foreground)]">
                      {reply.title}
                    </p>
                    {reply.shortcut ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] font-mono"
                      >
                        {reply.shortcut}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className="rounded-full border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200"
                    >
                      {t(`whatsappSettings.categories.${reply.category}`)}
                    </Badge>
                    {!reply.isActive ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200"
                      >
                        Inactive
                      </Badge>
                    ) : null}
                  </div>

                  <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                    {reply.content}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]"
                  >
                    {t("whatsappSettings.usedTimes", { count: reply.usageCount })}
                  </Badge>
                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                    onClick={() => {
                      setEditingQuickReply(reply);
                      setQuickReplyForm({
                        title: reply.title,
                        shortcut: reply.shortcut || "",
                        content: reply.content,
                        category: reply.category,
                      });
                      setQuickReplyDialogOpen(true);
                    }}
                  >
                    <Edit className="size-4" />
                    {t("whatsappSettings.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                    onClick={() =>
                      setDeleteState({ kind: "quickReply", id: reply.id })
                    }
                  >
                    <Trash2 className="size-4" />
                    {t("whatsappSettings.delete")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WhatsAppSurfaceCard>
  );

  const renderBusinessTab = () => (
    <div className="space-y-4">
      <WhatsAppSurfaceCard
        title={t("whatsappSettings.businessProfile")}
        description={t("whatsappSettings.businessProfileAlert")}
        action={
          <SessionScopeSelector
            label={t("whatsappSettings.selectSession")}
            sessions={connectedSessions}
            value={scopedSessionId}
            onValueChange={handleScopedSessionChange}
          />
        }
      >
        {connectedSessions.length === 0 ? (
          renderEmptyScopedSessionState(t("whatsappSettings.businessProfileAlert"))
        ) : loadingBusiness ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        ) : businessProfile ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <WhatsAppSurfaceCard
                title={t("whatsappSettings.businessInfo")}
                description={currentScopedSession?.name || t("whatsappSettings.businessProfile")}
                className="border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] shadow-none"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-description">
                      {t("whatsappSettings.businessDescription")}
                    </Label>
                    <Textarea
                      id="business-description"
                      value={businessProfile.description || ""}
                      onChange={(event) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, description: event.target.value }
                            : previous,
                        )
                      }
                      className="min-h-[7rem] bg-[color:var(--color-card)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-email">{t("whatsappSettings.email")}</Label>
                    <Input
                      id="business-email"
                      value={businessProfile.email || ""}
                      onChange={(event) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, email: event.target.value }
                            : previous,
                        )
                      }
                      className="h-11 bg-[color:var(--color-card)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-address">{t("whatsappSettings.address")}</Label>
                    <Input
                      id="business-address"
                      value={businessProfile.address || ""}
                      onChange={(event) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, address: event.target.value }
                            : previous,
                        )
                      }
                      className="h-11 bg-[color:var(--color-card)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("whatsappSettings.category")}</Label>
                    <Select
                      value={businessProfile.category || "OTHER"}
                      onValueChange={(value) =>
                        setBusinessProfile((previous) =>
                          previous ? { ...previous, category: value } : previous,
                        )
                      }
                    >
                      <SelectTrigger className="h-11 bg-[color:var(--color-card)]">
                        <SelectValue placeholder={t("whatsappSettings.category")} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessCategoryKeys.map((categoryKey) => (
                          <SelectItem key={categoryKey} value={categoryKey}>
                            {t(
                              `whatsappSettings.businessCategories.${categoryKey}`,
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard
                title={t("whatsappSettings.websites")}
                description={t("whatsappSettings.addWebsite")}
                className="border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] shadow-none"
              >
                <div className="space-y-3">
                  {(businessProfile.websites || []).length > 0 ? (
                    businessProfile.websites.map((website, index) => (
                      <div key={`${website}-${index}`} className="flex gap-2">
                        <Input
                          value={website}
                          onChange={(event) => {
                            setBusinessProfile((previous) => {
                              if (!previous) {
                                return previous;
                              }
                              const nextWebsites = [...(previous.websites || [])];
                              nextWebsites[index] = event.target.value;
                              return { ...previous, websites: nextWebsites };
                            });
                          }}
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                          onClick={() =>
                            setBusinessProfile((previous) => {
                              if (!previous) {
                                return previous;
                              }
                              return {
                                ...previous,
                                websites: previous.websites.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              };
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                      <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
                      <AlertTitle>{t("whatsappSettings.websites")}</AlertTitle>
                      <AlertDescription>{t("whatsappSettings.addWebsite")}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                    onClick={() =>
                      setBusinessProfile((previous) =>
                        previous
                          ? {
                              ...previous,
                              websites: [...(previous.websites || []), ""],
                            }
                          : previous,
                      )
                    }
                  >
                    <Plus className="size-4" />
                    {t("whatsappSettings.addWebsite")}
                  </Button>
                </div>
              </WhatsAppSurfaceCard>
            </div>

            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={() => void handleSaveBusinessProfile()}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.saveBusinessProfile")}
            </Button>
          </div>
        ) : (
          <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
            <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
            <AlertTitle>{t("whatsappSettings.businessProfile")}</AlertTitle>
            <AlertDescription>{t("whatsappSettings.noBusinessProfile")}</AlertDescription>
          </Alert>
        )}
      </WhatsAppSurfaceCard>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-4">
      <WhatsAppSurfaceCard
        title={t("whatsappSettings.privacySettings")}
        description={t("whatsappSettings.privacySettings")}
        action={
          <SessionScopeSelector
            label={t("whatsappSettings.selectSession")}
            sessions={connectedSessions}
            value={scopedSessionId}
            onValueChange={handleScopedSessionChange}
          />
        }
      >
        {connectedSessions.length === 0 ? (
          renderEmptyScopedSessionState(t("whatsappSettings.privacySettings"))
        ) : loadingPrivacy ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        ) : privacySettings ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <WhatsAppSurfaceCard
                title={t("whatsappSettings.privacySettings")}
                description={currentScopedSession?.name || t("whatsappSettings.privacy")}
                className="border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] shadow-none"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { key: "lastSeen", label: t("whatsappSettings.lastSeen") },
                    {
                      key: "profilePhoto",
                      label: t("whatsappSettings.profilePhoto"),
                    },
                    { key: "status", label: t("whatsappSettings.status") },
                    { key: "groupAdd", label: t("whatsappSettings.groupAdd") },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      <Select
                        value={
                          privacySettings[
                            field.key as keyof PrivacySettingsState
                          ] || "all"
                        }
                        onValueChange={(value) =>
                          setPrivacySettings((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  [field.key]: value,
                                }
                              : previous,
                          )
                        }
                      >
                        <SelectTrigger className="h-11 bg-[color:var(--color-card)]">
                          <SelectValue placeholder={field.label} />
                        </SelectTrigger>
                        <SelectContent>
                          {privacyOptionKeys.map((optionKey) => (
                            <SelectItem key={optionKey} value={optionKey}>
                              {t(`whatsappSettings.privacyOptions.${optionKey}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard
                title={t("whatsappSettings.blocklist")}
                description={t("whatsappSettings.noBlocked")}
                className="border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] shadow-none"
              >
                {blocklist.length === 0 ? (
                  <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                    <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
                    <AlertTitle>{t("whatsappSettings.blocklist")}</AlertTitle>
                    <AlertDescription>{t("whatsappSettings.noBlocked")}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {blocklist.map((jid) => (
                      <div
                        key={jid}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-[color:var(--color-foreground)]" dir="ltr">
                            {getContactDisplayPhone({ jid })}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] hover:bg-[color:var(--color-card)]"
                          onClick={() => void handleUnblock(jid)}
                        >
                          {t("whatsappSettings.unblock")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </WhatsAppSurfaceCard>
            </div>

            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={() => void handleSavePrivacy()}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.savePrivacy")}
            </Button>
          </div>
        ) : (
          renderEmptyScopedSessionState(t("whatsappSettings.selectSession"))
        )}
      </WhatsAppSurfaceCard>
    </div>
  );

  const renderLabelsTab = () => (
    <WhatsAppSurfaceCard
      title={t("whatsappSettings.manageLabels")}
      description={t("whatsappSettings.manageLabels")}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <SessionScopeSelector
            label={t("whatsappSettings.selectSession")}
            sessions={connectedSessions}
            value={scopedSessionId}
            onValueChange={handleScopedSessionChange}
          />
          <Button
            className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
            onClick={() => setLabelDialogOpen(true)}
            disabled={!scopedSessionId}
          >
            <Plus className="size-4" />
            {t("whatsappSettings.addLabel")}
          </Button>
        </div>
      }
    >
      {connectedSessions.length === 0 ? (
        renderEmptyScopedSessionState(t("whatsappSettings.noLabels"))
      ) : loadingLabels ? (
        <Skeleton className="h-72 rounded-3xl" />
      ) : labels.length === 0 ? (
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappSettings.labels")}</AlertTitle>
          <AlertDescription>{t("whatsappSettings.noLabels")}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex size-5 rounded-full border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                  style={{ backgroundColor: label.color || "#25D366" }}
                />
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    {label.name}
                  </p>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {label.color}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                onClick={() => setDeleteState({ kind: "label", id: label.id })}
              >
                <Trash2 className="size-4" />
                {t("whatsappSettings.delete")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </WhatsAppSurfaceCard>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "sessions":
        return renderSessionsTab();
      case "general":
        return renderGeneralTab();
      case "quick-replies":
        return renderQuickRepliesTab();
      case "business":
        return renderBusinessTab();
      case "privacy":
        return renderPrivacyTab();
      case "labels":
        return renderLabelsTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={t("whatsappSettings.description")}
        icon={Smartphone}
        actions={shellActions}
        backHref={workspaceHref}
        backLabel={t("common.back")}
        eyebrow={eyebrow}
      >
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl sm:h-36 sm:rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <Skeleton className="h-[20rem] rounded-2xl sm:h-[34rem] sm:rounded-3xl" />
          <Skeleton className="h-[24rem] rounded-2xl sm:h-[40rem] sm:rounded-3xl" />
        </div>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description={t("whatsappSettings.description")}
      icon={Smartphone}
      actions={shellActions}
      backHref={workspaceHref}
      backLabel={t("common.back")}
      eyebrow={eyebrow}
    >
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label={t("whatsappSettings.connected")}
          value={connectedSessions.length}
          icon={Smartphone}
          tone="success"
        />
        <WhatsAppMetricCard
          label={t("whatsappSettings.contacts")}
          value={linkedContactsCount}
          icon={Users}
          tone="primary"
        />
        <WhatsAppMetricCard
          label={t("whatsappSettings.messages")}
          value={sessionMessagesCount}
          icon={MessageSquareText}
          tone="info"
        />
        <WhatsAppMetricCard
          label={t("whatsappSettings.quickReplies")}
          value={quickReplies.length}
          icon={Copy}
          tone="primary"
        />
      </div>

      <div className="block xl:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap",
                  selected
                    ? "bg-[color:var(--business-success)] text-white shadow-md"
                    : "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] hover:bg-[color:color-mix(in_srgb,var(--color-muted)_80%,var(--color-card))]",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <WhatsAppSurfaceCard
          className="hidden xl:block"
          title={t("whatsappSettings.sidebarTitle")}
          description={t("whatsappSettings.description")}
        >
          <div className="space-y-2">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-start transition-all",
                    selected
                      ? "bg-[color:color-mix(in_srgb,var(--business-success)_10%,var(--color-card))] text-[color:var(--business-success)] shadow-[0_12px_24px_rgba(35,159,90,0.10)]"
                      : "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-card)]",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl",
                      selected
                        ? "bg-[color:var(--business-success)] text-white"
                        : "bg-primary/10 text-[color:var(--color-primary)]",
                    )}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{tab.label}</p>
                    <p className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </WhatsAppSurfaceCard>

        <div className="min-w-0 space-y-4">{renderActiveTabContent()}</div>
      </div>

      <Dialog
        open={createSessionDialogOpen}
        onOpenChange={(open) => {
          setCreateSessionDialogOpen(open);
          if (!open) {
            resetNewSessionForm();
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>{t("whatsappSettings.dialogs.addSessionTitle")}</DialogTitle>
            <DialogDescription>{t("whatsappSettings.description")}</DialogDescription>
          </DialogHeader>

          {/* Stepper progress indicator */}
          <div className="px-6 pt-4">
            <div className="relative flex items-center justify-between px-2 pt-2">
              <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-[color:var(--shell-control-border)] -z-10">
                <div
                  className="h-full bg-[color:var(--color-primary)] transition-all duration-300"
                  style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}
                />
              </div>

              {[
                { number: 1, label: t("whatsappSettings.dialogs.stepBasics") },
                { number: 2, label: t("whatsappSettings.dialogs.stepConnection") },
                { number: 3, label: t("whatsappSettings.dialogs.stepReview") },
              ].map((step) => {
                const isCompleted = wizardStep > step.number;
                const isActive = wizardStep === step.number;
                return (
                  <div key={step.number} className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      disabled={step.number > wizardStep && !newSessionName.trim()}
                      onClick={() => setWizardStep(step.number)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                        isCompleted
                          ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-white"
                          : isActive
                          ? "border-[color:var(--color-primary)] bg-[var(--app-panel-bg)] text-[color:var(--color-primary)] ring-4 ring-primary/15"
                          : "border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] text-[color:var(--color-muted-foreground)]"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-5 fill-white text-[color:var(--color-primary)]" />
                      ) : (
                        step.number
                      )}
                    </button>
                    <span className={cn(
                      "text-xs font-medium",
                      isActive ? "text-[color:var(--color-primary)] font-semibold" : "text-[color:var(--color-muted-foreground)]"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 px-6 py-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Session Basics */}
            {wizardStep === 1 && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1" htmlFor="session-name">
                    {t("whatsappSettings.dialogs.sessionName")}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="session-name"
                    autoFocus
                    value={newSessionName}
                    onChange={(event) => setNewSessionName(event.target.value)}
                    placeholder={t("whatsappSettings.dialogs.sessionNamePlaceholder") as string}
                    className="h-11 bg-[color:var(--color-card)]"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="block">
                    {t("whatsappSettings.dialogs.providerRadioLabel")}
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setNewSessionProvider("BAILEYS")}
                      className={cn(
                        "flex flex-col items-start gap-3 rounded-2xl border p-5 text-start transition-all cursor-pointer",
                        newSessionProvider === "BAILEYS"
                          ? "border-[color:var(--color-primary)] bg-primary/8 ring-2 ring-[color:var(--color-primary)]"
                          : "border-[color:var(--shell-control-border)] hover:bg-[color:var(--color-muted)]"
                      )}
                    >
                      <div className={cn(
                        "rounded-full p-2.5",
                        newSessionProvider === "BAILEYS" ? "bg-[color:var(--color-primary)] text-white" : "bg-[color:var(--color-card)] text-[color:var(--color-muted-foreground)]"
                      )}>
                        <Smartphone className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[color:var(--color-foreground)]">
                          {t("whatsappSettings.dialogs.providerBaileysTitle")}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                          {t("whatsappSettings.dialogs.providerBaileysDesc")}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewSessionProvider("META_CLOUD")}
                      className={cn(
                        "flex flex-col items-start gap-3 rounded-2xl border p-5 text-start transition-all cursor-pointer",
                        newSessionProvider === "META_CLOUD"
                          ? "border-[color:var(--color-primary)] bg-primary/8 ring-2 ring-[color:var(--color-primary)]"
                          : "border-[color:var(--shell-control-border)] hover:bg-[color:var(--color-muted)]"
                      )}
                    >
                      <div className={cn(
                        "rounded-full p-2.5",
                        newSessionProvider === "META_CLOUD" ? "bg-[color:var(--color-primary)] text-white" : "bg-[color:var(--color-card)] text-[color:var(--color-muted-foreground)]"
                      )}>
                        <Globe className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[color:var(--color-foreground)]">
                          {t("whatsappSettings.dialogs.providerMetaTitle")}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                          {t("whatsappSettings.dialogs.providerMetaDesc")}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Connection Details */}
            {wizardStep === 2 && newSessionProvider === "BAILEYS" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="session-phone">{t("whatsappSettings.dialogs.phoneNumber")}</Label>
                  <Input
                    id="session-phone"
                    value={newPhoneNumber}
                    onChange={(event) => setNewPhoneNumber(event.target.value)}
                    placeholder={t("whatsappSettings.dialogs.phoneNumberPlaceholder") as string}
                    className="h-11 bg-[color:var(--color-card)]"
                  />
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {t("whatsappSettings.dialogs.phoneNumberHelper")}
                  </p>
                </div>

                <label
                  htmlFor="session-import-history"
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4 cursor-pointer"
                >
                  <Checkbox
                    id="session-import-history"
                    checked={newImportHistory}
                    onCheckedChange={(checked) => setNewImportHistory(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="grid gap-1">
                    <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      {t("whatsappSettings.dialogs.importHistory")}
                    </span>
                    <span className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                      {t("whatsappSettings.dialogs.importHistoryHelper")}
                    </span>
                  </span>
                </label>

                <label
                  htmlFor="session-keep-history"
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4 cursor-pointer"
                >
                  <Checkbox
                    id="session-keep-history"
                    checked={newKeepHistoryOnDelete}
                    onCheckedChange={(checked) => setNewKeepHistoryOnDelete(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="grid gap-1">
                    <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      {t("whatsappSettings.dialogs.keepHistoryOnDelete")}
                    </span>
                    <span className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                      {t("whatsappSettings.dialogs.keepHistoryOnDeleteHelper")}
                    </span>
                  </span>
                </label>

                <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                  <QrCode className="size-4 text-[color:var(--color-primary)]" />
                  <AlertTitle>QR Code</AlertTitle>
                  <AlertDescription>
                    A QR code will appear after creating the session.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 2: Meta Cloud API Settings */}
            {wizardStep === 2 && newSessionProvider === "META_CLOUD" && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                {/* Auth Details Card */}
                <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                    <Key className="size-4 text-[color:var(--color-primary)]" />
                    {t("whatsappSettings.dialogs.authDetails")}
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5" htmlFor="meta-phone-id">
                        {t("whatsappSettings.dialogs.metaPhoneNumberId")}
                        <span className="text-red-500">*</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("whatsappSettings.dialogs.metaPhoneNumberIdHelper")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="meta-phone-id"
                        value={newMetaPhoneNumberId}
                        onChange={(event) =>
                          setNewMetaPhoneNumberId(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="e.g. 1151868711348740"
                        className={cn(
                          "h-11 bg-[color:var(--color-card)]",
                          newMetaPhoneNumberId.trim() ? "border-emerald-500/50 focus-visible:ring-emerald-500" : ""
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5" htmlFor="meta-access-token">
                        {t("whatsappSettings.dialogs.metaAccessToken")}
                        <span className="text-red-500">*</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("whatsappSettings.dialogs.metaAccessTokenHelper")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="meta-access-token"
                        type="password"
                        value={newMetaAccessToken}
                        onChange={(event) =>
                          setNewMetaAccessToken(event.target.value)
                        }
                        placeholder="EAA..."
                        className={cn(
                          "h-11 bg-[color:var(--color-card)]",
                          newMetaAccessToken.trim() ? "border-emerald-500/50 focus-visible:ring-emerald-500" : ""
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Account Info Card */}
                <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                    <Briefcase className="size-4 text-[color:var(--color-primary)]" />
                    {t("whatsappSettings.dialogs.accountDetails")}
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5" htmlFor="meta-waba-id">
                        {t("whatsappSettings.dialogs.metaWabaId")}
                        <span className="text-red-500">*</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("whatsappSettings.dialogs.metaWabaIdHelper")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="meta-waba-id"
                        value={newMetaWabaId}
                        onChange={(event) => setNewMetaWabaId(event.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 1482240533647516"
                        className={cn(
                          "h-11 bg-[color:var(--color-card)]",
                          newMetaWabaId.trim() ? "border-emerald-500/50 focus-visible:ring-emerald-500" : ""
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5" htmlFor="meta-business-id">
                        {t("whatsappSettings.dialogs.metaBusinessId")}
                        <span className="text-red-500">*</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("whatsappSettings.dialogs.metaBusinessIdHelper")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="meta-business-id"
                        value={newMetaBusinessId}
                        onChange={(event) =>
                          setNewMetaBusinessId(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="e.g. 2381274910237"
                        className={cn(
                          "h-11 bg-[color:var(--color-card)]",
                          newMetaBusinessId.trim() ? "border-emerald-500/50 focus-visible:ring-emerald-500" : ""
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Advanced Settings */}
                <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
                    className="flex w-full items-center justify-between px-5 py-4 text-start font-medium text-[color:var(--color-foreground)] cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Settings className="size-4 text-[color:var(--color-muted-foreground)]" />
                      {t("whatsappSettings.dialogs.advancedSettings")}
                    </span>
                    <ChevronRight className={cn("size-4 transition-transform duration-200", showAdvancedMeta ? "-rotate-90" : "")} />
                  </button>

                  {showAdvancedMeta && (
                    <div className="border-t border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[var(--app-panel-bg)] animate-in fade-in-50 duration-200">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5" htmlFor="meta-api-version">
                            {t("whatsappSettings.dialogs.metaApiVersion")}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("whatsappSettings.dialogs.metaApiVersionHelper")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="meta-api-version"
                            value={newMetaApiVersion}
                            onChange={(event) => setNewMetaApiVersion(event.target.value)}
                            placeholder="v25.0"
                            className="h-11 bg-[color:var(--color-card)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5" htmlFor="meta-display-phone">
                            {t("whatsappSettings.dialogs.metaDisplayPhone")}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("whatsappSettings.dialogs.metaDisplayPhoneHelper")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="meta-display-phone"
                            value={newMetaDisplayPhoneNumber}
                            onChange={(event) => setNewMetaDisplayPhoneNumber(event.target.value)}
                            placeholder="e.g. +15556390660"
                            className="h-11 bg-[color:var(--color-card)]"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5" htmlFor="meta-verify-token">
                            {t("whatsappSettings.dialogs.metaWebhookVerifyToken")}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("whatsappSettings.dialogs.metaWebhookVerifyTokenHelper")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="meta-verify-token"
                              value={newMetaWebhookVerifyToken}
                              onChange={(event) => setNewMetaWebhookVerifyToken(event.target.value)}
                              placeholder="verify-token"
                              className="h-11 bg-[color:var(--color-card)]"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generateRandomVerifyToken}
                              className="h-11 px-3 border-[color:var(--shell-control-border)] cursor-pointer"
                            >
                              <Shuffle className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5" htmlFor="meta-secret">
                            {t("whatsappSettings.dialogs.metaWebhookSecret")}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="size-3.5 text-[color:var(--color-muted-foreground)] cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("whatsappSettings.dialogs.metaWebhookSecretHelper")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="meta-secret"
                            value={newMetaWebhookSecret}
                            onChange={(event) =>
                              setNewMetaWebhookSecret(event.target.value)
                            }
                            placeholder="Webhook Secret"
                            className="h-11 bg-[color:var(--color-card)]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & Summary */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[color:var(--shell-control-border)] pb-4">
                    <h4 className="font-semibold text-base text-[color:var(--color-foreground)]">
                      {t("whatsappSettings.dialogs.reviewDetails")}
                    </h4>
                    <Badge variant="outline" className="px-3 py-1 font-medium bg-[var(--app-panel-bg)]">
                      {newSessionProvider === "META_CLOUD" ? "Meta Cloud API" : "Baileys"}
                    </Badge>
                  </div>

                  <div className="grid gap-y-3 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-[color:var(--color-muted-foreground)]">
                        {t("whatsappSettings.dialogs.sessionName")}
                      </span>
                      <span className="font-medium text-[color:var(--color-foreground)]">
                        {newSessionName}
                      </span>
                    </div>

                    {newSessionProvider === "BAILEYS" ? (
                      <>
                        <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                          <span className="text-[color:var(--color-muted-foreground)]">
                            {t("whatsappSettings.dialogs.phoneNumber")}
                          </span>
                          <span className="font-medium text-[color:var(--color-foreground)]">
                            {newPhoneNumber || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                          <span className="text-[color:var(--color-muted-foreground)]">
                            {t("whatsappSettings.dialogs.importHistory")}
                          </span>
                          <span className="font-medium text-[color:var(--color-foreground)]">
                            {newImportHistory ? t("common.yes") : t("common.no")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                          <span className="text-[color:var(--color-muted-foreground)]">
                            Phone Number ID
                          </span>
                          <span className="font-medium font-mono text-[color:var(--color-foreground)]">
                            {newMetaPhoneNumberId}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                          <span className="text-[color:var(--color-muted-foreground)]">
                            WABA ID
                          </span>
                          <span className="font-medium font-mono text-[color:var(--color-foreground)]">
                            {newMetaWabaId}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                          <span className="text-[color:var(--color-muted-foreground)]">
                            Business ID
                          </span>
                          <span className="font-medium font-mono text-[color:var(--color-foreground)]">
                            {newMetaBusinessId}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                          <span className="text-[color:var(--color-muted-foreground)]">
                            API Version
                          </span>
                          <span className="font-medium font-mono text-[color:var(--color-foreground)]">
                            {newMetaApiVersion || "v25.0"}
                          </span>
                        </div>
                        {newMetaDisplayPhoneNumber && (
                          <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                            <span className="text-[color:var(--color-muted-foreground)]">
                              Display Phone
                            </span>
                            <span className="font-medium text-[color:var(--color-foreground)]">
                              {newMetaDisplayPhoneNumber}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                  <Info className="size-4 text-[color:var(--color-primary)]" />
                  <AlertDescription>
                    {t("whatsappSettings.dialogs.confirmPrompt")}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)] pt-4 pb-6 flex items-center justify-between sm:justify-between">
            <div>
              {wizardStep > 1 ? (
                <Button
                  variant="outline"
                  className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)] cursor-pointer"
                  onClick={() => setWizardStep((prev) => prev - 1)}
                >
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                  {t("whatsappSettings.dialogs.back")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)] cursor-pointer"
                  onClick={() => setCreateSessionDialogOpen(false)}
                >
                  {t("whatsappSettings.dialogs.cancel")}
                </Button>
              )}
            </div>

            <div>
              {wizardStep < 3 ? (
                <Button
                  className="rounded-full bg-[color:var(--color-primary)] px-5 text-white hover:brightness-90 cursor-pointer"
                  onClick={() => setWizardStep((prev) => prev + 1)}
                  disabled={
                    wizardStep === 1
                      ? !newSessionName.trim()
                      : wizardStep === 2 && newSessionProvider === "META_CLOUD"
                      ? !newMetaPhoneNumberId.trim() || !newMetaAccessToken.trim() || !newMetaWabaId.trim() || !newMetaBusinessId.trim()
                      : false
                  }
                >
                  {t("whatsappSettings.dialogs.next")}
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </Button>
              ) : (
                <Button
                  className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90 cursor-pointer"
                  onClick={() => void handleCreateSession()}
                  disabled={saving || creatingSession}
                >
                  {creatingSession || saving ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {creatingSession
                    ? t("whatsappSettings.connecting")
                    : t("whatsappSettings.dialogs.create")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSession}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSession(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>{t("whatsappSettings.dialogs.editSession")}</DialogTitle>
            <DialogDescription>{editingSession?.name}</DialogDescription>
          </DialogHeader>

          {editingSession ? (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="edit-session-name">{t("whatsappSettings.dialogs.sessionName")}</Label>
                <Input
                  id="edit-session-name"
                  value={editingSession.name}
                  onChange={(event) =>
                    setEditingSession((previous) =>
                      previous
                        ? { ...previous, name: event.target.value }
                        : previous,
                    )
                  }
                  className="h-11 bg-[color:var(--color-card)]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]"
                >
                  {providerLabels[editingSession.provider || "BAILEYS"]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    statusBadgeClasses[
                      (editingSession.liveStatus ||
                        editingSession.status ||
                        "DISCONNECTED").toUpperCase()
                    ] || statusBadgeClasses.DISCONNECTED,
                  )}
                >
                  {getStatusText(
                    (editingSession.liveStatus ||
                      editingSession.status ||
                      "DISCONNECTED").toUpperCase(),
                  )}
                </Badge>
              </div>

              {editingSession.provider === "META_CLOUD" ? (
                <div className="space-y-4">
                  {/* Auth Details */}
                  <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                      <Key className="size-4 text-[color:var(--color-primary)]" />
                      {t("whatsappSettings.dialogs.authDetails")}
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-phone-id">
                          {t("whatsappSettings.dialogs.metaPhoneNumberId")}
                        </Label>
                        <Input
                          id="edit-meta-phone-id"
                          value={editingSession.metaPhoneNumberId || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaPhoneNumberId: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-access">
                          {t("whatsappSettings.dialogs.metaAccessToken")}
                        </Label>
                        <Input
                          id="edit-meta-access"
                          type="password"
                          value={editingSession.metaAccessToken || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaAccessToken: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                      <Briefcase className="size-4 text-[color:var(--color-primary)]" />
                      {t("whatsappSettings.dialogs.accountDetails")}
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-waba">
                          {t("whatsappSettings.dialogs.metaWabaId")}
                        </Label>
                        <Input
                          id="edit-meta-waba"
                          value={editingSession.metaWabaId || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaWabaId: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-business">
                          {t("whatsappSettings.dialogs.metaBusinessId")}
                        </Label>
                        <Input
                          id="edit-meta-business"
                          value={editingSession.metaBusinessId || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaBusinessId: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-display">
                          {t("whatsappSettings.dialogs.metaDisplayPhone")}
                        </Label>
                        <Input
                          id="edit-meta-display"
                          value={editingSession.metaDisplayPhoneNumber || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaDisplayPhoneNumber: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="rounded-2xl border border-[color:var(--shell-control-border)] p-5 space-y-4 bg-[color:var(--color-card)]">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                      <Settings className="size-4 text-[color:var(--color-muted-foreground)]" />
                      {t("whatsappSettings.dialogs.advancedSettings")}
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-api">
                          {t("whatsappSettings.dialogs.metaApiVersion")}
                        </Label>
                        <Input
                          id="edit-meta-api"
                          value={editingSession.metaApiVersion || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaApiVersion: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-meta-verify">
                          {t("whatsappSettings.dialogs.metaWebhookVerifyToken")}
                        </Label>
                        <Input
                          id="edit-meta-verify"
                          value={editingSession.metaWebhookVerifyToken || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaWebhookVerifyToken: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="edit-meta-secret">
                          {t("whatsappSettings.dialogs.metaWebhookSecret")}
                        </Label>
                        <Input
                          id="edit-meta-secret"
                          value={editingSession.metaWebhookSecret || ""}
                          onChange={(event) =>
                            setEditingSession((previous) =>
                              previous
                                ? { ...previous, metaWebhookSecret: event.target.value }
                                : previous,
                            )
                          }
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                <SettingsToggle
                  label={t("whatsappSettings.dialogs.autoReply")}
                  checked={editingSession.autoReply}
                  onCheckedChange={(checked) =>
                    setEditingSession((previous) =>
                      previous ? { ...previous, autoReply: checked } : previous,
                    )
                  }
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="welcome-message">{t("whatsappSettings.dialogs.welcomeMessage")}</Label>
                  <Textarea
                    id="welcome-message"
                    value={editingSession.welcomeMessage || ""}
                    onChange={(event) =>
                      setEditingSession((previous) =>
                        previous
                          ? { ...previous, welcomeMessage: event.target.value }
                          : previous,
                      )
                    }
                    className="min-h-[8rem] bg-[color:var(--color-card)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="away-message">{t("whatsappSettings.dialogs.awayMessage")}</Label>
                  <Textarea
                    id="away-message"
                    value={editingSession.awayMessage || ""}
                    onChange={(event) =>
                      setEditingSession((previous) =>
                        previous
                          ? { ...previous, awayMessage: event.target.value }
                          : previous,
                      )
                    }
                    className="min-h-[8rem] bg-[color:var(--color-card)]"
                  />
                </div>
              </div>

              <SettingsToggle
                label={t("whatsappSettings.dialogs.makeDefault")}
                checked={editingSession.isDefault}
                onCheckedChange={(checked) =>
                  setEditingSession((previous) =>
                    previous ? { ...previous, isDefault: checked } : previous,
                  )
                }
              />

              <div className="space-y-2 rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                      Load balancing weight
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      Higher numbers route more work to this session.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]"
                  >
                    {editingSession.loadBalanceWeight || 1}
                  </Badge>
                </div>
                <Slider
                  className="mt-4"
                  min={1}
                  max={10}
                  step={1}
                  value={[editingSession.loadBalanceWeight || 1]}
                  onValueChange={([value]) =>
                    setEditingSession((previous) =>
                      previous ? { ...previous, loadBalanceWeight: value } : previous,
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
              onClick={() => setEditingSession(null)}
            >
              {t("whatsappSettings.dialogs.cancel")}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={() => void handleUpdateSession()}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.dialogs.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={quickReplyDialogOpen}
        onOpenChange={(open) => {
          setQuickReplyDialogOpen(open);
          if (!open) {
            setEditingQuickReply(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>
              {editingQuickReply
                ? t("whatsappSettings.dialogs.editQuickReply")
                : t("whatsappSettings.dialogs.addQuickReplyTitle")}
            </DialogTitle>
            <DialogDescription>{t("whatsappSettings.quickReplies")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="quick-reply-title">{t("whatsappSettings.dialogs.title")}</Label>
              <Input
                id="quick-reply-title"
                value={quickReplyForm.title}
                onChange={(event) =>
                  setQuickReplyForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                className="h-11 bg-[color:var(--color-card)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-reply-shortcut">{t("whatsappSettings.dialogs.shortcut")}</Label>
              <Input
                id="quick-reply-shortcut"
                value={quickReplyForm.shortcut}
                onChange={(event) =>
                  setQuickReplyForm((previous) => ({
                    ...previous,
                    shortcut: event.target.value,
                  }))
                }
                placeholder={t("whatsappSettings.dialogs.shortcutPlaceholder")}
                className="h-11 bg-[color:var(--color-card)]"
              />
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                {t("whatsappSettings.dialogs.shortcutHelper")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("whatsappSettings.dialogs.category")}</Label>
              <Select
                value={quickReplyForm.category}
                onValueChange={(value) =>
                  setQuickReplyForm((previous) => ({
                    ...previous,
                    category: value,
                  }))
                }
              >
                <SelectTrigger className="h-11 bg-[color:var(--color-card)]">
                  <SelectValue placeholder={t("whatsappSettings.dialogs.category")} />
                </SelectTrigger>
                <SelectContent>
                  {quickReplyCategoryKeys.map((categoryKey) => (
                    <SelectItem key={categoryKey} value={categoryKey}>
                      {t(`whatsappSettings.categories.${categoryKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-reply-content">{t("whatsappSettings.dialogs.content")}</Label>
              <Textarea
                id="quick-reply-content"
                value={quickReplyForm.content}
                onChange={(event) =>
                  setQuickReplyForm((previous) => ({
                    ...previous,
                    content: event.target.value,
                  }))
                }
                className="min-h-[9rem] bg-[color:var(--color-card)]"
              />
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                {t("whatsappSettings.dialogs.variablesHelper")}
              </p>
            </div>
          </div>

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
              onClick={() => setQuickReplyDialogOpen(false)}
            >
              {t("whatsappSettings.dialogs.cancel")}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={() => void handleSaveQuickReply()}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.dialogs.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>{t("whatsappSettings.dialogs.addLabelTitle")}</DialogTitle>
            <DialogDescription>{t("whatsappSettings.manageLabels")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="label-name">{t("whatsappSettings.dialogs.labelName")}</Label>
              <Input
                id="label-name"
                value={labelForm.name}
                onChange={(event) =>
                  setLabelForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                className="h-11 bg-[color:var(--color-card)]"
              />
            </div>

            <div className="space-y-3">
              <Label>{t("whatsappSettings.dialogs.color")}</Label>
              <div className="flex flex-wrap gap-2">
                {labelPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "size-9 rounded-full border-2 transition-transform hover:scale-105",
                      labelForm.color === color
                        ? "border-[color:var(--color-foreground)]"
                        : "border-white/70",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setLabelForm((previous) => ({ ...previous, color }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
              onClick={() => setLabelDialogOpen(false)}
            >
              {t("whatsappSettings.dialogs.cancel")}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={() => void handleCreateLabel()}
              disabled={saving || !labelForm.name.trim()}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.dialogs.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .qr-fade-in {
          animation: qrFadeIn 0.4s ease-out;
        }
        @keyframes qrFadeIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .qr-loading-pulse {
          animation: qrPulse 1.5s ease-in-out infinite;
        }
        @keyframes qrPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(calc(100%-2rem),30rem)] overflow-visible rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-[30rem]"
        >
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6 sm:px-8 sm:pt-7">
            <DialogTitle>{t("whatsappSettings.dialogs.scanQR")}</DialogTitle>
            <DialogDescription>{t("whatsappSettings.dialogs.scanInstructions")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center gap-5 px-6 pb-7 pt-5 text-center sm:px-8">
            {currentPairingCode ? (
              <div className="w-full space-y-4 qr-fade-in">
                <div className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-5">
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    افتح واتساب على رقم
                    {currentPairingPhone ? (
                      <span className="mx-1 font-semibold" dir="ltr">
                        {currentPairingPhone}
                      </span>
                    ) : null}
                    ثم ادخل كود الربط.
                  </p>
                  <p
                    className="mt-4 select-all text-3xl font-semibold tracking-normal text-[color:var(--color-foreground)]"
                    dir="ltr"
                  >
                    {formatPairingCode(currentPairingCode)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                  onClick={() =>
                    void navigator.clipboard?.writeText(currentPairingCode)
                  }
                >
                  <Copy className="size-4" />
                  نسخ الكود
                </Button>
              </div>
            ) : currentQR ? (
              <div className="mx-auto flex flex-col items-center gap-2">
                {qrRefreshed && (
                  <p className="animate-pulse text-xs font-medium text-[color:var(--color-primary)]">
                    {t("whatsappSettings.dialogs.qrRefreshed")}
                  </p>
                )}
                <div className="mx-auto rounded-3xl bg-white p-5 shadow-[0_24px_50px_rgba(15,27,45,0.16)] ring-1 ring-black/5 qr-fade-in">
                  <QRCodeSVG
                    value={currentQR}
                    size={320}
                    marginSize={4}
                    bgColor="#FFFFFF"
                    fgColor="#111827"
                    level="M"
                    className="block h-auto w-[min(72vw,20rem)]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 qr-loading-pulse">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                  <QrCode className="size-8 text-[color:var(--color-primary)]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    {t("whatsappSettings.dialogs.waitingQR")}
                  </p>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {t("whatsappSettings.dialogs.pairingTakeTime")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
              onClick={() => setQrDialogOpen(false)}
            >
              {t("whatsappSettings.dialogs.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteState}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteState(null);
          }
        }}
      >
        <AlertDialogContent
          size="sm"
          className="rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)]"
        >
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-200">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("whatsappSettings.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState?.kind === "session"
                ? t("whatsappSettings.dialogs.deleteConfirmSession")
                : deleteState?.kind === "quickReply"
                  ? t("whatsappSettings.dialogs.deleteConfirmQuickReply")
                  : t("whatsappSettings.dialogs.deleteConfirmLabel")}
            </AlertDialogDescription>
            {deleteState?.kind === "session" && (
              <div className="flex items-center space-x-2 pt-2 sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2">
                <Checkbox
                  id="keepHistory"
                  checked={keepHistory}
                  onCheckedChange={(checked) => setKeepHistory(!!checked)}
                />
                <Label htmlFor="keepHistory" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t("whatsappSettings.dialogs.keepHistoryDeleteDialog")}
                </Label>
              </div>
            )}
          </AlertDialogHeader>
           <AlertDialogFooter className="rounded-b-3xl border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:var(--color-muted)]">
            <AlertDialogCancel>{t("whatsappSettings.dialogs.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={() => void handleConfirmDelete()}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("whatsappSettings.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WhatsAppPageShell>
  );
};

export default WhatsAppSettings;
