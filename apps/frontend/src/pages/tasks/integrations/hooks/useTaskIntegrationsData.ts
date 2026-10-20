import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { tToast } from '@/utils/i18n-toast';
import { buildApiUrl } from '@/utils/urlHelper';
import tokenManager from '@/utils/tokenManager';
import type {
  TaskCredential,
  TaskWebhook,
  OpenClawProfile,
  WebhookDelivery,
  Pagination,
  RevealedSecret,
  CredentialFormState,
  WebhookFormState,
  OpenClawQuickSetupState,
  SaveWebhookOptions,
  ApiResponse,
  TestWebhookResponse,
  RetryWebhookDeliveryResponse,
  DeliveryFilter,
  CompanyUser,
} from '../types/taskIntegrationTypes';
import {
  createInitialCredentialForm,
  createInitialWebhookForm,
  createInitialOpenClawQuickSetup,
  createOpenClawLocalPreset,
  createOpenClawProductionPreset,
  getDefaultOpenClawName,
  getDefaultOpenClawBaseUrl,
  toOpenClawQuickSetupState,
  parseCustomHeaders,
  hasOpenClawAuthHeader,
  normalizeOpenClawAgentUrl,
  buildWebhookProviderConfigPayload,
  toWebhookFormProviderConfig,
  TASK_WEBHOOK_EVENTS,
  prettifyJson,
} from '../utils/taskIntegrationConstants';

export const useTaskIntegrationsData = (
  activeCompanyId: string | null,
  defaultUserId: string,
  userOptions: { id: string; label: string }[],
  canManageIntegrations: boolean,
) => {
  const [credentials, setCredentials] = useState<TaskCredential[]>([]);
  const [openClawProfiles, setOpenClawProfiles] = useState<OpenClawProfile[]>(
    [],
  );
  const [webhooks, setWebhooks] = useState<TaskWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [loadingDeliveriesFor, setLoadingDeliveriesFor] = useState<string | null>(
    null,
  );
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(
    null,
  );
  const [deliveriesByWebhook, setDeliveriesByWebhook] = useState<
    Record<string, WebhookDelivery[]>
  >({});
  const [deliveryFilterByWebhook, setDeliveryFilterByWebhook] = useState<
    Record<string, DeliveryFilter>
  >({});
  const [deliveryPaginationByWebhook, setDeliveryPaginationByWebhook] =
    useState<Record<string, Pagination>>({});

  const [credentialForm, setCredentialForm] = useState<CredentialFormState>(
    createInitialCredentialForm(defaultUserId),
  );
  const [webhookForm, setWebhookForm] = useState<WebhookFormState>(
    createInitialWebhookForm(),
  );
  const [openClawQuickSetup, setOpenClawQuickSetup] =
    useState<OpenClawQuickSetupState>(createInitialOpenClawQuickSetup());

  const [editingCredential, setEditingCredential] =
    useState<TaskCredential | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<TaskWebhook | null>(
    null,
  );
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [submittingCredential, setSubmittingCredential] = useState(false);
  const [submittingWebhook, setSubmittingWebhook] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(
    null,
  );
  const [savingOpenClawProfile, setSavingOpenClawProfile] = useState(false);
  const [hydratingOpenClawProfileId, setHydratingOpenClawProfileId] = useState<
    string | null
  >(null);
  const [deletingOpenClawProfileId, setDeletingOpenClawProfileId] = useState<
    string | null
  >(null);
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecret | null>(
    null,
  );

  const previousCompanyIdRef = useRef<string | null>(null);

  const currentOpenClawProfile = Array.isArray(openClawProfiles)
    ? openClawProfiles.find(
        (profile) => profile.environment === openClawQuickSetup.environment,
      ) || null
    : null;

  const requestWithAuth = async <T,>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error('يجب تسجيل الدخول أولًا');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    });

    const rawBody = await response.text();
    const parsedBody = rawBody
      ? (JSON.parse(rawBody) as ApiResponse<T>)
      : ({ success: response.ok } as ApiResponse<T>);

    if (!response.ok || parsedBody.success === false) {
      throw new Error(parsedBody.message || 'حدث خطأ غير متوقع');
    }

    return parsedBody;
  };

  const copySecret = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (_error) {
      tToast.error('taskIntegrations.msg_218b');
    }
  };

  const resetCredentialForm = () => {
    setCredentialForm(createInitialCredentialForm(defaultUserId));
    setEditingCredential(null);
    setShowCredentialForm(false);
  };

  const resetWebhookForm = () => {
    setWebhookForm(createInitialWebhookForm());
    setEditingWebhook(null);
    setShowWebhookForm(false);
  };

  const loadCredentials = async () => {
    const response = await requestWithAuth<TaskCredential[]>(
      'tasks/integrations/credentials',
    );
    setCredentials(Array.isArray(response.data) ? response.data : []);
  };

  const loadWebhooks = async () => {
    const response = await requestWithAuth<TaskWebhook[]>(
      'tasks/integrations/webhooks',
    );
    setWebhooks(Array.isArray(response.data) ? response.data : []);
  };

  const loadOpenClawProfiles = async () => {
    const response = await requestWithAuth<OpenClawProfile[]>(
      'tasks/integrations/openclaw-profiles',
    );
    setOpenClawProfiles(Array.isArray(response.data) ? response.data : []);
  };

  const loadIntegrations = async () => {
    if (!activeCompanyId || !canManageIntegrations) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      await Promise.all([
        loadCredentials(),
        loadOpenClawProfiles(),
        loadWebhooks(),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تحميل تكاملات المهام';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Credentials actions
  const toggleCredentialScope = (scope: string) => {
    setCredentialForm((current) => ({
      ...current,
      scopes: current.scopes.includes(scope)
        ? current.scopes.filter((item) => item !== scope)
        : [...current.scopes, scope],
    }));
  };

  const submitCredential = async () => {
    if (!credentialForm.name.trim()) {
      tToast.error('taskIntegrations.name_required_d4fe');
      return;
    }

    if (credentialForm.scopes.length === 0) {
      tToast.error('taskIntegrations.msg_770f');
      return;
    }

    if (
      (credentialForm.scopes.includes('tasks:write') ||
        credentialForm.scopes.includes('tasks:update')) &&
      !credentialForm.actorUserId.trim()
    ) {
      tToast.error('taskIntegrations.msg_7395');
      return;
    }

    try {
      setSubmittingCredential(true);
      const payload = {
        name: credentialForm.name.trim(),
        description: credentialForm.description.trim() || null,
        scopes: credentialForm.scopes,
        expiresAt: credentialForm.expiresAt
          ? new Date(credentialForm.expiresAt).toISOString()
          : null,
        isActive: credentialForm.isActive,
        userId:
          credentialForm.ownershipType === 'USER'
            ? credentialForm.actorUserId || null
            : null,
        defaultActingUserId:
          credentialForm.ownershipType === 'COMPANY'
            ? credentialForm.actorUserId || null
            : null,
      };

      const response = editingCredential
        ? await requestWithAuth<TaskCredential>(
            `tasks/integrations/credentials/${editingCredential.id}`,
            {
              method: 'PUT',
              body: JSON.stringify(payload),
            },
          )
        : await requestWithAuth<TaskCredential>(
            'tasks/integrations/credentials',
            {
              method: 'POST',
              body: JSON.stringify(payload),
            },
          );

      toast.success(
        response.message ||
          (editingCredential ? 'تم تحديث المفتاح' : 'تم إنشاء المفتاح'),
      );

      if (response.secret?.apiKey) {
        setRevealedSecret({
          title: 'تم إصدار API Key جديدة',
          description:
            'انسخ المفتاح الآن، فلن يظهر لك مرة أخرى بعد إغلاق هذه البطاقة.',
          value: response.secret.apiKey,
        });
      }

      resetCredentialForm();
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حفظ مفتاح التكامل',
      );
    } finally {
      setSubmittingCredential(false);
    }
  };

  const startEditingCredential = (credential: TaskCredential) => {
    setEditingCredential(credential);
    setCredentialForm({
      name: credential.name,
      description: credential.description || '',
      ownershipType: credential.ownershipType,
      actorUserId:
        credential.ownershipType === 'USER'
          ? credential.userId || ''
          : credential.defaultActingUserId || '',
      scopes: credential.scopes,
      expiresAt: credential.expiresAt
        ? new Date(credential.expiresAt).toISOString().slice(0, 16)
        : '',
      isActive: credential.isActive,
    });
    setShowCredentialForm(true);
  };

  const rotateCredential = async (credential: TaskCredential) => {
    if (
      !window.confirm(
        `سيتم تدوير المفتاح "${credential.name}" وإبطال القيمة الحالية فورًا. هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<TaskCredential>(
        `tasks/integrations/credentials/${credential.id}/rotate`,
        {
          method: 'POST',
        },
      );

      if (response.secret?.apiKey) {
        setRevealedSecret({
          title: `تم تدوير المفتاح: ${credential.name}`,
          description:
            'المفتاح القديم أصبح غير صالح. انسخ القيمة الجديدة الآن.',
          value: response.secret.apiKey,
        });
      }

      toast.success(response.message || 'تم تدوير المفتاح');
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر تدوير المفتاح',
      );
    }
  };

  const toggleCredentialActiveState = async (credential: TaskCredential) => {
    try {
      const response = await requestWithAuth<TaskCredential>(
        `tasks/integrations/credentials/${credential.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ isActive: !credential.isActive }),
        },
      );
      toast.success(
        response.message ||
          (credential.isActive ? 'تم تعطيل المفتاح' : 'تم تفعيل المفتاح'),
      );
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر تحديث حالة المفتاح',
      );
    }
  };

  const revokeCredential = async (credential: TaskCredential) => {
    if (
      !window.confirm(
        `سيتم إلغاء المفتاح "${credential.name}" نهائيًا. هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<null>(
        `tasks/integrations/credentials/${credential.id}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ reason: 'revoked from tasks UI' }),
        },
      );
      toast.success(response.message || 'تم إلغاء المفتاح');
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر إلغاء المفتاح',
      );
    }
  };

  // Webhook actions
  const toggleWebhookEvent = (eventName: string) => {
    setWebhookForm((current) => ({
      ...current,
      subscribedEvents: current.subscribedEvents.includes(eventName)
        ? current.subscribedEvents.filter((item) => item !== eventName)
        : [...current.subscribedEvents, eventName],
    }));
  };

  const buildWebhookPayload = (
    formState: WebhookFormState,
    webhookToEdit: TaskWebhook | null,
  ): Record<string, unknown> | null => {
    if (!formState.name.trim()) {
      tToast.error('taskIntegrations.msg_6566');
      return null;
    }

    if (!formState.targetUrl.trim()) {
      tToast.error('taskIntegrations.msg_b920');
      return null;
    }

    if (formState.subscribedEvents.length === 0) {
      tToast.error('taskIntegrations.msg_2cdf');
      return null;
    }

    const parsedHeaders = parseCustomHeaders(formState.customHeaders);
    if (!parsedHeaders.isValid) {
      toast.error(parsedHeaders.error || 'صيغة customHeaders غير صحيحة');
      return null;
    }

    if (
      formState.providerType === 'OPENCLAW' &&
      !hasOpenClawAuthHeader(parsedHeaders.parsed)
    ) {
      toast.error(
        'OpenClaw تحتاج Authorization أو x-openclaw-token داخل customHeaders',
      );
      return null;
    }

    const payload: Record<string, unknown> = {
      name: formState.name.trim(),
      targetUrl: formState.targetUrl.trim(),
      providerType: formState.providerType,
      providerConfig:
        formState.providerType === 'OPENCLAW'
          ? buildWebhookProviderConfigPayload(formState)
          : {},
      subscribedEvents: formState.subscribedEvents,
      customHeaders: parsedHeaders.parsed,
      isActive: formState.isActive,
    };

    if (!webhookToEdit) {
      if (formState.secretMode === 'custom') {
        payload['signingSecret'] = formState.signingSecret.trim();
      } else if (formState.secretMode === 'none') {
        payload['signingSecret'] = '';
      }
    } else if (formState.secretMode === 'custom') {
      payload['signingSecret'] = formState.signingSecret.trim();
    } else if (formState.secretMode === 'none') {
      payload['signingSecret'] = '';
    } else if (formState.secretMode === 'rotate') {
      payload['rotateSigningSecret'] = true;
    }

    return payload;
  };

  const saveWebhook = async ({
    formState = webhookForm,
    webhookToEdit = editingWebhook,
    resetAfterSave = true,
    testAfterSave = false,
  }: SaveWebhookOptions = {}): Promise<TaskWebhook | null> => {
    const payload = buildWebhookPayload(formState, webhookToEdit);
    if (!payload) return null;

    try {
      setSubmittingWebhook(true);

      const response = webhookToEdit
        ? await requestWithAuth<TaskWebhook>(
            `tasks/integrations/webhooks/${webhookToEdit.id}`,
            {
              method: 'PUT',
              body: JSON.stringify(payload),
            },
          )
        : await requestWithAuth<TaskWebhook>('tasks/integrations/webhooks', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      toast.success(
        response.message ||
          (webhookToEdit ? 'تم تحديث الـ webhook' : 'تم إنشاء الـ webhook'),
      );

      if (response.secret?.signingSecret) {
        setRevealedSecret({
          title: webhookToEdit
            ? `تم تدوير secret الحالية لـ ${formState.name}`
            : 'تم إنشاء signing secret جديدة',
          description:
            'احفظ هذه القيمة الآن، فهي لن تُعرض مرة أخرى بنفس الشكل.',
          value: response.secret.signingSecret,
        });
      }

      if (resetAfterSave) {
        resetWebhookForm();
      }
      await loadWebhooks();
      const savedWebhook = response.data || null;

      if (testAfterSave && savedWebhook) {
        await testWebhookConnection(savedWebhook);
      }

      return savedWebhook;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حفظ الـ webhook',
      );
      return null;
    } finally {
      setSubmittingWebhook(false);
    }
  };

  const submitWebhook = async () => {
    await saveWebhook();
  };

  const startEditingWebhook = (webhook: TaskWebhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      targetUrl: webhook.targetUrl,
      providerType: webhook.providerType || 'GENERIC',
      providerConfig: toWebhookFormProviderConfig(webhook.providerConfig),
      subscribedEvents: webhook.subscribedEvents,
      customHeaders: prettifyJson(webhook.customHeaders),
      secretMode: 'keep',
      signingSecret: '',
      isActive: webhook.isActive,
    });
    setShowWebhookForm(true);
  };

  const toggleWebhookActiveState = async (webhook: TaskWebhook) => {
    try {
      const response = await requestWithAuth<TaskWebhook>(
        `tasks/integrations/webhooks/${webhook.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ isActive: !webhook.isActive }),
        },
      );
      toast.success(
        response.message ||
          (webhook.isActive ? 'تم تعطيل الـ webhook' : 'تم تفعيل الـ webhook'),
      );
      await loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر تحديث حالة الـ webhook',
      );
    }
  };

  const rotateWebhookSecret = async (webhook: TaskWebhook) => {
    if (
      !window.confirm(
        `سيتم تدوير signing secret لـ "${webhook.name}". هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<TaskWebhook>(
        `tasks/integrations/webhooks/${webhook.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ rotateSigningSecret: true }),
        },
      );

      if (response.secret?.signingSecret) {
        setRevealedSecret({
          title: `تم تدوير signing secret: ${webhook.name}`,
          description: 'انسخ القيمة الجديدة الآن وأحدثها في النظام الخارجي.',
          value: response.secret.signingSecret,
        });
      }

      toast.success(response.message || 'تم تدوير signing secret');
      await loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر تدوير signing secret',
      );
    }
  };

  const deleteWebhook = async (webhook: TaskWebhook) => {
    if (
      !window.confirm(
        `سيتم حذف الـ webhook "${webhook.name}". هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<null>(
        `tasks/integrations/webhooks/${webhook.id}`,
        { method: 'DELETE' },
      );
      toast.success(response.message || 'تم حذف الـ webhook');
      setExpandedWebhookId((current) =>
        current === webhook.id ? null : current,
      );
      await loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حذف الـ webhook',
      );
    }
  };

  const loadWebhookDeliveries = async (webhookId: string, force = false) => {
    if (!force && deliveriesByWebhook[webhookId]) return;

    try {
      setLoadingDeliveriesFor(webhookId);
      const response = await requestWithAuth<WebhookDelivery[]>(
        `tasks/integrations/webhooks/${webhookId}/deliveries`,
      );

      setDeliveriesByWebhook((current) => ({
        ...current,
        [webhookId]: response.data || [],
      }));

      if (response.pagination) {
        setDeliveryPaginationByWebhook((current) => ({
          ...current,
          [webhookId]: response.pagination as Pagination,
        }));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر تحميل سجل التسليم',
      );
    } finally {
      setLoadingDeliveriesFor(null);
    }
  };

  const toggleDeliveries = async (webhookId: string) => {
    if (expandedWebhookId === webhookId) {
      setExpandedWebhookId(null);
      return;
    }
    setExpandedWebhookId(webhookId);
    await loadWebhookDeliveries(webhookId);
  };

  const testWebhookConnection = async (webhook: TaskWebhook) => {
    try {
      setTestingWebhookId(webhook.id);
      const preferredEvent = webhook.subscribedEvents.includes(
        'task.status_changed',
      )
        ? 'task.status_changed'
        : webhook.subscribedEvents[0] || 'task.updated';

      const response = await requestWithAuth<TestWebhookResponse>(
        `tasks/integrations/webhooks/${webhook.id}/test`,
        {
          method: 'POST',
          body: JSON.stringify({ event: preferredEvent }),
        },
      );

      const testResult = response.data?.result;
      if (testResult?.success) {
        toast.success(response.message || 'تم إرسال اختبار الـ webhook');
      } else {
        toast.error(
          testResult?.errorMessage ||
            response.message ||
            'تم تنفيذ الاختبار لكن الإرسال فشل',
        );
      }

      setDeliveriesByWebhook((current) => {
        const next = { ...current };
        delete next[webhook.id];
        return next;
      });
      setExpandedWebhookId(webhook.id);
      await Promise.all([
        loadWebhookDeliveries(webhook.id, true),
        loadWebhooks(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر اختبار الـ webhook',
      );
    } finally {
      setTestingWebhookId(null);
    }
  };

  const retryWebhookDelivery = async (
    webhookId: string,
    delivery: WebhookDelivery,
  ) => {
    try {
      setRetryingDeliveryId(delivery.id);
      const response = await requestWithAuth<RetryWebhookDeliveryResponse>(
        `tasks/integrations/webhooks/${webhookId}/deliveries/${delivery.id}/retry`,
        { method: 'POST' },
      );

      const retryResult = response.data?.result;
      if (retryResult?.success) {
        toast.success(response.message || 'تمت إعادة إرسال الـ webhook');
      } else {
        toast.error(
          retryResult?.errorMessage ||
            response.message ||
            'تمت إعادة الإرسال لكن الـ webhook فشلت',
        );
      }

      setExpandedWebhookId(webhookId);
      await Promise.all([
        loadWebhookDeliveries(webhookId, true),
        loadWebhooks(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر إعادة إرسال الـ webhook',
      );
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  // OpenClaw presets & profiles
  const applyOpenClawLocalPreset = () => {
    setWebhookForm((current) => ({
      ...current,
      ...createOpenClawLocalPreset(),
      name: current.name || 'OpenClaw Tasks Sync',
    }));
    setShowWebhookForm(true);
    toast.success(
      'تم تعبئة إعدادات OpenClaw المحلية. راجع الـ token قبل الحفظ.',
    );
  };

  const applyOpenClawProductionPreset = () => {
    setWebhookForm((current) => ({
      ...current,
      ...createOpenClawProductionPreset(),
      name: current.name || 'OpenClaw Tasks Sync - Production',
    }));
    setShowWebhookForm(true);
    toast.success(
      'تم تعبئة إعدادات OpenClaw للإنتاج. راجع الدومين والـ token قبل الحفظ.',
    );
  };

  const hydrateOpenClawProfile = async (
    profile: OpenClawProfile,
    options: { applyToState?: boolean; silent?: boolean } = {},
  ): Promise<OpenClawQuickSetupState | null> => {
    const { applyToState = true, silent = false } = options;
    try {
      setHydratingOpenClawProfileId(profile.id);
      const response = await requestWithAuth<OpenClawProfile>(
        `tasks/integrations/openclaw-profiles/${profile.id}/reveal`,
        { method: 'POST' },
      );
      const hydratedProfile = response.data;
      if (!hydratedProfile?.hookToken) {
        throw new Error('تعذر تحميل Hook Token المحفوظة');
      }

      const nextState = toOpenClawQuickSetupState({
        ...hydratedProfile,
        hookToken: hydratedProfile.hookToken,
      });

      if (applyToState) {
        setOpenClawQuickSetup(nextState);
      }
      if (!silent) {
        toast.success(response.message || 'تم تحميل إعداد OpenClaw المحفوظ');
      }
      return nextState;
    } catch (error) {
      if (!silent) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'تعذر تحميل إعداد OpenClaw المحفوظ',
        );
      }
      return null;
    } finally {
      setHydratingOpenClawProfileId(null);
    }
  };

  const saveOpenClawProfile = async () => {
    const normalizedBaseUrl = openClawQuickSetup.baseUrl.trim();
    if (!normalizedBaseUrl) {
      tToast.error('taskIntegrations.msg_a3c9');
      return;
    }

    if (
      !openClawQuickSetup.hookToken.trim() &&
      !currentOpenClawProfile?.hasHookToken
    ) {
      tToast.error('taskIntegrations.msg_9d3f');
      return;
    }

    try {
      setSavingOpenClawProfile(true);
      const payload = {
        environment: openClawQuickSetup.environment,
        name:
          openClawQuickSetup.name.trim() ||
          getDefaultOpenClawName(openClawQuickSetup.environment),
        baseUrl: normalizedBaseUrl,
        hookToken: openClawQuickSetup.hookToken.trim() || undefined,
        agentId: openClawQuickSetup.agentId.trim(),
        wakeMode: openClawQuickSetup.wakeMode,
        sessionMode: openClawQuickSetup.sessionMode,
        deliver: openClawQuickSetup.deliver,
      };

      const response = currentOpenClawProfile
        ? await requestWithAuth<OpenClawProfile>(
            `tasks/integrations/openclaw-profiles/${currentOpenClawProfile.id}`,
            { method: 'PUT', body: JSON.stringify(payload) },
          )
        : await requestWithAuth<OpenClawProfile>(
            'tasks/integrations/openclaw-profiles',
            { method: 'POST', body: JSON.stringify(payload) },
          );

      toast.success(
        response.message ||
          (currentOpenClawProfile
            ? 'تم تحديث إعداد OpenClaw المحفوظ'
            : 'تم حفظ إعداد OpenClaw'),
      );
      await loadOpenClawProfiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حفظ إعداد OpenClaw',
      );
    } finally {
      setSavingOpenClawProfile(false);
    }
  };

  const deleteOpenClawProfile = async (profile: OpenClawProfile) => {
    if (
      !window.confirm(`سيتم حذف الإعداد "${profile.name}". هل تريد المتابعة؟`)
    ) {
      return;
    }

    try {
      setDeletingOpenClawProfileId(profile.id);
      const response = await requestWithAuth<null>(
        `tasks/integrations/openclaw-profiles/${profile.id}`,
        { method: 'DELETE' },
      );
      toast.success(response.message || 'تم حذف إعداد OpenClaw');
      await loadOpenClawProfiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حذف إعداد OpenClaw',
      );
    } finally {
      setDeletingOpenClawProfileId(null);
    }
  };

  const buildOpenClawQuickSetupForm = async (): Promise<WebhookFormState | null> => {
    let quickSetupState = openClawQuickSetup;
    if (!quickSetupState.hookToken.trim() && currentOpenClawProfile) {
      const hydrated = await hydrateOpenClawProfile(currentOpenClawProfile, {
        applyToState: false,
        silent: true,
      });
      if (hydrated) quickSetupState = hydrated;
    }

    const targetUrl = normalizeOpenClawAgentUrl(quickSetupState.baseUrl);
    if (!targetUrl) {
      tToast.error('taskIntegrations.msg_43bd');
      return null;
    }
    if (!quickSetupState.hookToken.trim()) {
      tToast.error('taskIntegrations.msg_a6c0');
      return null;
    }

    return {
      name:
        quickSetupState.name.trim() ||
        getDefaultOpenClawName(quickSetupState.environment),
      targetUrl,
      providerType: 'OPENCLAW',
      providerConfig: {
        name: 'Tasks',
        agentId: quickSetupState.agentId.trim(),
        wakeMode: quickSetupState.wakeMode,
        deliver: quickSetupState.deliver,
        channel: 'last',
        to: '',
        model: '',
        thinking: '',
        timeoutSeconds: '',
        sessionMode: quickSetupState.sessionMode,
        sessionKeyPrefix: 'hook:task:',
      },
      subscribedEvents: TASK_WEBHOOK_EVENTS.map((item) => item.value),
      customHeaders: JSON.stringify(
        {
          Authorization: `Bearer ${quickSetupState.hookToken.trim()}`,
        },
        null,
        2,
      ),
      secretMode: 'none',
      signingSecret: '',
      isActive: true,
    };
  };

  const applyOpenClawQuickSetup = async () => {
    const nextForm = await buildOpenClawQuickSetupForm();
    if (!nextForm) return;

    setWebhookForm(nextForm);
    setEditingWebhook(null);
    setShowWebhookForm(true);
    tToast.success('taskIntegrations.msg_e3f1');
  };

  const createOpenClawWebhookFromQuickSetup = async (testAfterSave = false) => {
    const nextForm = await buildOpenClawQuickSetupForm();
    if (!nextForm) return;

    await saveWebhook({
      formState: nextForm,
      webhookToEdit: null,
      resetAfterSave: true,
      testAfterSave,
    });
  };

  useEffect(() => {
    if (!activeCompanyId) {
      setCredentials([]);
      setOpenClawProfiles([]);
      setWebhooks([]);
      setDeliveriesByWebhook({});
      setDeliveryFilterByWebhook({});
      setDeliveryPaginationByWebhook({});
      setExpandedWebhookId(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    void loadIntegrations();
  }, [activeCompanyId, canManageIntegrations]);

  useEffect(() => {
    if (!activeCompanyId) return;

    const previousCompanyId = previousCompanyIdRef.current;
    previousCompanyIdRef.current = activeCompanyId;

    if (!previousCompanyId || previousCompanyId === activeCompanyId) return;

    setExpandedWebhookId(null);
    setDeliveriesByWebhook({});
    setDeliveryFilterByWebhook({});
    setDeliveryPaginationByWebhook({});
    setRevealedSecret(null);
    setEditingCredential(null);
    setEditingWebhook(null);
    setShowCredentialForm(false);
    setShowWebhookForm(false);
    setCredentialForm(createInitialCredentialForm(defaultUserId));
    setWebhookForm(createInitialWebhookForm());
  }, [activeCompanyId, defaultUserId]);

  useEffect(() => {
    if (editingCredential) return;

    const fallbackActorUserId = userOptions[0]?.id || defaultUserId;
    setCredentialForm((current) => {
      if (
        current.actorUserId &&
        userOptions.some((opt) => opt.id === current.actorUserId)
      ) {
        return current;
      }
      if (current.actorUserId === fallbackActorUserId) return current;
      return { ...current, actorUserId: fallbackActorUserId };
    });
  }, [defaultUserId, editingCredential, userOptions]);

  return {
    credentials,
    openClawProfiles,
    webhooks,
    loading,
    loadError,
    loadingDeliveriesFor,
    expandedWebhookId,
    deliveriesByWebhook,
    deliveryFilterByWebhook,
    setDeliveryFilterByWebhook,
    deliveryPaginationByWebhook,
    credentialForm,
    setCredentialForm,
    webhookForm,
    setWebhookForm,
    openClawQuickSetup,
    setOpenClawQuickSetup,
    editingCredential,
    editingWebhook,
    showCredentialForm,
    setShowCredentialForm,
    showWebhookForm,
    setShowWebhookForm,
    submittingCredential,
    submittingWebhook,
    testingWebhookId,
    retryingDeliveryId,
    savingOpenClawProfile,
    hydratingOpenClawProfileId,
    deletingOpenClawProfileId,
    revealedSecret,
    setRevealedSecret,
    currentOpenClawProfile,
    loadIntegrations,
    copySecret,
    resetCredentialForm,
    resetWebhookForm,
    toggleCredentialScope,
    submitCredential,
    startEditingCredential,
    rotateCredential,
    toggleCredentialActiveState,
    revokeCredential,
    toggleWebhookEvent,
    submitWebhook,
    saveWebhook,
    startEditingWebhook,
    toggleWebhookActiveState,
    rotateWebhookSecret,
    deleteWebhook,
    loadWebhookDeliveries,
    toggleDeliveries,
    testWebhookConnection,
    retryWebhookDelivery,
    applyOpenClawLocalPreset,
    applyOpenClawProductionPreset,
    hydrateOpenClawProfile,
    saveOpenClawProfile,
    deleteOpenClawProfile,
    applyOpenClawQuickSetup,
    createOpenClawWebhookFromQuickSetup,
  };
};
