import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { WhatsAppIcon } from '../../../components/icons/brands';
import { apiClient } from '../../../services/apiClient';
import { WorkspaceOrder } from './types';
import { parseCleanAddress } from './WorkspaceInspector';
import { toast } from 'sonner';

interface WorkspaceWhatsAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkspaceOrder | null;
}

interface ChatMessage {
  id: string;
  fromMe: boolean;
  content: string;
  timestamp?: number | string;
  createdAt?: string;
  status?: string;
  messageType?: string;
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

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category?: string;
  components?: Array<{
    type: string;
    text?: string;
  }>;
}

export const WorkspaceWhatsAppDrawer: React.FC<WorkspaceWhatsAppDrawerProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const [activeSession, setActiveSession] = useState<WhatsAppSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationJid, setConversationJid] = useState<string | null>(null);

  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [activeTab, setActiveTab] = useState<'chat' | 'templates'>('chat');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

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
      setLoadingSession(true);
      try {
        const res = await apiClient.get('/whatsapp/sessions');
        const list: WhatsAppSession[] = res.data?.sessions || [];
        const connected = list.find((s) => s.status === 'CONNECTED') || list[0] || null;
        if (isMounted) setActiveSession(connected);
      } catch (err) {
        console.error('Failed to load WhatsApp sessions:', err);
      } finally {
        if (isMounted) setLoadingSession(false);
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
    const loadConversation = async () => {
      setLoadingMessages(true);
      try {
        // Search conversation by customer phone number
        const convRes = await apiClient.get('/whatsapp/conversations', {
          params: { search: cleanPhone, limit: 1 },
        });
        const conv = convRes.data?.conversations?.[0];

        if (conv?.jid) {
          if (isMounted) setConversationJid(conv.jid);
          const msgRes = await apiClient.get(
            `/whatsapp/conversations/${encodeURIComponent(conv.jid)}/messages`,
            {
              params: { sessionId: conv.sessionId || activeSession.id, limit: 50 },
            },
          );
          if (isMounted) {
            setMessages(msgRes.data?.messages || []);
          }
        } else {
          // No prior conversation exists yet
          if (isMounted) {
            setConversationJid(`${standardPhone}@s.whatsapp.net`);
            setMessages([]);
          }
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    void loadConversation();
    return () => {
      isMounted = false;
    };
  }, [isOpen, cleanPhone, activeSession?.id, standardPhone]);

  // 3. Fetch Approved Templates for Session
  useEffect(() => {
    if (!isOpen || !activeSession?.id) return;

    let isMounted = true;
    const loadTemplates = async () => {
      setLoadingTemplates(true);
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
        // Fallback gracefully to built-in templates
      } finally {
        if (isMounted) setLoadingTemplates(false);
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

  // Built-in Quick Operational Templates
  const getQuickTemplates = () => {
    if (!order) return [];
    const itemsList =
      order.items
        ?.map((i) => `${i.productName || i.name} × ${i.quantity}`)
        .join('، ') || '';
    const cleanAddr =
      parseCleanAddress(order.shippingAddress) ||
      [order.governorate, order.city].filter(Boolean).join('، ');

    return [
      {
        id: 'confirm_order',
        title: isArabic ? 'تأكيد الطلب والشحن' : 'Confirm Order & Ship',
        category: isArabic ? 'تأكيد' : 'Confirmation',
        text: isArabic
          ? `أهلاً بحضرتك أ/ ${order.customerName}، يسعدنا تأكيد طلبك رقم #${order.orderNumber} بإجمالي ${order.total} ج.م.\nتفاصيل الطلب: ${itemsList}\nعنوان التوصيل: ${cleanAddr}\nهل نعتمد الشحن اليوم؟`
          : `Hello ${order.customerName}, We are confirming your order #${order.orderNumber} (Total: ${order.total} EGP).\nItems: ${itemsList}\nAddress: ${cleanAddr}\nShould we ship today?`,
      },
      {
        id: 'address_verification',
        title: isArabic ? 'تأكيد العنوان والتوصيل' : 'Address Verification',
        category: isArabic ? 'بيانات' : 'Data',
        text: isArabic
          ? `أهلاً بحضرتك أ/ ${order.customerName}، بخصوص طلبك رقم #${order.orderNumber}:\nنرجو تأكيد العنوان بالتفصيل (المحافظة، المدينة، الشارع، رقم العقار والشقة) لضمان سرعة التسليم لمندوب الشحن.`
          : `Hello ${order.customerName}, for order #${order.orderNumber}, please verify your detailed delivery address to avoid shipping delays.`,
      },
      {
        id: 'no_answer',
        title: isArabic ? 'محاولة اتصال لم يتم الرد' : 'Missed Call Follow-up',
        category: isArabic ? 'متابعة' : 'Follow-up',
        text: isArabic
          ? `أهلاً بحضرتك أ/ ${order.customerName}، حاولنا الاتصال بك هاتفياً لتأكيد شحنتك رقم #${order.orderNumber} ولم نتمكن من الوصول إليك. يسعدنا تأكيد رغبتك بالاستلام أو تحديد موعد مناسب للتواصل.`
          : `Hello ${order.customerName}, we called regarding your order #${order.orderNumber} but missed you. Please let us know a suitable time to reach you.`,
      },
      ...(order.isIncomplete
        ? [
            {
              id: 'cart_recovery',
              title: isArabic ? 'تذكير بالسلة المتروكة' : 'Cart Recovery',
              category: isArabic ? 'سلة' : 'Cart',
              text: isArabic
                ? `أهلاً بك أ/ ${order.customerName}، لاحظنا اهتمامك بطلب ${itemsList} ولم يكتمل الطلب. هل واجهت أي صعوبة؟ يسعدنا مساعدتك وتأكيد الطلب لك فوراً!`
                : `Hello ${order.customerName}, we noticed you left your cart. Can we help you complete your purchase?`,
            },
          ]
        : []),
    ];
  };

  const handleSelectTemplate = (text: string) => {
    setMessageText(text);
    setActiveTab('chat');
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

        // Optimistically add sent message
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
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-card shadow-2xl border-s border-border/50 text-foreground"
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
            {/* Native WhatsApp Web Escape Hatch */}
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
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Mode Selector Bar (Chat vs Templates) */}
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
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[10px] text-emerald-600">
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
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] text-primary">
                {templates.length}
              </span>
            )}
          </button>
        </div>

        {/* 3. Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/5">
          {activeTab === 'chat' ? (
            /* Tab: Conversation Stream */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <ArrowPathIcon className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                    <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {isArabic ? 'لا توجد محادثة سابقة مع هذا العميل' : 'No prior messages found'}
                  </p>
                  <p className="mt-1 text-[11px] max-w-xs text-muted-foreground">
                    {isArabic
                      ? 'يمكنك إرسال قالب تأكيد فوري أو كتابة رسالة مباشرة للعميل أدناه.'
                      : 'You can send a confirmation template or type a message below.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20"
                  >
                    <SparklesIcon className="h-3.5 w-3.5" />
                    <span>{isArabic ? 'تصفح القوالب الجاهزة' : 'Browse Templates'}</span>
                  </button>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.fromMe;
                  const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                          isMine
                            ? 'rounded-ee-xs bg-emerald-600 text-white dark:bg-emerald-700'
                            : 'rounded-es-xs bg-card border border-border/50 text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isMine ? 'text-emerald-100/80' : 'text-muted-foreground'
                          }`}
                        >
                          <span dir="ltr">{dateStr}</span>
                          {isMine && <CheckCircleIcon className="h-3 w-3 inline text-emerald-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Tab: Template Selector */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick Instant Templates */}
              <div>
                <h4 className="text-xs font-black uppercase text-muted-foreground mb-2">
                  {isArabic ? 'قوالب سريعة مجهزة لبيانات الطلب' : 'Quick Ready Templates'}
                </h4>
                <div className="space-y-2">
                  {getQuickTemplates().map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="group flex flex-col justify-between gap-2 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{tmpl.title}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
                        {tmpl.text}
                      </p>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate(tmpl.text)}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 active:scale-98 transition-transform"
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                          <span>{isArabic ? 'استخدام في المحادثة' : 'Use in Chat'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approved Meta Cloud Templates */}
              {templates.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-muted-foreground mb-2">
                    {isArabic ? 'قوالب Meta Cloud المعتمدة للمتجر' : 'Approved Meta Cloud Templates'}
                  </h4>
                  <div className="space-y-2">
                    {templates.map((metaTmpl) => {
                      const bodyComp = metaTmpl.components?.find((c) => c.type === 'BODY');
                      const bodyText = bodyComp?.text || metaTmpl.name;
                      return (
                        <div
                          key={metaTmpl.id}
                          className="flex flex-col justify-between gap-2 rounded-lg border border-border/50 bg-card p-3 hover:border-primary/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {metaTmpl.name}
                            </span>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                              APPROVED
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{bodyText}</p>
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleSelectTemplate(bodyText)}
                              className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                              <span>{isArabic ? 'تعبئة القالب' : 'Fill Template'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Composer Footer */}
        <div className="border-t border-border/40 bg-card p-3">
          {/* Quick variable helper tags */}
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
        </div>
      </div>
    </div>
  );
};
