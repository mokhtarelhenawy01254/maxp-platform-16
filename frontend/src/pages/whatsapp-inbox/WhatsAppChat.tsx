import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { ShoppingBag } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socketService';
import LinkifiedText from '../../components/common/LinkifiedText';
import { formatQueueLabel } from './queuePresentation';
import QuickOrderModal from '../../components/facebook-inbox/Modals/QuickOrderModal';
import TasksModal from '../../components/facebook-inbox/Modals/TasksModal';

type ConversationDetail = {
  id: string;
  status: string;
  queueKey?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    avatar: string | null;
    status: string | null;
  };
  messages: Array<{
    id: string;
    content: string;
    type: string;
    isFromCustomer: boolean;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; avatar: string | null } | null;
  }>;
  notes: Array<{
    id: string;
    content: string;
    type: string;
    createdAt: string;
    author: { id: string; firstName: string; lastName: string; avatar: string | null };
  }>;
  conversationTags: Array<{
    id: string;
    tag: string;
    color: string;
  }>;
  assignedUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    department: string | null;
  } | null;
  availableModerators: Array<{
    id: string;
    name: string;
    online: boolean;
    department: string | null;
    workload: {
      active: number;
      pending: number;
      waitingCustomer: number;
      unread: number;
      totalWeighted: number;
    };
  }>;
  flags: {
    detectedLanguage: string | null;
    detectedCountry: string | null;
    detectedDepartment: string | null;
    ownerLock: {
      lockExpiresAt?: string;
    };
    sla: {
      firstResponseDeadlineAt?: string;
      maxWaitingDeadlineAt?: string;
      firstResponseAt?: string | null;
    };
  };
  canTransfer: boolean;
};

type ConversationApiResponse = {
  success: boolean;
  conversation: ConversationDetail;
};

const statusOptions = ['NEW', 'QUEUED', 'ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'ESCALATED', 'CLOSED'];

const WhatsAppChat: React.FC = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentRole = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return String(user.role || '').toUpperCase();
    } catch {
      return '';
    }
  }, []);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    try {
      const response = await apiClient.get<ConversationApiResponse>(`/api/v1/whatsapp-inbox/conversations/${conversationId}`);
      if (response.data?.success) {
        setConversation(response.data.conversation);
      }
    } catch (error: any) {
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        navigate('/whatsapp-inbox');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, navigate]);

  const fetchCustomerOrders = useCallback(async (customerId: string) => {
    if (!customerId) return;
    setLoadingOrders(true);
    try {
      const response = await apiClient.get(`/customers/${customerId}/orders`);
      if (response.data?.success) {
        setCustomerOrders(response.data.data || []);
      }
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (conversation?.customer?.id) {
      fetchCustomerOrders(conversation.customer.id);
    }
  }, [conversation?.customer?.id, fetchCustomerOrders]);

  useEffect(() => {
    if (!conversationId) return;

    socketService.joinConversation(conversationId);
    const refresh = () => loadConversation();
    socketService.on('conversation:updated', refresh);
    socketService.on('conversation:assignment', refresh);
    socketService.on('whatsapp:message:new', refresh);
    socketService.on('whatsapp:message:sent', refresh);

    return () => {
      socketService.leaveConversation(conversationId);
      socketService.off('conversation:updated', refresh);
      socketService.off('conversation:assignment', refresh);
      socketService.off('whatsapp:message:new', refresh);
      socketService.off('whatsapp:message:sent', refresh);
    };
  }, [conversationId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !conversationId) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/whatsapp-inbox/conversations/${conversationId}/messages`, {
        content: draft,
        type: 'TEXT',
      });
      setDraft('');
      await loadConversation();
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (requestAssistance = false) => {
    if (!noteDraft.trim() || !conversationId) return;
    setSaving(true);
    try {
      await apiClient.post('/api/v1/internal-notes', {
        conversationId,
        content: noteDraft,
        mentionUserIds: selectedMentionIds,
        requestAssistance,
      });
      setNoteDraft('');
      setSelectedMentionIds([]);
      await loadConversation();
    } finally {
      setSaving(false);
    }
  };

  const addTag = async () => {
    if (!tagInput.trim() || !conversationId) return;
    await apiClient.post('/api/v1/internal-notes/tags', {
      conversationId,
      tag: tagInput.trim(),
    });
    setTagInput('');
    await loadConversation();
  };

  const removeTag = async (tagId: string) => {
    await apiClient.delete(`/api/v1/internal-notes/tags/${tagId}`);
    await loadConversation();
  };

  const updateStatus = async (status: string) => {
    if (!conversationId) return;
    await apiClient.patch(`/api/v1/whatsapp-inbox/conversations/${conversationId}/status`, {
      status,
    });
    await loadConversation();
  };

  const transferConversation = async () => {
    if (!conversationId || !transferTarget) return;
    await apiClient.post(`/api/v1/whatsapp-inbox/conversations/${conversationId}/transfer`, {
      toUserId: transferTarget,
      note: noteDraft || undefined,
    });
    setTransferTarget('');
    setNoteDraft('');
    await loadConversation();
  };

  const toggleMention = (userId: string) => {
    setSelectedMentionIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(new Date(value));

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  const getOrderStatusTheme = (status?: string) => {
    const upper = (status || '').toUpperCase();
    if (['COMPLETED', 'DELIVERED', 'PAID'].includes(upper)) {
      return { background: 'color-mix(in srgb, var(--business-success) 12%, white)', color: 'var(--business-success)' };
    }
    if (['CANCELLED', 'REFUNDED', 'RETURNED'].includes(upper)) {
      return { background: 'color-mix(in srgb, var(--business-danger) 12%, white)', color: 'var(--business-danger)' };
    }
    if (upper === 'PENDING') {
      return { background: 'color-mix(in srgb, var(--business-warning) 12%, white)', color: 'var(--business-warning)' };
    }
    if (upper === 'CONFIRMED') {
      return { background: 'color-mix(in srgb, var(--color-primary) 12%, white)', color: 'var(--color-primary)' };
    }
    if (['PROCESSING', 'SHIPPED'].includes(upper)) {
      return { background: 'color-mix(in srgb, var(--business-chart-tertiary) 12%, white)', color: 'var(--business-chart-tertiary)' };
    }
    return { background: 'color-mix(in srgb, var(--color-border) 42%, white)', color: 'var(--color-muted-foreground)' };
  };

  const canTransfer = conversation?.canTransfer && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(currentRole || '');

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Conversation not available
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-64px)] min-h-0 gap-0 xl:grid-cols-[1fr,380px]">
      <main className="flex min-h-0 flex-col bg-slate-100 dark:bg-slate-950">
        <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => navigate('/whatsapp-inbox')}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                Back
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Exclusive Owner Chat</div>
                <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{conversation.customer.name}</h1>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{conversation.customer.phone}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                {formatQueueLabel(conversation.queueKey, conversation.status)}
              </span>
              <button
                type="button"
                onClick={() => setShowOrderModal(true)}
                className="business-icon-button rounded-xl transition-colors"
                data-tone="warning"
                title="إنشاء طلب سريع"
              >
                <ShoppingCartIcon className="h-5 w-5" />
              </button>
              <select
                value={conversation.status}
                onChange={(event) => updateStatus(event.target.value)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {conversation.customer.status === 'VIP' ? (
                <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-200">
                  VIP
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Owner: {conversation.assignedUser ? `${conversation.assignedUser.firstName} ${conversation.assignedUser.lastName}`.trim() : 'Unassigned'}</span>
            {conversation.flags.detectedLanguage ? <span>Language: {conversation.flags.detectedLanguage.toUpperCase()}</span> : null}
            {conversation.flags.detectedCountry ? <span>Country: {conversation.flags.detectedCountry}</span> : null}
            {conversation.flags.detectedDepartment ? <span>Dept: {conversation.flags.detectedDepartment}</span> : null}
            {conversation.flags.ownerLock?.lockExpiresAt ? <span>Lock until: {formatTime(conversation.flags.ownerLock.lockExpiresAt)}</span> : null}
            {conversation.flags.sla?.maxWaitingDeadlineAt ? <span>SLA deadline: {formatTime(conversation.flags.sla.maxWaitingDeadlineAt)}</span> : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="space-y-3">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[72%] rounded-[28px] px-4 py-3 shadow-sm ${
                    message.isFromCustomer
                      ? 'rounded-bl-md bg-white text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'rounded-br-md bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950'
                  }`}
                >
                  <LinkifiedText
                    text={message.content}
                    className="block whitespace-pre-wrap break-words text-sm leading-6"
                  />
                  <div className={`mt-2 text-[11px] ${message.isFromCustomer ? 'text-slate-400' : 'text-white/70 dark:text-slate-950/70'}`}>
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Reply as the conversation owner..."
              className="min-h-[96px] w-full resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none dark:text-white"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={sendMessage}
                disabled={saving || !draft.trim()}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tags</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {conversation.conversationTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: tag.color || '#0f172a' }}
                >
                  {tag.tag}
                  <button type="button" onClick={() => removeTag(tag.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="Add tag"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-cyan-500 dark:text-slate-950"
              >
                Add
              </button>
            </div>
          </section>

          {canTransfer ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Transfer / Reassign</div>
              <div className="mt-3 space-y-3">
                <select
                  value={transferTarget}
                  onChange={(event) => setTransferTarget(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select moderator</option>
                  {conversation.availableModerators.map((moderator) => (
                    <option key={moderator.id} value={moderator.id}>
                      {moderator.name} {moderator.online ? '• online' : '• offline'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={transferConversation}
                  disabled={!transferTarget}
                  className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Transfer Chat
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Internal Collaboration</div>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Internal note, handoff summary, or request assistance..."
              className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {conversation.availableModerators.map((moderator) => (
                <button
                  key={moderator.id}
                  type="button"
                  onClick={() => toggleMention(moderator.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selectedMentionIds.includes(moderator.id)
                      ? 'bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  @{moderator.name}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => addNote(false)}
                disabled={!noteDraft.trim()}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                Save Internal Note
              </button>
              <button
                type="button"
                onClick={() => addNote(true)}
                disabled={!noteDraft.trim()}
                className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Request Assistance
              </button>
            </div>
          </section>

          <section className="business-page-panel p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                <ShoppingBag size={16} style={{ color: 'var(--color-muted-foreground)' }} />
                سجل الطلبات
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowTasksModal(true)}
                  className="business-icon-button business-icon-button--sm"
                  data-tone="primary"
                  title="المهام"
                >
                  <span className="text-[10px] font-bold px-1">Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(true)}
                  className="business-icon-button business-icon-button--sm"
                  data-tone="warning"
                  title="إنشاء طلب سريع"
                >
                  <ShoppingCartIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {loadingOrders ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              </div>
            ) : customerOrders.length === 0 ? (
              <div
                className="text-center py-8"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <ShoppingBag size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد طلبات سابقة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerOrders.map((order: any) => {
                  const theme = getOrderStatusTheme(order.status);
                  const itemsCount = order.items?.length || 0;
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border p-3"
                      style={{
                        background: 'linear-gradient(180deg, color-mix(in srgb, white 88%, var(--color-background) 12%) 0%, color-mix(in srgb, white 76%, var(--color-background) 24%) 100%)',
                        borderColor: 'var(--business-card-border)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                            #{order.orderNumber}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ ...theme }}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--color-muted-foreground)' }}>
                          {itemsCount} {itemsCount === 1 ? 'قطعة' : 'قطع'}
                        </span>
                        <span className="font-bold" style={{ color: 'var(--color-foreground)' }}>
                          {Number(order.total).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Internal Notes Timeline</div>
            <div className="mt-4 space-y-3">
              {conversation.notes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">{note.content}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{`${note.author.firstName} ${note.author.lastName}`.trim()}</span>
                    <span>{formatTime(note.createdAt)}</span>
                  </div>
                </div>
              ))}
              {conversation.notes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No internal notes yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </aside>

      <QuickOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        conversationId={conversation.id}
        customerId={conversation.customer.id}
        customerName={conversation.customer.name}
        platform="whatsapp"
        pageName="WhatsApp"
        onOrderCreated={(orderId) => {
          console.log('✅ WhatsApp order created:', orderId);
        }}
      />

      <TasksModal
        isOpen={showTasksModal}
        onClose={() => setShowTasksModal(false)}
      />
    </div>
  );
};

export default WhatsAppChat;
