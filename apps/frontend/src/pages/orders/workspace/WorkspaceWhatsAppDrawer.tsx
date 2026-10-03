import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { WhatsAppIcon } from '../../../components/icons/brands';
import { apiClient } from '../../../services/apiClient';
import { WorkspaceOrder } from './types';
import { toast } from 'sonner';
import {
  WorkspaceWhatsAppTemplates,
  MetaTemplate,
} from './WorkspaceWhatsAppTemplates';
import {
  WorkspaceWhatsAppMessages,
  ChatMessage,
} from './WorkspaceWhatsAppMessages';
import { useModalA11y } from '../../../hooks/useModalA11y';

interface WorkspaceWhatsAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkspaceOrder | null;
}

interface WhatsAppSession {
  id: string;
  name?: string;
  phoneNumber?: string | null;
  metaDisplayPhoneNumber?: string | null;
  provider: string;
  status: string;
  isDefault?: boolean;
}

export const WorkspaceWhatsAppDrawer: React.FC<WorkspaceWhatsAppDrawerProps> = ({
  isOpen,
  onClose,
  order,
}) => {
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
  // قالب ميتا نشط: يبدّل الـ composer لوضع المتغيرات والإرسال الرسمي عبر send-template
  const [activeTemplate, setActiveTemplate] = useState<MetaTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<number, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const customerPhone = order?.customerPhone || '';
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const standardPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
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

  // 2. Fetch Conversation Messages for Customer Phone (وبoll خفيف طول الفتح:
  //    ردود العميل كانت لا تظهر أبدًا حتى إغلاق الدرج وفتحه من جديد)
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
        // Fallback gracefully to quick operational templates
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
      // قالب ميتا معتمد: وضع الإرسال الرسمي — النسخ الخام لمربع المحادثة كان
      // يفشل دائمًا خارج نافذة الـ 24 ساعة (409) لأن القالب لا يمر عبر Meta
      setActiveTemplate(metaTemplate);
      setTemplateVars({});
      setActiveTab('chat');
      return;
    }
    setMessageText(text);
    setActiveTab('chat');
  };

  /** متغيرات {{1}}..{{N}} بترتيبها من نص القالب */
  const templateVarIndexes = React.useMemo(() => {
    if (!activeTemplate) return [];
    const body = activeTemplate.components?.find((c) => c.type === 'BODY')?.text || '';
    const found = new Set<number>();
    for (const m of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
      found.add(Number(m[1]));
    }
    return Array.from(found).sort((a, b) => a - b);
  }, [activeTemplate]);

  const filledTemplateBody = React.useMemo(() => {
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
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
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
    } catch (err: any) {
      const errData = err.response?.data;
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

  if (!isOpen || !order) return null;

  const sessionDisplay =
    activeSession?.metaDisplayPhoneNumber ||
    activeSession?.phoneNumber ||
    activeSession?.name ||
    'واتساب المنصة';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? 'محادثة واتساب مع العميل' : 'Customer WhatsApp conversation'}
        className="flex h-full w-full max-w-xl flex-col bg-card shadow-xl border-s border-border/50 text-foreground"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <WhatsAppIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-black text-foreground">
                  {order.customerName || (isArabic ? 'عميل' : 'Customer')}
                </h3>
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  № {order.orderNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono" dir="ltr">
                <span>{customerPhone}</span>
                {activeSession && (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{sessionDisplay}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={externalWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              title={isArabic ? 'فتح في واتساب ويب الخارجي' : 'Open in WhatsApp Web'}
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isArabic ? 'واتساب ويب' : 'Web WA'}</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label={isArabic ? 'إغلاق محادثة واتساب' : 'Close WhatsApp conversation'}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Mode Selector Bar */}
        <div className="flex border-b border-border/30 bg-muted/10 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
            <span>{isArabic ? 'المحادثة الحية' : 'Live Chat'}</span>
            {messages.length > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600">
                {messages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'templates'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <SparklesIcon className="h-4 w-4" />
            <span>{isArabic ? 'قوالب التأكيد والرسائل' : 'Templates'}</span>
            {templates.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {templates.length}
              </span>
            )}
          </button>
        </div>

        {/* 3. Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/5">
          {activeTab === 'chat' ? (
            <WorkspaceWhatsAppMessages
              messages={messages}
              loadingMessages={loadingMessages}
              onSwitchToTemplates={() => setActiveTab('templates')}
              messagesEndRef={messagesEndRef}
            />
          ) : (
            <WorkspaceWhatsAppTemplates
              order={order}
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
            />
          )}
        </div>

        {/* 4. Composer Footer — وضعان: قالب ميتا معتمد (متغيرات + إرسال رسمي) أو محادثة حرة */}
        <div className="border-t border-border/40 bg-card p-3">
          {activeTemplate ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate font-mono text-[11px] font-bold text-foreground">
                    {activeTemplate.name}
                  </span>
                  <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    {isArabic ? 'قالب معتمد' : 'APPROVED'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelTemplate}
                  aria-label={isArabic ? 'إلغاء القالب' : 'Cancel template'}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              {templateVarIndexes.length > 0 ? (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {templateVarIndexes.map((n) => (
                    <label key={n} className="flex items-center gap-1.5 text-[11px]">
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-muted-foreground tabular-nums">
                        {`{{${n}}}`}
                      </span>
                      <input
                        type="text"
                        value={templateVars[n] || ''}
                        onChange={(e) => setTemplateVars((p) => ({ ...p, [n]: e.target.value }))}
                        placeholder={isArabic ? 'قيمة المتغير…' : 'Value…'}
                        className="h-7 min-w-0 flex-1 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <p className="max-h-16 overflow-y-auto rounded bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap text-pretty">
                {filledTemplateBody}
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSendTemplate}
                  disabled={isSending || templateVarIndexes.some((n) => !(templateVars[n] || '').trim())}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition-transform active:scale-[0.98] hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4 rtl:rotate-180" />
                  )}
                  <span>{isArabic ? 'إرسال القالب عبر Meta' : 'Send via Meta'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <span className="text-muted-foreground font-semibold shrink-0">
                  {isArabic ? 'إدراج سريع:' : 'Insert:'}
                </span>
                <button
                  type="button"
                  onClick={() => setMessageText((p) => `${p} ${order.customerName || ''}`)}
                  className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground hover:bg-muted shrink-0"
                >
                  + {isArabic ? 'اسم العميل' : 'Name'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageText((p) => `${p} #${order.orderNumber}`)}
                  className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground hover:bg-muted shrink-0"
                >
                  + {isArabic ? 'رقم الطلب' : '#Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setMessageText((p) => `${p} ${order.total} ج.م`)}
                  className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground hover:bg-muted shrink-0"
                >
                  + {isArabic ? 'الإجمالي' : 'Total'}
                </button>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'اكتب رسالة للعميل أو اختر قالباً…'
                      : 'Type a message or pick a template…'
                  }
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-border/60 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSending || !messageText.trim()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition-transform active:scale-[0.98] hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4 rtl:rotate-180" />
                  )}
                  <span>{isArabic ? 'إرسال' : 'Send'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
