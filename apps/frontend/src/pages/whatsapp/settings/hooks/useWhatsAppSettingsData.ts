import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, type ApiRequestConfig } from "../../../../services/apiClient";
import { indexedDBStorage } from "../../../../services/indexedDBStorage";
import useSocket from "../../../../hooks/useSocket";
import type {
  BusinessProfileState,
  DeleteState,
  LabelFormData,
  LabelItem,
  PrivacySettingsState,
  QuickReply,
  QuickReplyFormData,
  Session,
  TabId,
  WorkspaceSettings,
  WhatsAppProvider,
} from "../types/whatsAppSettingsTypes";
import {
  tabsRequiringScopedSession,
} from "../types/whatsAppSettingsTypes";
import {
  getApiErrorMessage,
  isConnectedStatus,
  isReconnectingStatus,
} from "../utils/whatsAppSettingsUtils";

export function useWhatsAppSettingsData({
  companyId,
  activeTab,
}: {
  companyId?: string;
  activeTab: TabId;
}) {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [connectingSessionId, setConnectingSessionId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileState | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsState | null>(null);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [scopedSessionId, setScopedSessionId] = useState("");

  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);
  const [showManualMeta, setShowManualMeta] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [quickReplyDialogOpen, setQuickReplyDialogOpen] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [restoringLabels, setRestoringLabels] = useState(false);
  const [labelContactsLabel, setLabelContactsLabel] = useState<LabelItem | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [keepHistory, setKeepHistory] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentQR, setCurrentQR] = useState<string | null>(null);
  const [currentPairingCode, setCurrentPairingCode] = useState<string | null>(null);
  const [currentPairingPhone, setCurrentPairingPhone] = useState<string | null>(null);
  const [qrRefreshed, setQrRefreshed] = useState(false);

  const [newSessionName, setNewSessionName] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newImportHistory, setNewImportHistory] = useState(false);
  const [newKeepHistoryOnDelete, setNewKeepHistoryOnDelete] = useState(true);
  const [newSessionProvider, setNewSessionProvider] = useState<WhatsAppProvider>("BAILEYS");
  const [newMetaPhoneNumberId, setNewMetaPhoneNumberId] = useState("");
  const [newMetaWabaId, setNewMetaWabaId] = useState("");
  const [newMetaBusinessId, setNewMetaBusinessId] = useState("");
  const [newMetaAccessToken, setNewMetaAccessToken] = useState("");
  const [newMetaApiVersion, setNewMetaApiVersion] = useState("v25.0");
  const [newMetaWebhookVerifyToken, setNewMetaWebhookVerifyToken] = useState("");
  const [newMetaWebhookSecret, setNewMetaWebhookSecret] = useState("");
  const [newMetaDisplayPhoneNumber, setNewMetaDisplayPhoneNumber] = useState("");
  const [webhookDetailsSession, setWebhookDetailsSession] = useState<Session | null>(null);
  const [webhookDetailsOpen, setWebhookDetailsOpen] = useState(false);

  const [quickReplyForm, setQuickReplyForm] = useState<QuickReplyFormData>({
    title: "",
    shortcut: "",
    content: "",
    category: "general",
  });
  const [labelForm, setLabelForm] = useState<LabelFormData>({
    name: "",
    color: "#25D366",
  });

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const invalidateSessionsCache = useCallback(async () => {
    try {
      await indexedDBStorage.removeItem("whatsapp_sessions").catch(console.error);
      await queryClient.invalidateQueries({ queryKey: ["whatsapp", "sessions"] });
    } catch (err) {
      console.error("Error invalidating whatsapp sessions cache:", err);
    }
  }, [queryClient]);

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
    return token;
  }, []);

  const getMetaWebhookUrl = useCallback(
    () => `${window.location.origin}/api/v1/whatsapp-meta`,
    [],
  );

  const handleOpenCreateSessionDialog = useCallback(() => {
    if (!newMetaWebhookVerifyToken) {
      generateRandomVerifyToken();
    }
    setCreateSessionDialogOpen(true);
  }, [newMetaWebhookVerifyToken, generateRandomVerifyToken]);

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
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMetaWebhookVerifyToken(token);
    setNewMetaWebhookSecret("");
    setNewMetaDisplayPhoneNumber("");
    setWizardStep(1);
    setShowAdvancedMeta(false);
    setShowManualMeta(false);
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
        setSessions((sessionsResponse.value as any).data.sessions || []);
      } else {
        setSessions([]);
        showError(
          sessionsResponse.reason,
          tRef.current("whatsappSettings.dialogs.errorLoading"),
        );
      }

      if (settingsResponse.status === "fulfilled") {
        setSettings((settingsResponse.value as any).data.settings || null);
      } else {
        setSettings(null);
        showError(
          settingsResponse.reason,
          tRef.current("whatsappSettings.dialogs.errorLoading"),
        );
      }

      if (quickRepliesResponse.status === "fulfilled") {
        setQuickReplies((quickRepliesResponse.value as any).data.quickReplies || []);
      } else {
        setQuickReplies([]);
        showError(
          quickRepliesResponse.reason,
          tRef.current("whatsappSettings.dialogs.errorLoading"),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [showError, withCompanyConfig]);

  const loadBusinessProfile = useCallback(
    async (sessionId: string) => {
      setLoadingBusiness(true);
      try {
        const profileResponse = await apiClient.get(
          "/whatsapp/business/profile",
          withCompanyConfig({ params: { sessionId } }),
        );
        setBusinessProfile((profileResponse as any).data.profile || null);
      } catch (error) {
        showError(error, tRef.current("whatsappSettings.dialogs.errorLoading"));
      } finally {
        setLoadingBusiness(false);
      }
    },
    [showError, withCompanyConfig],
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

        setPrivacySettings((privacyResponse as any).data.settings || null);
        setBlocklist((blocklistResponse as any).data.blocklist || []);
      } catch (error) {
        showError(error, tRef.current("whatsappSettings.dialogs.errorLoading"));
      } finally {
        setLoadingPrivacy(false);
      }
    },
    [showError, withCompanyConfig],
  );

  const loadLabels = useCallback(
    async (sessionId: string) => {
      setLoadingLabels(true);
      try {
        const response = await apiClient.get(
          "/whatsapp/labels",
          withCompanyConfig({ params: { sessionId } }),
        );
        setLabels((response as any).data.labels || []);
      } catch (error) {
        showError(error, tRef.current("whatsappSettings.dialogs.errorLoading"));
      } finally {
        setLoadingLabels(false);
      }
    },
    [showError, withCompanyConfig],
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
    [loadBusinessProfile, loadLabels, loadPrivacySettings],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

    const nextSessionId = connectedSessions[0]?.id ?? "";
    setScopedSessionId(nextSessionId);

    if (tabsRequiringScopedSession.has(activeTab)) {
      void loadScopedTabData(activeTab, nextSessionId);
    }
  }, [activeTab, connectedSessions, loadScopedTabData, scopedSessionId]);

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
        payload["phoneNumber"] = newPhoneNumber.trim();
      }
      if (newSessionProvider === "BAILEYS" && newImportHistory) {
        payload["importHistory"] = true;
      }
      if (newSessionProvider === "BAILEYS") {
        payload["keepHistoryOnDelete"] = newKeepHistoryOnDelete;
      }

      if (newSessionProvider === "META_CLOUD") {
        if (newMetaPhoneNumberId.trim()) payload["metaPhoneNumberId"] = newMetaPhoneNumberId.trim();
        if (newMetaWabaId.trim()) payload["metaWabaId"] = newMetaWabaId.trim();
        if (newMetaBusinessId.trim()) payload["metaBusinessId"] = newMetaBusinessId.trim();
        if (newMetaAccessToken.trim()) payload["metaAccessToken"] = newMetaAccessToken.trim();
        if (newMetaApiVersion.trim()) payload["metaApiVersion"] = newMetaApiVersion.trim();
        if (newMetaWebhookVerifyToken.trim()) payload["metaWebhookVerifyToken"] = newMetaWebhookVerifyToken.trim();
        if (newMetaWebhookSecret.trim()) payload["metaWebhookSecret"] = newMetaWebhookSecret.trim();
        if (newMetaDisplayPhoneNumber.trim()) payload["metaDisplayPhoneNumber"] = newMetaDisplayPhoneNumber.trim();
      }

      const response = await apiClient.post(
        "/whatsapp/sessions",
        payload,
        withCompanyConfig(),
      );
      const createdSession = (response as any).data.session;

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
          importHistory: true,
        },
        withCompanyConfig(),
      );
      const updatedSession = (response as any).data.session;
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
      if (
        isConnectedStatus(updatedSession?.liveStatus) ||
        isConnectedStatus(updatedSession?.status)
      ) {
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

  const handleStartEditSession = (session: Session) => {
    let meta: any = {};
    try {
      meta =
        typeof session.metadata === "string"
          ? JSON.parse(session.metadata)
          : session.metadata || {};
    } catch {}
    setEditingSession({
      ...session,
      callShieldEnabled: session.callShieldEnabled ?? meta?.callShieldEnabled ?? false,
      callShieldMessage: session.callShieldMessage ?? meta?.callShieldMessage ?? "",
    });
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
          (response as any).data.quickReply,
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
      setLabels((previous) => [...previous, (response as any).data.label]);
      setLabelDialogOpen(false);
      setLabelForm({ name: "", color: "#25D366" });
      toast.success(t("whatsappSettings.dialogs.labelCreated"));
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaultLabels = async () => {
    if (!scopedSessionId) {
      return;
    }

    try {
      setRestoringLabels(true);
      const response = await apiClient.post(
        "/whatsapp/labels/restore",
        { sessionId: scopedSessionId },
        withCompanyConfig(),
      );
      const data = (response as any).data;
      if (scopedSessionId) {
        await loadLabels(scopedSessionId);
      }
      toast.success(
        data?.created?.length
          ? `تم استعادة ${data.created.length} تصنيف`
          : "جميع التصنيفات موجودة بالفعل",
      );
    } catch (error) {
      showError(error, t("common.error"));
    } finally {
      setRestoringLabels(false);
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

  return {
    loading,
    saving,
    refreshing,
    creatingSession,
    connectingSessionId,
    sessions,
    setSessions,
    settings,
    setSettings,
    quickReplies,
    businessProfile,
    setBusinessProfile,
    loadingBusiness,
    privacySettings,
    setPrivacySettings,
    blocklist,
    loadingPrivacy,
    labels,
    loadingLabels,
    scopedSessionId,
    connectedSessions,
    linkedContactsCount,
    sessionMessagesCount,
    currentScopedSession,
    createSessionDialogOpen,
    setCreateSessionDialogOpen,
    wizardStep,
    setWizardStep,
    showAdvancedMeta,
    setShowAdvancedMeta,
    showManualMeta,
    setShowManualMeta,
    editingSession,
    setEditingSession,
    quickReplyDialogOpen,
    setQuickReplyDialogOpen,
    editingQuickReply,
    setEditingQuickReply,
    labelDialogOpen,
    setLabelDialogOpen,
    restoringLabels,
    labelContactsLabel,
    setLabelContactsLabel,
    deleteState,
    setDeleteState,
    keepHistory,
    setKeepHistory,
    qrDialogOpen,
    setQrDialogOpen,
    currentQR,
    currentPairingCode,
    currentPairingPhone,
    qrRefreshed,
    newSessionName,
    setNewSessionName,
    newPhoneNumber,
    setNewPhoneNumber,
    newImportHistory,
    setNewImportHistory,
    newKeepHistoryOnDelete,
    setNewKeepHistoryOnDelete,
    newSessionProvider,
    setNewSessionProvider,
    newMetaPhoneNumberId,
    setNewMetaPhoneNumberId,
    newMetaWabaId,
    setNewMetaWabaId,
    newMetaBusinessId,
    setNewMetaBusinessId,
    newMetaAccessToken,
    setNewMetaAccessToken,
    newMetaApiVersion,
    setNewMetaApiVersion,
    newMetaWebhookVerifyToken,
    setNewMetaWebhookVerifyToken,
    newMetaWebhookSecret,
    setNewMetaWebhookSecret,
    newMetaDisplayPhoneNumber,
    setNewMetaDisplayPhoneNumber,
    webhookDetailsSession,
    setWebhookDetailsSession,
    webhookDetailsOpen,
    setWebhookDetailsOpen,
    quickReplyForm,
    setQuickReplyForm,
    labelForm,
    setLabelForm,
    loadData,
    loadLabels,
    loadScopedTabData,
    handleRefresh,
    handleScopedSessionChange,
    handleOpenCreateSessionDialog,
    resetNewSessionForm,
    handleCreateSession,
    handleConnectSession,
    handleDisconnectSession,
    handleStartEditSession,
    handleUpdateSession,
    handleSaveSettings,
    handleSaveQuickReply,
    handleSaveBusinessProfile,
    handleSavePrivacy,
    handleUnblock,
    handleCreateLabel,
    handleRestoreDefaultLabels,
    handleConfirmDelete,
    openCreateQuickReplyDialog,
    generateRandomVerifyToken,
    getMetaWebhookUrl,
  };
}
