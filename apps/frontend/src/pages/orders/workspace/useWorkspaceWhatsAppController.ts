import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../services/apiClient';
import type { WorkspaceOrder } from './types';
import { toast } from 'sonner';
import type { MetaTemplate } from './WorkspaceWhatsAppTemplates';
import type { ChatMessage } from './WorkspaceWhatsAppMessages';
import { sanitizeWhatsAppPhone } from './whatsappHelpers';
import { useModalA11y } from '../../../hooks/useModalA11y';

export interface WhatsAppSession {
  id: string;
  name?: string;
  phoneNumber?: string | null;
  metaDisplayPhoneNumber?: string | null;
  provider: string;
  status: string;
  isDefault?: boolean;
}

export interface UseWorkspaceWhatsAppControllerProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkspaceOrder | null;
}

export const useWorkspaceWhatsAppController = ({
  isOpen,
  onClose,
  order,
}: UseWorkspaceWhatsAppControllerProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const panelRef = useModalA11y(isOpen, onClose);

  const [activeSession, setActiveSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);

  const [activeTab, setActiveTab] = useState<'chat' | 'templates'>('chat');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<MetaTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<number, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const customerPhone = order?.customerPhone || '';
  const { cleanPhone, standardPhone } = sanitizeWhatsAppPhone(customerPhone);
  const externalWaUrl = `https://wa.me/${standardPhone}`;

  // 1. Fetch Company WhatsApp Sessions on Open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadSession = async () => {
      try {
        const res = await apiClient.get('/whatsapp/sessions');
        const list: WhatsAppSession[] = res.data?.sessions || [];
        const connected = list.find((s) => s.status === 'CONNECTED') || list[0] || null;
        if (isMounted) setActiveSession(connected);
      } catch (err) {
        console.error('Failed to load WhatsApp sessions:', err);
      }
    };

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Fetch Conversation Messages for Customer Phone
  useEffect(() => {
    if (!isOpen || !cleanPhone || !activeSession?.id) return;

    let isMounted = true;
    const loadConversation = async (silent = false) => {
      if (!silent) setLoadingMessages(true);
      try {
        const convRes = await apiClient.get('/whatsapp/conversations', {
          params: { search: cleanPhone, limit: 1 },
        });
        const conv = convRes.data?.conversations?.[0];

        if (conv?.jid) {
          const msgRes = await apiClient.get(
            `/whatsapp/conversations/${encodeURIComponent(conv.jid)}/messages`,
            {
              params: { sessionId: conv.sessionId || activeSession.id, limit: 50 },
            },
          );
          if (isMounted) {
            setMessages(msgRes.data?.messages || []);
          }
        } else if (isMounted) {
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      } finally {
        if (isMounted && !silent) setLoadingMessages(false);
      }
    };

    void loadConversation();
    const pollId = setInterval(() => void loadConversation(true), 12000);
    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [isOpen, cleanPhone, activeSession?.id]);

  // 3. Fetch Approved Templates for Session
  useEffect(() => {
    if (!isOpen || !activeSession?.id) return;

    let isMounted = true;
    const loadTemplates = async () => {
      try {
        const res = await apiClient.get('/whatsapp/templates', {
          params: { sessionId: activeSession.id },
        });
        const list: MetaTemplate[] = Array.isArray(res.data?.templates)
          ? res.data.templates
          : Array.isArray(res.data)
          ? res.data
          : [];
        const approved = list.filter((t) => t.status === 'APPROVED');
        if (isMounted) setTemplates(approved);
      } catch {
        // Fallback gracefully
      }
    };

    void loadTemplates();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeSession?.id]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSelectTemplate = (text: string, metaTemplate?: MetaTemplate) => {
    if (metaTemplate) {
      setActiveTemplate(metaTemplate);
      setTemplateVars({});
      setActiveTab('chat');
      return;
    }
    setMessageText(text);
    setActiveTab('chat');
  };

  const templateVarIndexes = useMemo(() => {
    if (!activeTemplate) return [];
    const body = activeTemplate.components?.find((c) => c.type === 'BODY')?.text || '';
    const found = new Set<number>();
    for (const m of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
      found.add(Number(m[1]));
    }
    return Array.from(found).sort((a, b) => a - b);
  }, [activeTemplate]);

  const filledTemplateBody = useMemo(() => {
    if (!activeTemplate) return '';
    const body = activeTemplate.components?.find((c) => c.type === 'BODY')?.text || activeTemplate.name;
    return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => templateVars[Number(n)]?.trim() || `{{${n}}}`);
  }, [activeTemplate, templateVars]);

  const handleCancelTemplate = () => {
    setActiveTemplate(null);
    setTemplateVars({});
  };

  const handleSendTemplate = async () => {
    if (!activeTemplate || !order) return;
    const missing = templateVarIndexes.filter((n) => !(templateVars[n] || '').trim());
    if (missing.length > 0) {
      toast.error(isArabic ? `املأ المتغيرات: {{${missing.join('}}, {{')}}}` : `Fill variables: {{${missing.join('}}, {{')}}}`);
      return;
    }

    setIsSending(true);
    try {
      const response = await apiClient.post('/whatsapp/messages/send-template', {
        sessionId: activeSession?.id,
        to: standardPhone,
        templateId: activeTemplate.name,
        parameters: {
          name: activeTemplate.name,
          language: activeTemplate.language || 'ar',
          components: [
            {
              type: 'BODY',
              parameters: templateVarIndexes.map((n) => ({ type: 'text', text: templateVars[n].trim() })),
            },
          ],
        },
        templateBody: filledTemplateBody,
      });

      if (response.data?.success) {
        toast.success(isArabic ? 'تم إرسال القالب المعتمد عبر Meta' : 'Template sent via Meta');
        const optimisticMsg: ChatMessage = {
          id: `opt_${Date.now()}`,
          fromMe: true,
          content: `${activeTemplate.name}\n${filledTemplateBody}`,
          createdAt: new Date().toISOString(),
          status: 'SENT',
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        handleCancelTemplate();
      } else {
        toast.error(response.data?.error || (isArabic ? 'تعذر إرسال القالب' : 'Failed to send template'));
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      toast.error(
        apiErr.response?.data?.error ||
          (isArabic ? 'فشل إرسال القالب عبر Meta. تأكد من وجود صلاحية قوالب واتساب.' : 'Template send failed.'),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeSession?.id || !order) return;

    setIsSending(true);
    const textToSend = messageText.trim();

    try {
      const response = await apiClient.post('/whatsapp/messages/send', {
        sessionId: activeSession.id,
        to: standardPhone,
        text: textToSend,
      });

      if (response.data?.success) {
        toast.success(isArabic ? 'تم إرسال الرسالة عبر واتساب المنصة' : 'Message sent via Platform WhatsApp');

        const optimisticMsg: ChatMessage = {
          id: `opt_${Date.now()}`,
          fromMe: true,
          content: textToSend,
          createdAt: new Date().toISOString(),
          status: 'SENT',
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        setMessageText('');
      } else {
        toast.error(response.data?.error || (isArabic ? 'تعذر إرسال الرسالة' : 'Failed to send'));
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { code?: string; error?: string } } };
      const errData = apiErr.response?.data;
      if (errData?.code === 'WA_24H_WINDOW_CLOSED') {
        toast.error(
          isArabic
            ? 'نافذة الـ 24 ساعة مغلقة مع هذا العميل. يرجى اختيار قالب معتمد من تبويب القوالب.'
            : '24h window closed. Please select an approved Meta template.',
          { duration: 5000 },
        );
        setActiveTab('templates');
      } else {
        toast.error(
          errData?.error ||
            (isArabic ? 'فشل إرسال الرسالة عبر المنصة. يمكنك استخدام واتساب ويب كبديل.' : 'Send failed.'),
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const sessionDisplay =
    activeSession?.metaDisplayPhoneNumber ||
    activeSession?.phoneNumber ||
    activeSession?.name ||
    'واتساب المنصة';

  return {
    panelRef,
    isArabic,
    activeSession,
    sessionDisplay,
    messages,
    loadingMessages,
    messagesEndRef,
    templates,
    activeTab,
    setActiveTab,
    messageText,
    setMessageText,
    isSending,
    activeTemplate,
    templateVars,
    setTemplateVars,
    templateVarIndexes,
    filledTemplateBody,
    customerPhone,
    cleanPhone,
    standardPhone,
    externalWaUrl,
    handleSelectTemplate,
    handleCancelTemplate,
    handleSendTemplate,
    handleSendMessage,
  };
};
