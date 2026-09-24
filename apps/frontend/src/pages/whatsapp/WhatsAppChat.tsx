/**
 * 📱 WhatsApp Chat Page
 * صفحة دردشة WhatsApp
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, type TouchEvent as ReactTouchEvent } from 'react';
import {
  Ban,
  BarChart3,
  Check,
  Copy,
  Forward,
  List as ListIcon,
  FileText,
  Loader2,
  MapPin,
  MousePointerSquare,
  Phone,
  Pin,
  PinOff,
  PlusCircle,
  Reply,
  ShieldAlert,
  SmilePlus,
  Star,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import i18n from '../../i18n';
import { tToast } from '../../utils/i18n-toast';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { format } from 'date-fns';
import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../services/apiClient';
import { indexedDBStorage } from '../../services/indexedDBStorage';
import useSocket from '../../hooks/useSocket';
import useDebounce from '../../hooks/useDebounce';
import CreateGroupDialog from '../../components/whatsapp/CreateGroupDialog';
import GroupInfoDrawer from '../../components/whatsapp/GroupInfoDrawer';
import ProfileDialog from '../../components/whatsapp/ProfileDialog';
import {
  requestBrowserNotificationPermission,
  showBrowserNotification as showNativeBrowserNotification,
} from '../../utils/browserNotifications';
import CheckNumberDialog from '../../components/whatsapp/CheckNumberDialog';
import LabelsDialog from '../../components/whatsapp/LabelsDialog';
import BroadcastDialog from '../../components/whatsapp/BroadcastDialog';
import PrivacySettingsDialog from '../../components/whatsapp/PrivacySettingsDialog';
import BusinessProfileDialog from '../../components/whatsapp/BusinessProfileDialog';

import QuickOrderModal from '../../components/facebook-inbox/Modals/QuickOrderModal';
import QuickCreateTaskModal from '../../components/facebook-inbox/Modals/QuickCreateTaskModal';
import ProductImagePickerModal from '../../components/facebook-inbox/ProductImagePicker/ProductImagePickerModal';
import CreateServiceOrderModal from '../../components/facebook-inbox/Modals/CreateServiceOrderModal';
import { useAuth } from '../../hooks/useAuthSimple';

import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatRightPanel from './components/ChatRightPanel';
import InteractiveButtonsModal, { type InteractiveButtonInput } from './components/InteractiveButtonsModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import {
  useWhatsAppSessions,
  useWhatsAppConversations,
  useWhatsAppMessages,
  useWhatsAppQuickReplies,
  type Session,
  type Contact,
  type Message,
  type QuickReply,
  type WhatsAppSidebarFilter,
  type WhatsAppConversationCounts,
} from '../../hooks/useWhatsAppQueries';
import {
  formatContactPhoneNumber,
  getBestContactDisplayName,
  getContactDisplayPhone,
  getContactInitials,
  getContactPhoneHref,
  getContactPhoneNumber,
} from './whatsappContactDisplay';

import { useStatuses, usePostStatus } from '../../hooks/useWhatsAppStatuses'; // 📸 Status Hooks
import {
  useSendMessage,
  useSendMedia,
  useSendTemplate,
  useMarkAsRead,
  useDeleteConversation,
  useDeleteConversationsBulk,
  useDeleteAllConversations,
  useArchiveConversation
} from '../../hooks/useWhatsAppMutations';
import {
  useVirtualMessages,
  useInfiniteScroll
} from '../../hooks/useVirtualScroll';
import { cn } from '@/lib/utils';
import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
} from '@/components/ui/avatar';
import { getInboxExternalImageUrl } from '@/utils/imageUrl';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet as UiSheet,
  SheetContent as UiSheetContent,
  SheetDescription as UiSheetDescription,
  SheetHeader as UiSheetHeader,
  SheetTitle as UiSheetTitle,
} from '@/components/ui/sheet';
import { Input as UiInput } from '@/components/ui/input';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/components/ui/select';

// Types are now imported from useWhatsAppQueries

interface CatalogProduct {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
}

interface ListRow {
  id: string;
  title: string;
  description: string;
}

interface ListSection {
  title: string;
  rows: ListRow[];
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ConversationsPage {
  conversations: Contact[];
  pagination: PaginationState;
}

interface MessagesPage {
  messages: Message[];
  pagination: PaginationState;
}

interface IncomingMessageEvent {
  sessionId: string;
  message: Message;
  contact?: Contact;
  conversationId?: string | null;
}

interface NotificationEventPayload {
  contactName: string;
  message?: string | null;
  messageType?: string | null;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  sessionId?: string;
}

interface MessageStatusEventPayload {
  messageId: string;
  status: string;
  remoteJid?: string;
  sessionId: string;
}

interface TypingEventPayload {
  jid?: string;
}

interface AppErrorLike {
  message?: string;
  response?: {
    data?: {
      error?: string;
    };
  };
}

type ConversationsCache = InfiniteData<ConversationsPage>;
type MessagesCache = InfiniteData<MessagesPage>;

const getErrorMessage = (error: unknown, fallback: string) => {
  const appError = error as AppErrorLike;
  return appError.response?.data?.error || appError.message || fallback;
};

const WhatsAppChatContent: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  void messagesEndRef.current;
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const conversationsListRef = useRef<HTMLDivElement>(null); // Moved to ChatSidebar
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Session state
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  const handleSyncHistory = async () => {
    if (!selectedSession || selectedSession === 'all' || isSyncingHistory) return;

    try {
      setIsSyncingHistory(true);
      const response = await api.post(`/whatsapp/sessions/${selectedSession}/history-sync`);
      const message = response.data?.alreadyRunning
        ? 'المزامنة تعمل بالفعل لهذه الجلسة'
        : 'تم طلب المزامنة. سيظهر التقدم في إعدادات واتساب.';
      toast.success(message);
      await queryClient.invalidateQueries({ queryKey: ['whatsapp', 'sessions'] });
    } catch (error) {
      toast.error(getErrorMessage(error, i18n.t("whatsappChat.unable_request_sync_791e")));
    } finally {
      setIsSyncingHistory(false);
    }
  };

  // Contact state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // UI State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  // const [searchQuery, setSearchQuery] = useState(''); // Moved to ChatSidebar
  const [_showQuickReplies, setShowQuickReplies] = useState(false);
  void setShowQuickReplies;
  const [_contactMenuAnchor, setContactMenuAnchor] = useState<null | HTMLElement>(null);
  void setContactMenuAnchor;
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(() => localStorage.getItem('whatsappChatRightPanelVisible') === 'true');
  const [_aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  void setAiSuggestion;
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<Message | null>(null);
  const [_editingMessage, setEditingMessage] = useState<Message | null>(null);
  void setEditingMessage;
  const [_editMessageText, _setEditMessageText] = useState('');
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedContactsForForward, setSelectedContactsForForward] = useState<string[]>([]);
  const [_messageInfoDialogOpen, _setMessageInfoDialogOpen] = useState(false);
  const [_selectedMessageForInfo, _setSelectedMessageForInfo] = useState<Message | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [checkNumberDialogOpen, setCheckNumberDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [businessProfileDialogOpen, setBusinessProfileDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [interactiveDialogOpen, setInteractiveDialogOpen] = useState(false);
  const pendingScrollMessageIdRef = useRef<string | null>(null);
  const isSearchingForMessageRef = useRef(false);

  // — Swipe gesture handler for mobile back navigation —
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const handleChatTouchStart = useCallback((e: ReactTouchEvent) => {
    touchStartRef.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, time: Date.now() };
  }, []);
  const handleChatTouchEnd = useCallback((e: ReactTouchEvent) => {
    if (!touchStartRef.current || !selectedContact) return;
    const deltaX = e.changedTouches[0]!.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.changedTouches[0]!.clientY - touchStartRef.current.y);
    const elapsed = Date.now() - touchStartRef.current.time;
    // Only trigger on horizontal swipe (>80px), not vertical, within 400ms
    const isRtl = document.documentElement.dir === 'rtl';
    const isSwipeBack = isRtl ? deltaX < -80 : deltaX > 80;
    if (deltaY < 50 && elapsed < 400 && isSwipeBack) {
      if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(() => setSelectedContact(null));
      } else {
        setSelectedContact(null);
      }
    }
    touchStartRef.current = null;
  }, [selectedContact]);

  // — View-transition-wrapped contact selection —
  const selectContactWithTransition = useCallback((contact: Contact | null) => {
    if (typeof document.startViewTransition === 'function' && window.innerWidth < 1280) {
      document.startViewTransition(() => setSelectedContact(contact));
    } else {
      setSelectedContact(contact);
    }
  }, []);

  // — Mobile layout: hide app-shell header + remove padding when chat is open —
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => {
      if (mq.matches && selectedContact) {
        document.body.classList.add('wa-mobile-chat-active');
      } else {
        document.body.classList.remove('wa-mobile-chat-active');
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      document.body.classList.remove('wa-mobile-chat-active');
    };
  }, [selectedContact]);

  // — Hash-based navigation: browser back returns to chat list (works in PWA & browser) —
  useEffect(() => {
    if (!selectedContact) {
      if (window.location.hash === '#chat') {
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        } catch {
          // ignore
        }
      }
      return;
    }
    if (window.location.hash !== '#chat') {
      try {
        window.history.pushState(null, '', window.location.pathname + window.location.search + '#chat');
      } catch {
        window.location.hash = 'chat';
      }
    }
    const onHashChange = () => {
      if (window.location.hash !== '#chat' && selectedContact) {
        setSelectedContact(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectedContact]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    if (selectedContact) {
      document.body.classList.add('app-shell-chat-active');
    } else {
      document.body.classList.remove('app-shell-chat-active');
    }

    return () => {
      document.body.classList.remove('app-shell-chat-active');
    };
  }, [selectedContact]);

  // Persist right panel visibility
  useEffect(() => {
    localStorage.setItem('whatsappChatRightPanelVisible', String(showRightPanel));
  }, [showRightPanel]);

  // تحديث صور البروفايل المفقودة من واتساب (مرة كل 30 دقيقة)
  useEffect(() => {
    const LAST_KEY = 'whatsappProfilePicsRefreshLast';
    const INTERVAL_MS = 30 * 60 * 1000;
    try {
      const last = Number(localStorage.getItem(LAST_KEY) || 0);
      if (Date.now() - last < INTERVAL_MS) return;
      localStorage.setItem(LAST_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
    api.post('/whatsapp/profile-pics/refresh').catch(() => {
      // background refresh — fail silently
    });
  }, []);

  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedContactForLabel, setSelectedContactForLabel] = useState<Contact | null>(null);
  const [labels, setLabels] = useState<{id: string; name: string; color: string}[]>([]);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollData, setPollData] = useState({ question: '', options: ['', ''], selectableCount: 1 });

  // Interactive Messages
  const [buttonsDialogOpen, setButtonsDialogOpen] = useState(false);
  const [buttonsData, setButtonsData] = useState({ text: '', footer: '', buttons: [{ id: '1', text: '' }] });
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [listData, setListData] = useState<{
    text: string;
    buttonText: string;
    title: string;
    sections: ListSection[];
  }>({
    text: '',
    buttonText: 'اختر',
    title: '',
    sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }]
  });

  // Broadcast
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);

  // Catalog
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // Starred Messages
  const [starredMessagesOpen, setStarredMessagesOpen] = useState(false);
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);

  // Location
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationData, setLocationData] = useState({ latitude: '', longitude: '', address: '' });

  // Template Messages
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const sendTemplateMutation = useSendTemplate();

  // Quick Order Modal (same as Facebook inbox)
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const [showServiceOrderModal, setShowServiceOrderModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [quickOrderContact, setQuickOrderContact] = useState<Contact | null>(null);
  const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);
  const [showQuickCreateTaskModal, setShowQuickCreateTaskModal] = useState(false);
  const loadContactsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMarkAsReadRef = useRef<{ sessionId: string; remoteJid: string } | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<{
    notificationSound: boolean;
    browserNotifications: boolean;
  }>({
    notificationSound: true,
    browserNotifications: true
  });
  // Chat list filters — server-side على كل المحادثات
  const [chatFilter, setChatFilter] = useState<WhatsAppSidebarFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string; status: string; profilePicUrl: string } | null>(null);

  // 📸 Status State
  const [statusContent, setStatusContent] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Dialog States
  const [confirmData, setConfirmData] = useState<{ open: boolean; title: string; content: string; onConfirm: () => void }>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => { }
  });

  // TanStack Query Hooks
  const { data: sessions = [], isLoading: loadingSessions } = useWhatsAppSessions();
  const { data: statuses = [], isLoading: loadingStatuses } = useStatuses(
    selectedSession && selectedSession !== 'all' ? selectedSession : ''
  );
  const { mutate: postStatus, isPending: postingStatus } = usePostStatus();

  const {

    data: conversationsData,
    isLoading: loadingConversations,
    isFetchingNextPage: isLoadingMoreConversations,
    fetchNextPage: fetchNextConversationsPage,
    hasNextPage: hasMoreConversations,
    isError: conversationsError,
    refetch: refetchConversations,
  } = useWhatsAppConversations(selectedSession || 'all', 30, {
    filter: chatFilter,
    search: debouncedSearch,
    archived: showArchived,
  });

  const conversations = useMemo(() => {
    if (!conversationsData) return [];
    return conversationsData.pages.flatMap(page => page.conversations || []);
  }, [conversationsData]);

  const conversationCounts = useMemo<WhatsAppConversationCounts>(() => {
    const counts = conversationsData?.pages?.[0]?.counts;
    return counts || { all: 0, unread: 0, groups: 0, unreplied: 0, archived: 0 };
  }, [conversationsData]);

  const targetSessionId = useMemo(() => {
    if (!selectedContact || !selectedSession) return null;
    return selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
  }, [selectedContact, selectedSession]);

  const {
    data: messagesData,
    isLoading: loadingMessages,
    fetchNextPage: fetchNextMessagesPage,
    hasNextPage: hasMoreMessages,
    isError: messagesError,
    refetch: refetchMessages,
  } = useWhatsAppMessages(selectedContact?.jid || null, targetSessionId);

  const messages = useMemo(() => {
    if (!messagesData) return [];
    // Flatten and sort messages by timestamp (oldest first for proper display)
    const allMessages = messagesData.pages.flatMap(page => page.messages || []);
    return allMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [messagesData]);

  // Filter out reactions from the main message list, and attach reactions to their target messages
  const visibleMessages = useMemo(() => {
    const reactionsByTargetId = new Map<string, Record<string, string>>();
    for (const m of messages) {
      if (m.messageType === 'REACTION' && m.quotedMessageId && m.content) {
        const targetId = m.quotedMessageId;
        const reactorKey = m.fromMe ? 'me' : (m.participant || m.remoteJid || 'customer');
        const existing = reactionsByTargetId.get(targetId) || {};
        existing[reactorKey] = m.content;
        reactionsByTargetId.set(targetId, existing);
      }
    }

    return messages
      .filter(m => m.messageType !== 'REACTION')
      .map(m => {
        let metaReactions: Record<string, string> = {};
        if (m.metadata) {
          try {
            const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
            if (meta?.reactions && typeof meta.reactions === 'object' && !Array.isArray(meta.reactions)) {
              metaReactions = { ...meta.reactions };
            }
          } catch {}
        }
        if (m.reactions && typeof m.reactions === 'object' && !Array.isArray(m.reactions)) {
          metaReactions = { ...metaReactions, ...m.reactions };
        }

        const extra = reactionsByTargetId.get(m.messageId);
        const merged = extra ? { ...metaReactions, ...extra } : metaReactions;
        const hasReactions = Object.keys(merged).length > 0;

        if (hasReactions) {
          let updatedMeta = m.metadata;
          if (typeof updatedMeta === 'object' && updatedMeta !== null) {
            updatedMeta = { ...updatedMeta, reactions: merged };
          }
          return {
            ...m,
            metadata: updatedMeta,
            reactions: merged
          };
        }
        return m;
      });
  }, [messages]);

  // Query remote pinned message for active contact
  const { data: remotePinnedMessage } = useQuery<Message | null>({
    queryKey: ['whatsapp', 'pinned', selectedContact?.jid, targetSessionId],
    queryFn: async () => {
      if (!selectedContact?.jid) return null;
      try {
        const res = await api.get(`/whatsapp/conversations/${encodeURIComponent(selectedContact.jid)}/pinned`, {
          params: targetSessionId ? { sessionId: targetSessionId } : undefined
        });
        return (res as any).data?.pinnedMessage || null;
      } catch {
        return null;
      }
    },
    enabled: !!selectedContact?.jid,
    staleTime: 30000,
  });

  // Current active pinned message in the conversation
  const currentPinnedMessage = useMemo(() => {
    const pinnedInVisible = [...visibleMessages].reverse().find(m => {
      let meta: any = m.metadata;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { meta = {}; }
      }
      return m.isPinned === true || meta?.isPinned === true;
    });
    if (pinnedInVisible) return pinnedInVisible;
    return remotePinnedMessage || null;
  }, [visibleMessages, remotePinnedMessage]);

  // Helper to get a valid session ID for API calls (never 'all')
  const activeSessionId = useMemo(() => {
    if (selectedSession && selectedSession !== 'all') {
      return selectedSession;
    }

    const isConnected = (s: Session) => {
      const status = String(s.status || '').toLowerCase();
      const liveStatus = String(s.liveStatus || '').toLowerCase();
      return status === 'connected' || liveStatus === 'connected';
    };

    // Pick first connected session if available
    const connectedSession = sessions.find(s => s.id !== 'all' && isConnected(s));
    if (connectedSession) return connectedSession.id;

    // Otherwise pick first real session
    const firstReal = sessions.find(s => s.id !== 'all');
    return firstReal?.id || '';
  }, [selectedSession, sessions]);

  const { data: _quickReplies = [] } = useWhatsAppQuickReplies();

  // Mutations
  const sendMessageMutation = useSendMessage();
  const sendMediaMutation = useSendMedia();
  const markAsReadMutation = useMarkAsRead();
  const deleteConversationMutation = useDeleteConversation();
  const deleteConversationsBulkMutation = useDeleteConversationsBulk();
  const deleteAllConversationsMutation = useDeleteAllConversations();
  const archiveConversationMutation = useArchiveConversation();

  // Helper functions
  const getContactName = useCallback((contact: Contact) => {
    return getBestContactDisplayName(contact);
  }, []);

  const normalizeContactJid = useCallback((jid: string) => {
    if (!jid) return '';
    const parts = jid.split('@')[0];
    const bareJid = parts?.split(':')[0] || '';
    return bareJid.replace(/\D/g, '');
  }, []);

  // — Deep link: فتح محادثة محددة من رابط مشارك (session / jid / phone / conversationId) —
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkAppliedRef = useRef(false);

  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    if (loadingSessions) return;

    const sessionParam = searchParams.get('session');
    const rawJidParam = searchParams.get('jid');
    const phoneParam = searchParams.get('phone');
    const conversationIdParam = searchParams.get('conversationId') || searchParams.get('conversation');
    const nameParam = searchParams.get('name');
    const orderNumberParam = searchParams.get('orderNumber') || searchParams.get('orderId');

    // If none of the identifiers are present, nothing to deep-link
    if (!sessionParam && !rawJidParam && !phoneParam && !conversationIdParam) return;

    // Normalize phone number
    let cleanPhone = (phoneParam || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '2' + cleanPhone;
    }

    // Determine target JID
    let targetJid = rawJidParam || '';
    if (!targetJid && cleanPhone) {
      targetJid = `${cleanPhone}@s.whatsapp.net`;
    } else if (targetJid && !targetJid.includes('@')) {
      targetJid = `${targetJid}@s.whatsapp.net`;
    }

    if (!cleanPhone && targetJid) {
      cleanPhone = targetJid.replace(/@.*$/, '').replace(/\D/g, '');
    }

    const normalizedTarget = targetJid ? normalizeContactJid(targetJid) : '';

    const applyOrderGreeting = () => {
      if (orderNumberParam) {
        setNewMessage((prev) => {
          if (prev && prev.trim()) return prev;
          const greetingName = nameParam ? `${nameParam}، ` : '';
          return `مرحباً ${greetingName}نتواصل معك بخصوص طلبك رقم #${orderNumberParam}`;
        });
      }
    };

    // 1. Try finding in already loaded conversations
    const found = conversations.find((c) => {
      if (conversationIdParam && (c.id === conversationIdParam || c.jid === conversationIdParam)) return true;
      if (sessionParam && c.sessionId !== sessionParam) return false;
      if (normalizedTarget && normalizeContactJid(c.jid) === normalizedTarget) return true;
      if (cleanPhone && c.phoneNumber && normalizeContactJid(c.phoneNumber).includes(cleanPhone)) return true;
      return false;
    });

    if (found) {
      deepLinkAppliedRef.current = true;
      setSearchParams({}, { replace: true });
      if (selectedSession !== found.sessionId) {
        setSelectedSession(found.sessionId);
      }
      setSelectedContact(found);
      applyOrderGreeting();
      return;
    }

    // 2. If not found in memory, lookup via backend API or fallback to creating new contact
    let isCancelled = false;
    const lookupAndApply = async () => {
      if (cleanPhone || conversationIdParam || targetJid) {
        try {
          const res = await api.get<{ conversations?: Contact[] }>('/whatsapp/conversations', {
            params: {
              search: cleanPhone || targetJid || conversationIdParam,
              sessionId: sessionParam || 'all',
              limit: 5,
            },
          });
          const matched = res.data?.conversations?.[0];
          if (matched && !isCancelled) {
            deepLinkAppliedRef.current = true;
            setSearchParams({}, { replace: true });
            if (selectedSession !== matched.sessionId) {
              setSelectedSession(matched.sessionId);
            }
            setSelectedContact(matched);
            applyOrderGreeting();
            return;
          }
        } catch (err) {
          console.warn('WhatsApp deep-link lookup error:', err);
        }
      }

      if (isCancelled) return;

      // 3. Fallback: Initialize new contact under the active / connected session
      if (sessions.length > 0 && targetJid) {
        const activeSession =
          (sessionParam && sessions.find((s) => s.id === sessionParam)) ||
          sessions.find((s) => s.status === 'CONNECTED') ||
          sessions[0];

        if (activeSession) {
          const newContact: Contact = {
            id: targetJid,
            jid: targetJid,
            sessionId: activeSession.id,
            phoneNumber: cleanPhone || targetJid.replace(/@.*$/, '').replace(/[^\d]/g, ''),
            name: nameParam || null,
            pushName: null,
            profilePicUrl: null,
            isGroup: targetJid.includes('@g.us'),
            isNewsletter: targetJid.includes('@newsletter'),
            category: null,
            unreadCount: 0,
            lastMessageAt: new Date().toISOString(),
            isArchived: false,
            isPinned: false,
            isMuted: false,
            isBlocked: false,
            session: { name: activeSession.name || '', phoneNumber: activeSession.phoneNumber || '' },
            customer: null,
            window: { isOpen: false, remainingSeconds: 0, remainingLabel: '', windowExpiresAt: null },
          };
          deepLinkAppliedRef.current = true;
          setSearchParams({}, { replace: true });
          if (selectedSession !== activeSession.id) {
            setSelectedSession(activeSession.id);
          }
          setSelectedContact(newContact);
          applyOrderGreeting();
        }
      } else if (sessions.length === 0) {
        toast.warning('لا يوجد رقم واتساب متصل بالمنصة. يرجى ربط رقم واتساب في الإعدادات.');
      }
    };

    lookupAndApply();

    return () => {
      isCancelled = true;
    };
  }, [
    searchParams,
    conversations,
    sessions,
    loadingSessions,
    selectedSession,
    normalizeContactJid,
    setSearchParams,
  ]);

  // Filtered contacts logic moved to ChatSidebar

  const handlePostStatus = useCallback(() => {
    if (!statusContent.trim() || !selectedSession || selectedSession === 'all') return;

    postStatus(
      { sessionId: selectedSession, content: statusContent },
      {
        onSuccess: () => {
          setStatusContent('');
          setStatusDialogOpen(false);
          tToast.success("whatsappChat.success_publish_5ce3");
        },
        onError: () => {
          tToast.error("whatsappChat.failed_publish_960d");
        }
      }
    );
  }, [statusContent, selectedSession, postStatus]);

  // Virtual Scrolling for conversations moved/removed in favor of ChatSidebar
  // const conversationsVirtualizer = ...

  const {
    virtualizer: messagesVirtualizer,
    isAtBottom: _isAtBottom,
    scrollToBottom: _scrollToBottomFn,
    scrollToTop: _scrollToTopFn
  } = useVirtualMessages(
    visibleMessages,
    messagesContainerRef,
    {
      estimateSize: 60,
      overscan: 10,
      scrollToBottom: true,
      reverse: false
    }
  );

  // Infinite scroll for loading older messages
  useInfiniteScroll(
    messagesContainerRef,
    () => {
      if (hasMoreMessages && !loadingMessages) {
        fetchNextMessagesPage();
      }
    },
    { threshold: 200, enabled: !!selectedContact }
  );

  // Scroll to a specific message by ID
  const handleScrollToMessage = useCallback((messageId: string) => {
    const index = visibleMessages.findIndex(m => m.messageId === messageId);
    if (index !== -1) {
      messagesVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 3000);
    } else {
      pendingScrollMessageIdRef.current = messageId;
      if (!isSearchingForMessageRef.current && hasMoreMessages) {
        isSearchingForMessageRef.current = true;
        fetchNextMessagesPage();
      }
    }
  }, [visibleMessages, messagesVirtualizer, hasMoreMessages, fetchNextMessagesPage]);
  void handleScrollToMessage;

  // Effect: when messages update, check if pending scroll target is now loaded
  useEffect(() => {
    const targetId = pendingScrollMessageIdRef.current;
    if (!targetId) return;

    const index = visibleMessages.findIndex(m => m.messageId === targetId);
    if (index !== -1) {
      pendingScrollMessageIdRef.current = null;
      isSearchingForMessageRef.current = false;
      const timer = setTimeout(() => {
        messagesVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
        setHighlightedMessageId(targetId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }, 300);
      return () => clearTimeout(timer);
    }
    if (hasMoreMessages && !loadingMessages) {
      fetchNextMessagesPage();
    } else if (!hasMoreMessages) {
      pendingScrollMessageIdRef.current = null;
      isSearchingForMessageRef.current = false;
    }
    return undefined;
  }, [visibleMessages, hasMoreMessages, loadingMessages, fetchNextMessagesPage, messagesVirtualizer]);

  const fetchUserProfile = useCallback(async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const response = await api.get('/whatsapp/profile', { params: { sessionId: selectedSession } });
      if ((response as any).data.success) {
        const profile = (response as any).data.profile || {};
        setCurrentUserProfile({
          name: profile.name || profile.profileName || '',
          status: profile.status || profile.profileStatus || '',
          profilePicUrl: profile.profilePicUrl || profile.profilePictureUrl || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession && selectedSession !== 'all') {
      void fetchUserProfile();
    }
  }, [selectedSession, fetchUserProfile]);

  // Auto-select first session when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0]!.id);
    }
  }, [sessions, selectedSession]);

  // جلب التصنيفات للمستخدم النشط
  useEffect(() => {
    if (!activeSessionId) return;
    api.get('/whatsapp/labels', { params: { sessionId: activeSessionId } })
      .then(res => setLabels(res.data.labels || []))
      .catch(err => console.error('Error loading labels:', err));
  }, [activeSessionId]);

  // Load initial data (notification settings)
  useEffect(() => {
    loadNotificationSettings();
    requestNotificationPermission();
  }, []);

  // Debounced version to avoid excessive API calls - now handled inline in socket handlers

  // Debounced mark as read function
  const debouncedMarkAsRead = useCallback((sessionId: string, remoteJid: string) => {
    const pending = pendingMarkAsReadRef.current;

    if (pending && pending.sessionId === sessionId && pending.remoteJid === remoteJid && markAsReadTimeoutRef.current) {
      return;
    }

    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    pendingMarkAsReadRef.current = { sessionId, remoteJid };

    markAsReadTimeoutRef.current = setTimeout(() => {
      const pendingCall = pendingMarkAsReadRef.current;
      if (pendingCall) {
        markAsReadMutation.mutate(
          {
            sessionId: pendingCall.sessionId,
            remoteJid: pendingCall.remoteJid
          },
          {
            onError: (error: unknown) => {
              const errorMessage = getErrorMessage(error, '');
              if (errorMessage.includes('timeout')) {
                console.warn('Mark as read timeout (silent):', pendingCall.remoteJid);
              } else {
                console.error('Mark as read error:', error);
              }
            }
          }
        );
        pendingMarkAsReadRef.current = null;
      }
      markAsReadTimeoutRef.current = null;
    }, 600);
  }, [markAsReadMutation]);

  // Socket Listeners - Using refs to avoid stale closures
  const selectedContactRef = useRef(selectedContact);
  const selectedSessionRef = useRef(selectedSession);
  const notificationSettingsRef = useRef(notificationSettings);

  // Update refs when values change
  useEffect(() => {
    selectedContactRef.current = selectedContact;
    selectedSessionRef.current = selectedSession;
    notificationSettingsRef.current = notificationSettings;
  }, [selectedContact, selectedSession, notificationSettings]);

  useEffect(() => {
    if (!selectedContact) return;

    const normalizedSelectedJid = normalizeContactJid(selectedContact.jid);
    const syncedContact = conversations.find((contact) =>
      contact.sessionId === selectedContact.sessionId &&
      normalizeContactJid(contact.jid) === normalizedSelectedJid
    );

    if (!syncedContact) return;

    const hasConversationStateChange =
      syncedContact.unreadCount !== selectedContact.unreadCount ||
      syncedContact.lastMessageAt !== selectedContact.lastMessageAt ||
      syncedContact.isArchived !== selectedContact.isArchived ||
      syncedContact.isPinned !== selectedContact.isPinned ||
      syncedContact.isMuted !== selectedContact.isMuted ||
      syncedContact.isBlocked !== selectedContact.isBlocked ||
      syncedContact.name !== selectedContact.name ||
      syncedContact.pushName !== selectedContact.pushName ||
      syncedContact.profilePicUrl !== selectedContact.profilePicUrl ||
      syncedContact.leadCategoryId !== selectedContact.leadCategoryId;

    if (!hasConversationStateChange) return;

    setSelectedContact((currentContact) => {
      if (!currentContact) return currentContact;
      if (
        currentContact.sessionId !== syncedContact.sessionId ||
        normalizeContactJid(currentContact.jid) !== normalizeContactJid(syncedContact.jid)
      ) {
        return currentContact;
      }

      return {
        ...currentContact,
        ...syncedContact,
      };
    });
  }, [conversations, normalizeContactJid, selectedContact]);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    // Helper to normalize JID for comparison
    const normalizeJid = normalizeContactJid;

    // Find any cached conversation list for a session (any filter variant)
    const findConversationsCache = (sessionKey: string): ConversationsCache | null => {
      const entries = queryClient.getQueriesData<ConversationsCache>({
        queryKey: ['whatsapp', 'conversations', sessionKey],
      });
      for (const [, data] of entries) {
        if (data?.pages?.length) return data;
      }
      return null;
    };

    const handleNewMessage = (data: IncomingMessageEvent) => {
      // console.log('🔔 [FRONTEND] Received whatsapp:message:new:', data);
      const { sessionId, message } = data;

      // Normalize JIDs for comparison
      const msgJid = normalizeJid(message.remoteJid);
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      // Only process incoming messages (not sent by us)
      if (message.fromMe) {
        return;
      }

      const isCurrentChat = currentContact && msgJid === currentJid && (currentSession === 'all' || sessionId === currentSession);

      if (isCurrentChat) {
        // Update messages cache using queryClient
        const targetSid = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
          if (!old) return old;
          const lastPage = old.pages[old.pages.length - 1];
          if (!lastPage) return old;
          // Check for duplicates
          if (lastPage.messages.some((m: Message) => m.messageId === message.messageId)) {
            return old;
          }
          const newPages = [...old.pages];
          newPages[newPages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, message]
          };
          return { ...old, pages: newPages };
        });

        // Mark as read (debounced) - فقط للرسائل الواردة (ليست من المستخدم)
        if (currentContact && !message.fromMe) {
          const targetSessionId = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);
          if (targetSessionId) {
            debouncedMarkAsRead(targetSessionId, currentContact.jid);
          }
        }
        // Play sound if enabled and chat is open (quieter notification)
        if (notificationSettingsRef.current.notificationSound) {
          playNotificationSound();
        }
      } else {
        // Show notification if chat is not open or different contact
        if (currentSession === 'all' || sessionId === currentSession) {
          // Get contact name from cache
          const sessionKey = currentSession === 'all' ? 'all' : currentSession;
          const conversationsQuery = findConversationsCache(sessionKey);
          const currentContacts = conversationsQuery?.pages?.[0]?.conversations ?? [];
          const contactName = currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid)?.name ||
            currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid)?.pushName ||
            getContactDisplayPhone({ jid: message.remoteJid });
          const messageText = message.content
            ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
            : (message.messageType === 'IMAGE' ? '📷 صورة' :
              message.messageType === 'VIDEO' ? '🎥 فيديو' :
                message.messageType === 'AUDIO' ? '🎵 صوت' :
                  message.messageType === 'DOCUMENT' ? '📎 ملف' : 'رسالة جديدة');

          // Show in-app notification (snackbar) - always show this
          toast.info(messageText, {
            duration: 5000,
            action: {
              label: 'فتح المحادثة',
              onClick: () => {
                const sessionKey = currentSession === 'all' ? 'all' : currentSession;
                const conversationsQuery = findConversationsCache(sessionKey);
                const currentContacts = conversationsQuery?.pages?.[0]?.conversations ?? [];
                const contact = currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid);
                if (contact) {
                  setSelectedContact(contact);
                }
              }
            }
          });

          // Play sound if enabled
          if (notificationSettingsRef.current.notificationSound) {
            playNotificationSound();
          }

          // Show browser notification if enabled
          if (notificationSettingsRef.current.browserNotifications) {
            showBrowserNotification(
              `رسالة جديدة من ${contactName}`,
              messageText
            );
          }
        }
      }
      // Update conversations cache immediately (all filter variants)
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueriesData<ConversationsCache>({ queryKey: ['whatsapp', 'conversations', sessionKey] }, old => {
        if (!old || !old.pages || old.pages.length === 0) return old;
        // Update first page (most recent conversations)
        const firstPage = old.pages[0];
        if (!firstPage) return old;
        const contactIndex = firstPage.conversations.findIndex((c: Contact) => normalizeJid(c.jid) === msgJid);
        if (contactIndex > -1) {
          const contact = firstPage.conversations[contactIndex];
          if (!contact) return old;
          const updatedContact = {
            ...contact,
            lastMessage: {
              content: message.content,
              messageType: message.messageType,
              fromMe: message.fromMe,
              timestamp: message.timestamp
            },
            lastMessageAt: message.timestamp,
            unreadCount: isCurrentChat ? 0 : (contact.unreadCount || 0) + 1
          };
          const newContacts = [...firstPage.conversations];
          newContacts.splice(contactIndex, 1);
          const pinned = newContacts.filter((c: Contact) => c.isPinned);
          const unpinned = newContacts.filter((c: Contact) => !c.isPinned);
          if (updatedContact.isPinned) pinned.unshift(updatedContact);
          else unpinned.unshift(updatedContact);
          return {
            ...old,
            pages: [{
              ...firstPage,
              conversations: [...pinned, ...unpinned]
            }, ...old.pages.slice(1)]
          };
        } else if (data.contact) {
          // 🆕 Prepend new contact to first page so it appears immediately in the sidebar
          const newContact: Contact = {
            ...data.contact,
            lastMessage: {
              content: message.content,
              messageType: message.messageType,
              fromMe: message.fromMe,
              timestamp: message.timestamp
            },
            lastMessageAt: message.timestamp,
            unreadCount: isCurrentChat ? 0 : 1
          };
          const pinned = firstPage.conversations.filter((c: Contact) => c.isPinned);
          const unpinned = firstPage.conversations.filter((c: Contact) => !c.isPinned);
          return {
            ...old,
            pages: [{
              ...firstPage,
              conversations: [...pinned, newContact, ...unpinned]
            }, ...old.pages.slice(1)]
          };
        }
        return old;
      });

      // Invalidate conversations query to refetch in background (debounced)
      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
      }
      loadContactsTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations'],
          refetchType: 'active'
        });
      }, 500);
    };

    const handleNotification = (data: NotificationEventPayload) => {
      const { contactName, message, messageType, soundEnabled, notificationsEnabled, sessionId } = data;
      const currentSession = selectedSessionRef.current;
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      const conversationsQuery = findConversationsCache(sessionKey);
      const currentContacts = conversationsQuery?.pages?.[0]?.conversations ?? [];
      const currentNotificationSettings = notificationSettingsRef.current;

      // console.log('🔔 [NOTIFICATION] Received notification:', { contactName, messageType, soundEnabled, notificationsEnabled });

      // Prepare message text
      const messageText = message ||
        (messageType === 'IMAGE' ? '📷 صورة' :
          messageType === 'VIDEO' ? '🎥 فيديو' :
            messageType === 'AUDIO' ? '🎵 صوت' :
              messageType === 'DOCUMENT' ? '📎 ملف' : 'رسالة جديدة');

      // Show in-app notification (snackbar) - always show this
      toast.info(messageText, {
        duration: 5000,
        action: {
          label: 'فتح المحادثة',
          onClick: () => {
            if (sessionId && sessionId !== currentSession) {
              setSelectedSession(sessionId);
            }
            const contact = currentContacts.find((c: Contact) =>
              c.name === contactName || c.pushName === contactName
            );
            if (contact) {
              setSelectedContact(contact);
            }
          }
        }
      });

      // Show browser notification if enabled (use data from server or local settings)
      const shouldShowNotification = notificationsEnabled !== undefined ? notificationsEnabled : currentNotificationSettings.browserNotifications;
      if (shouldShowNotification) {
        showBrowserNotification(
          `رسالة جديدة من ${contactName}`,
          messageText
        );
      }

      // Play sound if enabled (use data from server or local settings)
      const shouldPlaySound = soundEnabled !== undefined ? soundEnabled : currentNotificationSettings.notificationSound;
      if (shouldPlaySound) {
        playNotificationSound();
      }
    };

    const handleMessageStatus = (data: MessageStatusEventPayload) => {
      const { messageId, status, remoteJid, sessionId } = data;
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;

      const msgJid = remoteJid ? normalizeContactJid(remoteJid) : (currentContact ? normalizeContactJid(currentContact.jid) : '');
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      // Only update if it matches current chat
      if (currentContact && msgJid === currentJid && (currentSession === 'all' || sessionId === currentSession)) {
        const targetSid = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        // Update message status in cache
        queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
          if (!old) return old;
          const newPages = old.pages.map(page => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.messageId === messageId ? { ...m, status } : m
            )
          }));
          return { ...old, pages: newPages };
        });
      }
    };

    const handleMessageSent = (data: IncomingMessageEvent) => {
      // console.log('🔔 [FRONTEND] Received whatsapp:message:sent:', data);
      const { sessionId, message } = data;
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;

      const msgJid = normalizeJid(message.remoteJid);
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      if (currentContact && msgJid === currentJid && (currentSession === 'all' || sessionId === currentSession)) {
        // Update messages cache
        // Use currentContact.jid to ensure key matches the query key (handle device suffixes etc)
        // Also use targetSessionId logic for consistency
        const targetSid = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
          if (!old) return old;
          const lastPage = old.pages[old.pages.length - 1];
          if (!lastPage) return old;
          // Check for duplicates
          if (lastPage.messages.some((m: Message) => m.messageId === message.messageId)) {
            return old;
          }
          const newPages = [...old.pages];
          newPages[newPages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, message]
          };
          return { ...old, pages: newPages };
        });
      }

      // Update conversations cache (all filter variants)
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueriesData<ConversationsCache>({ queryKey: ['whatsapp', 'conversations', sessionKey] }, old => {
        if (!old || !old.pages || old.pages.length === 0) return old;
        // Update first page (most recent conversations)
        const firstPage = old.pages[0];
        if (!firstPage) return old;
        const contactIndex = firstPage.conversations.findIndex((c: Contact) => normalizeJid(c.jid) === msgJid);
        if (contactIndex > -1) {
          const contact = firstPage.conversations[contactIndex];
          if (!contact) return old;
          const updatedContact = {
            ...contact,
            lastMessage: {
              content: message.content,
              messageType: message.messageType,
              fromMe: message.fromMe,
              timestamp: message.timestamp
            },
            lastMessageAt: message.timestamp,
            unreadCount: 0
          };
          const newContacts = [...firstPage.conversations];
          newContacts.splice(contactIndex, 1);
          const pinned = newContacts.filter((c: Contact) => c.isPinned);
          const unpinned = newContacts.filter((c: Contact) => !c.isPinned);
          if (updatedContact.isPinned) pinned.unshift(updatedContact);
          else unpinned.unshift(updatedContact);
          return {
            ...old,
            pages: [{
              ...firstPage,
              conversations: [...pinned, ...unpinned]
            }, ...old.pages.slice(1)]
          };
        }
        return old;
      });

      indexedDBStorage.removeItem(`whatsapp_conversations_${sessionId}`).catch(console.error);
      indexedDBStorage.removeItem('whatsapp_conversations_all').catch(console.error);

      // Invalidate conversations query in background (debounced)
      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
      }
      loadContactsTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations'],
          refetchType: 'active'
        });
      }, 500);
    };

    const handleUserTyping = (data: TypingEventPayload) => {
      const currentContact = selectedContactRef.current;
      const jid = data.jid;
      if (currentContact && jid && jid === currentContact.jid) {
        setTypingUsers(prev => new Set(prev).add(jid));
      }
    };

    const handleUserStoppedTyping = (data: TypingEventPayload) => {
      const jid = data.jid;
      if (jid) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(jid);
          return newSet;
        });
      }
    };

    const handlePollUpdated = (data: { sessionId: string; messageId: string; remoteJid: string; interactiveData: any }) => {
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid = currentContact.sessionId || (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
        if (!old) return old;
        const newPages = old.pages.map(page => ({
          ...page,
          messages: page.messages.map(m => {
            if (m.messageId === data.messageId) {
              return {
                ...m,
                interactiveData: typeof data.interactiveData === 'string' ? data.interactiveData : JSON.stringify(data.interactiveData)
              };
            }
            return m;
          })
        }));
        return { ...old, pages: newPages };
      });
    };

    const handleMessagePinned = (data: { sessionId: string; remoteJid: string; messageId: string; duration: number }) => {
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid = currentContact.sessionId || (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
        if (!old) return old;
        const newPages = old.pages.map(page => ({
          ...page,
          messages: page.messages.map(m => {
            if (m.messageId === data.messageId) {
              let meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata || '{}') : (m.metadata || {});
              return {
                ...m,
                isPinned: true,
                metadata: { ...meta, isPinned: true, pinDuration: data.duration }
              };
            }
            return m;
          })
        }));
        return { ...old, pages: newPages };
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', currentContact.jid] });
    };

    const handleMessageUnpinned = (data: { sessionId: string; remoteJid: string; messageId: string }) => {
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid = currentContact.sessionId || (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
        if (!old) return old;
        const newPages = old.pages.map(page => ({
          ...page,
          messages: page.messages.map(m => {
            if (m.messageId === data.messageId) {
              let meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata || '{}') : (m.metadata || {});
              return {
                ...m,
                isPinned: false,
                metadata: { ...meta, isPinned: false }
              };
            }
            return m;
          })
        }));
        return { ...old, pages: newPages };
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', currentContact.jid] });
    };

    const handleMessageReaction = (data: {
      sessionId: string;
      remoteJid: string;
      messageId: string;
      reactions: Record<string, string>;
      emoji?: string | null;
      reactorKey?: string;
      fromMe?: boolean;
    }) => {
      if (!data?.messageId) return;
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid = currentContact.sessionId || (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', currentContact.jid, targetSid], old => {
        if (!old) return old;
        const newPages = old.pages.map(page => ({
          ...page,
          messages: page.messages.map(m => {
            if (m.messageId === data.messageId) {
              let meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata || '{}') : (m.metadata || {});
              return {
                ...m,
                reactions: data.reactions,
                metadata: { ...meta, reactions: data.reactions }
              };
            }
            return m;
          })
        }));
        return { ...old, pages: newPages };
      });
    };

    socket.on('whatsapp:message:new', handleNewMessage);
    socket.on('whatsapp:message:reaction', handleMessageReaction);
    socket.on('whatsapp:message:status', handleMessageStatus);
    socket.on('whatsapp:message:sent', handleMessageSent);
    socket.on('whatsapp:notification:new', handleNotification);
    socket.on('whatsapp:poll_updated', handlePollUpdated);
    socket.on('whatsapp:message:pinned', handleMessagePinned);
    socket.on('whatsapp:message:unpinned', handleMessageUnpinned);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('whatsapp:message:new', handleNewMessage);
      socket.off('whatsapp:message:reaction', handleMessageReaction);
      socket.off('whatsapp:message:status', handleMessageStatus);
      socket.off('whatsapp:message:sent', handleMessageSent);
      socket.off('whatsapp:notification:new', handleNotification);
      socket.off('whatsapp:poll_updated', handlePollUpdated);
      socket.off('whatsapp:message:pinned', handleMessagePinned);
      socket.off('whatsapp:message:unpinned', handleMessageUnpinned);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      // Cleanup timeouts
      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
        loadContactsTimeoutRef.current = null;
      }
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [socket, queryClient, debouncedMarkAsRead, normalizeContactJid]);

  // Mark as read when contact is selected
  useEffect(() => {
    if (selectedContact && targetSessionId) {
      debouncedMarkAsRead(targetSessionId, selectedContact.jid);
    }
    // Cleanup on unmount
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [selectedContact, targetSessionId, debouncedMarkAsRead]);





  const handleToggleAi = useCallback(async (contact: Contact, aiEnabled: boolean) => {
    if (!contact.customer?.conversations || contact.customer.conversations.length === 0) {
      tToast.error("whatsappChat.msg_e1cd");
      return;
    }
    const conversationId = contact.customer.conversations[0]!.id;
    try {
      await api.put(`/conversations/${conversationId}`, {
        aiEnabled,
      });
      
      toast.success(aiEnabled ? 'تم تفعيل الرد الآلي' : 'تم إيقاف الرد الآلي');
      
      // Update selectedContact local state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSelectedContact(((prev: Contact | null) => {
        if (!prev || prev.id !== contact.id) return prev;
        return {
          ...prev,
          customer: prev.customer ? {
            ...prev.customer,
            conversations: prev.customer.conversations ? [
              {
                ...prev.customer.conversations[0],
                aiEnabled
              }
            ] : []
          } : null
        };
      }) as any);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "conversations"] });

    } catch (error) {
      console.error(error);
      tToast.error("whatsappChat.failed_update_status_7075");
    }
  }, [queryClient]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !selectedSession || sendMessageMutation.isPending) return;

    // Check authentication
    if (!user?.id) {
      tToast.error("whatsappChat.msg_18a1");
      return;
    }

    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      tToast.error("whatsappChat.msg_1f79");
      return;
    }

    sendMessageMutation.mutate({
      sessionId: targetSessionId,
      to: selectedContact.jid,
      text: newMessage,
      quotedMessageId: replyingTo?.messageId,
      userId: user?.id
    }, {
      onSuccess: () => {
        setNewMessage('');
        setReplyingTo(null);
      },
      onError: (error: unknown) => {
        toast.error(getErrorMessage(error, i18n.t("whatsappChat.error_error_during_d123")));
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedContact || !selectedSession) return;

    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      tToast.error("whatsappChat.msg_1f79");
      return;
    }

    const file = files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز الحد الأقصى المسموح (100 ميجابايت)");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.type.startsWith('video/') || file.size > 5 * 1024 * 1024) {
      toast.info("جاري رفع ومعالجة الوسائط، يرجى الانتظار...");
    }

    sendMediaMutation.mutate({
      sessionId: targetSessionId,
      to: selectedContact.jid,
      file,
      userId: user?.id
    }, {
      onSuccess: () => {
        toast.success("تم إرسال الوسائط بنجاح");
      },
      onError: (error: unknown) => {
        toast.error(getErrorMessage(error, i18n.t("whatsappChat.error_error_during_be74")));
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendProductImages = async (
    product: { id: string; name: string; price: number | string },
    images: Array<{ url: string; filename: string }>,
    includeDetails: boolean,
  ) => {
    if (!selectedContact || images.length === 0) return;
    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      tToast.error("whatsappChat.msg_1f79");
      return;
    }
    setShowProductPicker(false);
    try {
      if (includeDetails) {
        await sendMessageMutation.mutateAsync({
          sessionId: targetSessionId,
          to: selectedContact.jid,
          text: `${product.name}\nالسعر: ${product.price} ج.م`,
          userId: user?.id,
        });
      }
      for (const image of images) {
        try {
          const blob = await fetch(image.url).then((res) => res.blob());
          const file = new File([blob], image.filename || 'product_image.jpg', {
            type: blob.type || 'image/jpeg',
          });
          await sendMediaMutation.mutateAsync({
            sessionId: targetSessionId,
            to: selectedContact.jid,
            file,
            caption: '',
            userId: user?.id,
          });
          if (images.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: unknown) {
          console.error('Error sending product image:', error);
        }
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, i18n.t("whatsappChat.failed_send_8f23")));
    }
  };


  const handleClearChat = (contact: Contact) => {
    if (!selectedSession) return;
    setConfirmData({
      open: true,
      title: t('whatsapp.dialogs.clearChatTitle'),
      content: t('whatsapp.dialogs.clearChatContent'),
      onConfirm: async () => {
        try {
          await api.post(`/whatsapp/conversations/${contact.jid}/clear`, { sessionId: selectedSession });
          toast.success(t('whatsapp.dialogs.success'));
          if (selectedContact?.jid === contact.jid && targetSessionId) {
            queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', contact.jid, targetSessionId], old => {
              if (!old) return old;
              return {
                ...old,
                pages: [{ messages: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }]
              };
            });
          }
        } catch (error) {
          tToast.error("whatsappChat.failed_clear_cdd5");
        }
        setConfirmData(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleDeleteChat = (contact: Contact) => {
    if (!selectedSession) return;
    setConfirmData({
      open: true,
      title: t('whatsapp.dialogs.deleteChatTitle'),
      content: t('whatsapp.dialogs.deleteChatContent'),
      onConfirm: () => {
        deleteConversationMutation.mutate({
          conversationId: contact.id,
          jid: contact.jid,
          sessionId: contact.sessionId || selectedSession
        }, {
          onSuccess: () => {
            if (selectedContact?.jid === contact.jid) {
              setSelectedContact(null);
            }
            setConfirmData(prev => ({ ...prev, open: false }));
          }
        });
      }
    });
  };

  const handleBulkDeleteChats = useCallback((jids: string[], sessionId: string) => {
    setConfirmData({
      open: true,
      title: 'حذف المحادثات المحددة',
      content: `هل أنت متأكد من حذف ${jids.length} محادثة نهائياً؟`,
      onConfirm: () => {
        deleteConversationsBulkMutation.mutate({
          sessionId,
          jids
        }, {
          onSuccess: () => {
            if (selectedContact && jids.includes(selectedContact.jid)) {
              setSelectedContact(null);
            }
            toast.success(`تم حذف ${jids.length} محادثة بنجاح`);
            setConfirmData(prev => ({ ...prev, open: false }));
          },
          onError: () => {
            tToast.error("whatsappChat.failed_delete_6e98");
          }
        });
      }
    });
  }, [deleteConversationsBulkMutation, selectedContact]);

  const handleDeleteAllChats = useCallback((sessionId?: string) => {
    setConfirmData({
      open: true,
      title: t('whatsapp.dialogs.deleteAllChatsTitle'),
      content: t('whatsapp.dialogs.deleteAllChatsContent'),
      onConfirm: () => {
        deleteAllConversationsMutation.mutate({
          sessionId
        }, {
          onSuccess: () => {
            setSelectedContact(null);
            toast.success(t('whatsapp.dialogs.deleteAllChatsSuccess'));
            setConfirmData(prev => ({ ...prev, open: false }));
          },
          onError: () => {
            tToast.error("whatsappChat.failed_delete_6e98");
          }
        });
      }
    });
  }, [deleteAllConversationsMutation, t]);

  const handleArchiveChat = async (contact: Contact) => {
    if (!selectedSession) return;

    archiveConversationMutation.mutate({
      jid: contact.jid,
      sessionId: contact.sessionId || selectedSession,
      isArchived: !contact.isArchived
    });
  };

  const handlePinChat = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/chats/pin`, {
        sessionId: contact.sessionId || selectedSession,
        jid: contact.jid,
        pin: !contact.isPinned
      });
      toast.success(contact.isPinned ? 'تم إلغاء التثبيت' : 'تم التثبيت');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch (error) {
      tToast.error("whatsappChat.failed_update_status_9511");
    }
  };

  const handleMuteChat = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/chats/mute`, {
        sessionId: contact.sessionId || selectedSession,
        jid: contact.jid,
        mute: !contact.isMuted
      });
      toast.success(contact.isMuted ? 'تم إلغاء كتم الصوت' : 'تم كتم الصوت');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch (error) {
      tToast.error("whatsappChat.failed_update_status_73cc");
    }
  };

  const handleMarkUnread = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/chats/unread`, { sessionId: contact.sessionId || selectedSession, jid: contact.jid, unread: true });
      tToast.success("whatsappChat.success_select_9a6b");
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch (error) {
      tToast.error("whatsappChat.failed_select_status_be9a");
    }
  };

  const handleForwardMessage = async () => {
    if (!selectedSession || !selectedMessageForMenu || selectedContactsForForward.length === 0) return;

    try {
      await Promise.all(selectedContactsForForward.map(jid =>
        api.post('/whatsapp/messages/forward', {
          sessionId: selectedSession,
          to: jid,
          messageId: selectedMessageForMenu.messageId
        })
      ));
      tToast.success("whatsappChat.msg_29a7");
      setForwardDialogOpen(false);
      setSelectedContactsForForward([]);
      setSelectedMessageForMenu(null);
    } catch (error) {
      tToast.error("whatsappChat.msg_71a8");
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedSession || !selectedMessageForMenu || !selectedContact) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;

    try {
      await api.post('/whatsapp/messages/delete', {
        sessionId: selectedSession,
        to: selectedMessageForMenu.remoteJid,
        key: {
          id: selectedMessageForMenu.messageId,
          remoteJid: selectedMessageForMenu.remoteJid,
          fromMe: selectedMessageForMenu.fromMe
        }
      });
      tToast.success("whatsappChat.success_delete_57de");

      // Update messages cache
      queryClient.setQueryData<MessagesCache>(['whatsapp', 'messages', selectedContact.jid, targetSessionId], old => {
        if (!old) return old;
        const newPages = old.pages.map(page => ({
          ...page,
          messages: page.messages.filter((m: Message) => m.messageId !== selectedMessageForMenu.messageId)
        }));
        return { ...old, pages: newPages };
      });

      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    } catch (error) {
      tToast.error("whatsappChat.failed_delete_f800");
    }
  };

  const handleReply = () => {
    if (selectedMessageForMenu) {
      setReplyingTo(selectedMessageForMenu);
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    }
  };

  const handleCopy = () => {
    if (selectedMessageForMenu?.content) {
      navigator.clipboard.writeText(selectedMessageForMenu.content);
      tToast.success("whatsappChat.success_copy_3ea5");
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    }
  };

  const handlePinMessage = async (message: Message, duration: number = 86400) => {
    if (!selectedContact) return;
    const sid = selectedContact.sessionId || activeSessionId;
    if (!sid) {
      tToast.error('لم يتم تحديد جلسة نشطة');
      return;
    }

    try {
      await api.post(`/whatsapp/messages/${message.messageId}/pin`, {
        sessionId: sid,
        jid: selectedContact.jid,
        duration,
      });
      tToast.success('تم تثبيت الرسالة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', selectedContact.jid] });
    } catch (error) {
      tToast.error('فشل تثبيت الرسالة');
    } finally {
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    if (!selectedContact) return;
    const sid = selectedContact.sessionId || activeSessionId;
    if (!sid) {
      tToast.error('لم يتم تحديد جلسة نشطة');
      return;
    }

    try {
      await api.delete(`/whatsapp/messages/${messageId}/pin`, {
        data: {
          sessionId: sid,
          jid: selectedContact.jid,
        }
      });
      tToast.success('تم إلغاء تثبيت الرسالة');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', selectedContact.jid] });
    } catch (error) {
      tToast.error('فشل إلغاء تثبيت الرسالة');
    } finally {
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    }
  };

  const handleSendInteractive = async (data: {
    title?: string;
    text: string;
    footer?: string;
    buttons: InteractiveButtonInput[];
  }) => {
    if (!selectedContact) return;
    const sid = selectedContact.sessionId || activeSessionId;
    if (!sid) {
      tToast.error('يرجى اختيار جلسة نشطة لإرسال الأزرار');
      return;
    }

    try {
      await api.post('/whatsapp/messages/send-interactive', {
        sessionId: sid,
        to: selectedContact.jid,
        ...data,
      });
      tToast.success('تم إرسال الرسالة التفاعلية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'فشل إرسال الرسالة التفاعلية';
      tToast.error(msg);
    }
  };

  const handleMessageContextMenu = (event: React.MouseEvent, message: Message) => {
    event.preventDefault();
    setMessageContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
    setSelectedMessageForMenu(message);
  };

  useEffect(() => {
    if (!messageContextMenu) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMessageContextMenu(null);
      }
    };

    const handleResize = () => setMessageContextMenu(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [messageContextMenu]);


  const loadNotificationSettings = async () => {
    try {
      const res = await api.get('/whatsapp/settings');
      if ((res as any).data.settings) {
        setNotificationSettings({
          notificationSound: (res as any).data.settings.notificationSound !== false,
          browserNotifications: (res as any).data.settings.browserNotifications !== false
        });
      }
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await requestBrowserNotificationPermission();
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  };

  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    const notificationOptions = {
      title,
      body,
      icon: icon || '/favicon.ico',
      tag: 'whatsapp-message',
      requireInteraction: false,
      silent: false,
      autoCloseMs: 5000,
    };

    const wasShown = showNativeBrowserNotification(notificationOptions);
    if (wasShown) {
      return;
    }

    if ('Notification' in window && Notification.permission !== 'denied') {
      void requestBrowserNotificationPermission().then(permission => {
        if (permission === 'granted') {
          showNativeBrowserNotification(notificationOptions);
        }
      });
    }
  };

  // ==================== Reactions ====================
  const handleSendReaction = async (messageId: string, emoji: string) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;

    // Check if user already reacted with this emoji -> toggle off (send empty string)
    const existingMsg = visibleMessages.find(m => m.messageId === messageId);
    let existingReactions: Record<string, string> = {};
    if (existingMsg?.reactions && typeof existingMsg.reactions === 'object') {
      existingReactions = { ...existingMsg.reactions };
    } else if (existingMsg?.metadata) {
      try {
        const meta = typeof existingMsg.metadata === 'string' ? JSON.parse(existingMsg.metadata) : existingMsg.metadata;
        if (meta?.reactions && typeof meta.reactions === 'object') {
          existingReactions = { ...meta.reactions };
        }
      } catch {}
    }
    const currentReaction = existingReactions['me'];
    const emojiToSend = currentReaction === emoji ? '' : emoji;

    // Optimistically update query cache
    queryClient.setQueriesData<MessagesCache>(
      { queryKey: ['whatsapp', 'messages', selectedContact.jid] },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            messages: page.messages.map(m => {
              if (m.messageId !== messageId) return m;
              const prev = { ...(m.reactions || {}) };
              if (emojiToSend) {
                prev['me'] = emojiToSend;
              } else {
                delete prev['me'];
              }
              const meta = typeof m.metadata === 'object' && m.metadata !== null ? { ...m.metadata } : {};
              meta.reactions = prev;
              return {
                ...m,
                reactions: prev,
                metadata: meta
              };
            })
          }))
        };
      }
    );

    setShowReactionPicker(null);

    try {
      const res = await api.post('/whatsapp/messages/send-reaction', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        messageId,
        emoji: emojiToSend
      });
      if ((res as any)?.data?.reactions) {
        queryClient.setQueriesData<MessagesCache>(
          { queryKey: ['whatsapp', 'messages', selectedContact.jid] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                messages: page.messages.map(m => {
                  if (m.messageId !== messageId) return m;
                  const serverReactions = (res as any).data.reactions;
                  return {
                    ...m,
                    reactions: serverReactions,
                    metadata: {
                      ...(typeof m.metadata === 'object' && m.metadata !== null ? m.metadata : {}),
                      reactions: serverReactions
                    }
                  };
                })
              }))
            };
          }
        );
      }
      tToast.success("whatsappChat.success_send_3257");
    } catch (error) {
      tToast.error("whatsappChat.failed_send_869b");
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
    }
  };

  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // ==================== Star Messages ====================
  const handleStarMessage = async (message: Message) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/star', {
        sessionId: targetSessionId,
        key: {
          remoteJid: message.remoteJid,
          id: message.messageId,
          fromMe: message.fromMe
        }
      });
      tToast.success("whatsappChat.msg_6131");
      setMessageContextMenu(null);
    } catch (error) {
      tToast.error("whatsappChat.msg_5a7e");
    }
  };



  // ==================== Labels ====================
  // const loadLabels = async () => {
  //   if (!selectedSession || selectedSession === 'all') return;
  //   try {
  //     const res = await api.get('/whatsapp/labels', { params: { sessionId: selectedSession } });
  //     setLabels(res.data.labels || []);
  //   } catch (error) {
  //     console.error('Error loading labels:', error);
  //   }
  // };



  // ==================== Polls ====================
  const handleSendPoll = async () => {
    if (!selectedSession || !selectedContact || !pollData.question.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    const validOptions = pollData.options.filter(o => o.trim());
    if (validOptions.length < 2) {
      tToast.warning("whatsappChat.msg_ef4e");
      return;
    }
    try {
      await api.post('/whatsapp/messages/send-poll', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        pollData: {
          name: pollData.question,
          values: validOptions,
          selectableCount: pollData.selectableCount
        }
      });
      tToast.success("whatsappChat.success_send_3f0b");
      setPollDialogOpen(false);
      setPollData({ question: '', options: ['', ''], selectableCount: 1 });
    } catch (error) {
      tToast.error("whatsappChat.failed_send_8954");
    }
  };

  // ==================== Interactive Buttons ====================
  const handleSendButtons = async () => {
    if (!selectedSession || !selectedContact || !buttonsData.text.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    const validButtons = buttonsData.buttons.filter(b => b.text.trim());
    if (validButtons.length === 0 || validButtons.length > 3) {
      tToast.warning("whatsappChat.msg_292e");
      return;
    }
    try {
      await api.post('/whatsapp/messages/send-buttons', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        text: buttonsData.text,
        buttons: validButtons.map((b, i) => ({ buttonId: `btn_${i}`, buttonText: { displayText: b.text }, type: 1 })),
        footer: buttonsData.footer || undefined
      });
      tToast.success("whatsappChat.success_send_714a");
      setButtonsDialogOpen(false);
      setButtonsData({ text: '', footer: '', buttons: [{ id: '1', text: '' }] });
    } catch (error) {
      tToast.error("whatsappChat.failed_send_0a36");
    }
  };

  // ==================== Interactive List ====================
  const handleSendList = async () => {
    if (!selectedSession || !selectedContact || !listData.text.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-list', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        text: listData.text,
        buttonText: listData.buttonText,
        title: listData.title,
        sections: listData.sections.map(s => ({
          title: s.title,
          rows: s.rows.filter(r => r.title.trim()).map(r => ({
            rowId: r.id,
            title: r.title,
            description: r.description
          }))
        }))
      });
      tToast.success("whatsappChat.success_send_fd2a");
      setListDialogOpen(false);
      setListData({ text: '', buttonText: 'اختر', title: '', sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }] });
    } catch (error) {
      tToast.error("whatsappChat.failed_send_6b1d");
    }
  };

  // ==================== Broadcast ====================


  // ==================== Catalog ====================
  const loadProducts = async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const res = await api.get('/whatsapp/catalog/products', { params: { sessionId: selectedSession } });
      setProducts((res as any).data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSendProduct = async (product: CatalogProduct) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-product', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        product: {
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency || 'EGP',
          imageUrl: product.imageUrl
        }
      });
      tToast.success("whatsappChat.success_send_2909");
      setCatalogDialogOpen(false);
    } catch (error) {
      tToast.error("whatsappChat.failed_send_f8fe");
    }
  };

  // ==================== Starred Messages ====================
  const loadStarredMessages = async () => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      const res = await api.get('/whatsapp/messages/starred', {
        params: { sessionId: targetSessionId, jid: selectedContact.jid }
      });
      setStarredMessages((res as any).data.messages || []);
      setStarredMessagesOpen(true);
    } catch (error) {
      tToast.error("whatsappChat.failed_load_229c");
    }
  };

  // ==================== Location Sharing ====================
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
            address: ''
          });
          tToast.success("whatsappChat.success_select_a6fd");
        },
        (error) => {
          toast.error(i18n.t("whatsappChat.msg_1fa1", { error: error.message }));
        }
      );
    } else {
      tToast.error("whatsappChat.msg_2cdb");
    }
  };

  const handleSendLocation = async () => {
    if (!selectedSession || !selectedContact || !locationData.latitude || !locationData.longitude) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-location', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        location: {
          degreesLatitude: parseFloat(locationData.latitude),
          degreesLongitude: parseFloat(locationData.longitude),
          name: locationData.address || 'موقعي',
          address: locationData.address
        }
      });
      tToast.success("whatsappChat.success_send_6ef9");
      setLocationDialogOpen(false);
      setLocationData({ latitude: '', longitude: '', address: '' });
    } catch (error) {
      tToast.error("whatsappChat.failed_send_84ec");
    }
  };

  const handleOpenTemplateDialog = useCallback(async () => {
    if (!selectedSession) return;
    const sessionId = selectedContact?.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!sessionId) {
      tToast.error("whatsappChat.msg_f28c");
      return;
    }
    setTemplateDialogOpen(true);
    setLoadingTemplates(true);
    try {
      const res = await api.get('/whatsapp-templates/templates', {
        params: { sessionId }
      });
      const allTemplates = (res as any).data?.templates || (res as any).data?.data || [];
      setTemplates(allTemplates.filter((t: any) => t.status === 'APPROVED'));
    } catch (error) {
      tToast.error("whatsappChat.failed_load_055c");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedSession, selectedContact]);

  const handleSelectTemplate = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    const body = tmpl.components?.find((c: any) => c.type === 'BODY');
    if (body?.text) {
      const vars: Record<string, string> = {};
      const matches = body.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((m: string) => {
          vars[m] = '';
        });
      }
      setTemplateVariables(vars);
    } else {
      setTemplateVariables({});
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedSession || !selectedContact || !selectedTemplate) return;
    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) { tToast.error("whatsappChat.msg_f28c"); return; }
    const bodyComponent = selectedTemplate.components?.find((c: any) => c.type === 'BODY');
    const params: Record<string, any> = {
      name: selectedTemplate.name,
      language: selectedTemplate.language || 'en',
      languageCode: selectedTemplate.language || 'en',
    };
    if (bodyComponent?.text && Object.keys(templateVariables).length > 0) {
      const varParams = Object.keys(templateVariables)
        .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')))
        .map((key) => ({ type: 'text', text: templateVariables[key] }));
      params['components'] = [{ type: 'BODY', parameters: varParams }];
    } else {
      params['components'] = [];
    }
    const bodyText = bodyComponent?.text || '';
    const templateBody = bodyText && Object.keys(templateVariables).length > 0
      ? bodyText.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => templateVariables[`{{${n}}}`] || `{{${n}}}`)
      : bodyText;
    try {
      await sendTemplateMutation.mutateAsync({
        sessionId: targetSessionId,
        to: selectedContact.jid,
        templateId: selectedTemplate.name,
        parameters: params,
        templateBody,
      });
      tToast.success("whatsappChat.success_send_f1a1");
      setTemplateDialogOpen(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    } catch (error) {
      tToast.error("whatsappChat.failed_send_c7f6");
    }
  };

  const handleBlockContact = async (contact: Contact) => {
    if (!window.confirm(`هل أنت متأكد من حظر ${getContactName(contact)}؟`)) return;
    try {
      await api.post('/whatsapp/contacts/block', { sessionId: contact.sessionId || selectedSession, jid: contact.jid });
      tToast.success("whatsappChat.msg_f18b");
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      setShowContactInfo(false);
    } catch (error) {
      tToast.error("whatsappChat.msg_0a94");
    }
  };

  const handleUnblockContact = async (contact: Contact) => {
    try {
      await api.post('/whatsapp/contacts/unblock', { sessionId: contact.sessionId || selectedSession, jid: contact.jid });
      tToast.success("whatsappChat.msg_0e02");
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      setShowContactInfo(false);
    } catch (error) {
}
  };

  // ==================== Group Advanced Features ====================

  const _handleToggleEphemeral = async (duration: number) => {
    if (!selectedSession || !selectedContact?.isGroup) return;
    try {
      await api.post(`/whatsapp/groups/${selectedContact.jid}/ephemeral`, {
        sessionId: selectedSession,
        ephemeral: duration // 0 = off, 86400 = 24h, 604800 = 7 days, 7776000 = 90 days
      });
      tToast.success("whatsappChat.success_update_a33f");
    } catch (error) {
      tToast.error("whatsappChat.failed_update_a3e3");
    }
  };

  const _handleUpdateGroupPicture = async (file: File) => {
    if (!selectedSession || !selectedContact?.isGroup) return;
    try {
      const formData = new FormData();
      formData.append('sessionId', selectedSession);
      formData.append('image', file);
      await api.post(`/whatsapp/groups/${selectedContact.jid}/picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      tToast.success("whatsappChat.success_update_1cca");
    } catch (error) {
      tToast.error("whatsappChat.failed_update_c47f");
    }
  };

  const _handleAcceptGroupInvite = async (inviteCode: string) => {
    if (!selectedSession) return;
    try {
      await api.post('/whatsapp/groups/invite/accept', {
        sessionId: selectedSession,
        inviteCode
      });
      tToast.success("whatsappChat.msg_6016");
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch (error) {
      tToast.error("whatsappChat.msg_ae22");
    }
  };

  const _handleGetUrlInfo = async (url: string) => {
    if (!selectedSession) return null;
    try {
      const res = await api.get('/whatsapp/url-info', {
        params: { sessionId: selectedSession, url }
      });
      return res.data;
    } catch (error) {
      console.error('Error getting URL info:', error);
      return null;
    }
  };

  // Order/Cart functions removed - using QuickOrderModal (same as Facebook inbox)

  const _sendQuickReply = async (qr: QuickReply) => {
    if (!selectedSession || !selectedContact) return;
    try {
      await api.post('/whatsapp/messages/send', {
        sessionId: selectedSession,
        to: selectedContact.jid,
        text: qr.content
      });
      setShowQuickReplies(false);
    } catch (error) {
      console.error(error);
    }
  };

  void _handleToggleEphemeral;
  void _handleUpdateGroupPicture;
  void _handleAcceptGroupInvite;
  void _handleGetUrlInfo;
  void _sendQuickReply;


  const getParticipantName = (participantJid: string) => {
    if (!participantJid) return '';
    // Normalize JID for lookup
    const normalizedJid = participantJid.includes('@') ? participantJid : `${participantJid}@s.whatsapp.net`;
    const bareDigits = normalizeContactJid(participantJid);
    const contact = conversations.find(c =>
      c.jid === normalizedJid ||
      c.jid === normalizedJid.split('@')[0] + '@s.whatsapp.net' ||
      (bareDigits && normalizeContactJid(c.jid) === bareDigits)
    );
    if (contact) {
      return getContactName(contact);
    }
    // Never return raw JID - use display phone instead
    return getContactDisplayPhone({ jid: participantJid });
  };

  const messageMenuLeft = messageContextMenu && typeof window !== 'undefined'
    ? Math.min(messageContextMenu.mouseX, window.innerWidth - 264)
    : 0;
  const messageMenuTop = messageContextMenu && typeof window !== 'undefined'
    ? Math.min(messageContextMenu.mouseY, window.innerHeight - 320)
    : 0;

  // Show loading if auth is still loading or initial data is loading
  if (authLoading || loadingSessions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--app-canvas)]">
        <Loader2 className="size-6 animate-spin text-[color:var(--color-primary)]" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[color:var(--app-canvas)] px-6 text-center">
        <p className="text-lg font-semibold text-[color:var(--color-foreground)]">
          يجب تسجيل الدخول للوصول إلى هذه الصفحة
        </p>
        <UiButton asChild>
          <a href="/auth/login">تسجيل الدخول</a>
        </UiButton>
      </div>
    );
  }

  const selectedContactName = selectedContact ? getContactName(selectedContact) : '';
  const selectedContactPhoneNumber = selectedContact
    ? getContactPhoneNumber(selectedContact)
    : '';
  const selectedContactPhoneLabel = formatContactPhoneNumber(selectedContactPhoneNumber);
  const selectedContactPhoneHref = getContactPhoneHref(selectedContactPhoneNumber);



  return (
    <div
      className={cn(
        "whatsapp-workspace-root whatsapp-theme-transition flex h-full min-h-0 flex-col overflow-hidden",
        selectedContact && "whatsapp-workspace--chat-active",
      )}
      data-chat-active={selectedContact ? "true" : "false"}
    >
      <h1 className="sr-only">لوحة تشغيل واتساب</h1>
      <div className="whatsapp-theme-transition flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row border-none rounded-none shadow-none bg-[color:var(--color-card)]">
      {/* Sidebar — LEFT in LTR, RIGHT in RTL (natural RTL flow) */}
      <ChatSidebar
        className={cn("wa-panel-sidebar ltr:lg:order-1 rtl:lg:order-1", selectedContact && "max-lg:hidden")}
        sessions={sessions}
        conversations={conversations}
        statuses={statuses}
        selectedSession={selectedSession}
        selectedContact={selectedContact}
        currentUserProfile={currentUserProfile}
        isLoadingConversations={loadingConversations}
        isLoadingMoreConversations={isLoadingMoreConversations}
        hasMoreConversations={hasMoreConversations}
        isLoadingStatuses={loadingStatuses}
        onSelectSession={setSelectedSession}
        onSelectContact={selectContactWithTransition}
        onOpenProfile={() => setProfileDialogOpen(true)}
        onOpenNewChat={() => setCheckNumberDialogOpen(true)}
        onOpenNewGroup={() => setCreateGroupDialogOpen(true)}
        onOpenPrivacySettings={() => setPrivacyDialogOpen(true)}
        onOpenBusinessProfile={() => setBusinessProfileDialogOpen(true)}
        onSyncHistory={handleSyncHistory}
        isSyncingHistory={isSyncingHistory}
        onPinChat={handlePinChat}
        onArchiveChat={handleArchiveChat}
        onDeleteChat={handleDeleteChat}
        onBlockContact={handleBlockContact}
        onMuteChat={handleMuteChat}
        onMarkAsRead={handleMarkUnread}
        onLoadMore={fetchNextConversationsPage}
        conversationsError={conversationsError}
        onRetryConversations={() => refetchConversations()}
        onAddStatus={() => setStatusDialogOpen(true)}
        onOpenBroadcast={() => setBroadcastDialogOpen(true)}
        onOpenCheckNumber={() => setCheckNumberDialogOpen(true)}
        onOpenLabels={() => { setSelectedContactForLabel(null); setLabelDialogOpen(true); }}
        onBulkDelete={handleBulkDeleteChats}
        onDeleteAll={handleDeleteAllChats}
        labels={labels}
        filterType={chatFilter}
        onFilterTypeChange={setChatFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showArchived={showArchived}
        onToggleArchived={(archived) => setShowArchived(archived)}
        counts={conversationCounts}
      />

      <div className="relative flex h-full min-h-0 flex-1 overflow-hidden ltr:lg:order-2 rtl:lg:order-2">
        <ChatWindow
          showRightPanel={showRightPanel}
          onToggleRightPanel={() => setShowRightPanel((prev) => !prev)}
          className={cn("wa-panel-chat", !selectedContact && "max-lg:hidden", showRightPanel && "max-lg:hidden")}
          selectedContact={selectedContact}
          messages={visibleMessages}
          loadingMessages={loadingMessages}
          onToggleAi={handleToggleAi}
          virtualItems={messagesVirtualizer.getVirtualItems()}
          totalHeight={messagesVirtualizer.getTotalSize()}
          measureElement={messagesVirtualizer.measureElement}
          messagesContainerRef={messagesContainerRef}
          typingUsers={typingUsers}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          isSendingMessage={sendMessageMutation.isPending}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onVoiceNoteSend={async (blob) => {
            const formData = new FormData();
            if (selectedSession && selectedContact) {
              formData.append('sessionId', selectedSession);
              formData.append('to', selectedContact.jid);
              formData.append('file', blob, 'voice_note.webm');
              formData.append('ptt', 'true');
              try {
                await api.post('/whatsapp/messages/upload-send', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                tToast.success("whatsappChat.success_send_ba8a");
                // Messages reload automatically via socket or refetch
              } catch (error) {
                tToast.error("whatsappChat.failed_send_8f23");
              }
            }
          }}
          onOpenContactInfo={() => setShowContactInfo(true)}
          onMessageContextMenu={handleMessageContextMenu}
          getContactName={getContactName}
          getParticipantName={getParticipantName}
          onOpenPoll={() => setPollDialogOpen(true)}
          onOpenButtons={() => setButtonsDialogOpen(true)}
          onOpenList={() => setListDialogOpen(true)}
          onOpenCatalog={() => { loadProducts(); setCatalogDialogOpen(true); }}
          onOpenLocation={() => setLocationDialogOpen(true)}
          onOpenOrder={() => setShowQuickOrderModal(true)}
          onOpenServiceOrder={() => setShowServiceOrderModal(true)}
          onOpenTasks={() => setShowQuickCreateTaskModal(true)}
          onOpenTemplate={handleOpenTemplateDialog}
          onOpenProducts={() => setShowProductPicker(true)}
          onBackToList={() => {
            if (typeof document.startViewTransition === 'function') {
              document.startViewTransition(() => setSelectedContact(null));
            } else {
              setSelectedContact(null);
            }
          }}
          onTouchStart={handleChatTouchStart}
          onTouchEnd={handleChatTouchEnd}
          fileInputRef={fileInputRef}
          isUploadingMedia={sendMediaMutation.isPending}
          messagesError={messagesError}
          onRetryMessages={() => refetchMessages()}
          onOpenInteractive={() => setInteractiveDialogOpen(true)}
          pinnedMessage={currentPinnedMessage}
          onScrollToPinnedMessage={() => {
            if (currentPinnedMessage) {
              handleScrollToMessage(currentPinnedMessage.messageId);
            }
          }}
          onUnpinMessage={(messageId) => handleUnpinMessage(messageId)}
          highlightedMessageId={highlightedMessageId}
          onQuotedMessageClick={handleScrollToMessage}
          onSendReaction={handleSendReaction}
        />
        {selectedContact && showRightPanel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 max-lg:block lg:hidden"
              onClick={() => setShowRightPanel(false)}
            />
            <div className="chat-right-panel-container">
              <ChatRightPanel
                key={selectedContact.id || selectedContact.jid}
                contact={selectedContact}
                labels={labels}
                refreshToken={ordersRefreshToken}
                onOpenOrder={() => setShowQuickOrderModal(true)}
                onOpenServiceOrder={() => setShowServiceOrderModal(true)}
                onOpenTasks={() => setShowQuickCreateTaskModal(true)}
                onClose={() => setShowRightPanel(false)}
                onOpenLabels={() => {
                  setSelectedContactForLabel(selectedContact);
                  setLabelDialogOpen(true);
                }}
                onContactUpdated={(updatedContact) => {
                  setSelectedContact(updatedContact);
                  queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
                  queryClient.invalidateQueries({ queryKey: ['whatsapp', 'contacts'] });
                  queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
                }}
              />
            </div>
          </>
        )}
      </div>
      </div>

      <ConfirmDialog
        open={confirmData.open}
        title={confirmData.title}
        content={confirmData.content}
        onConfirm={confirmData.onConfirm}
        onCancel={() => setConfirmData(prev => ({ ...prev, open: false }))}
        confirmLabel={t('whatsapp.dialogs.confirm') as string}
        cancelLabel={t('whatsapp.dialogs.cancel') as string}
      />

      {messageContextMenu ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setMessageContextMenu(null)}
            aria-label="Close menu"
          />
          <div
            className="fixed z-50 w-64 rounded-[24px] border border-[color:var(--shell-overlay-border)] bg-[var(--shell-overlay-bg)] p-2 shadow-[var(--shell-overlay-shadow)] ring-1 ring-[color:var(--shell-overlay-edge)]"
            style={{ left: messageMenuLeft, top: messageMenuTop }}
          >
            <div className="mb-2 flex flex-wrap gap-1 border-b border-[color:var(--shell-control-border)] pb-2">
              {commonReactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    if (selectedMessageForMenu) {
                      handleSendReaction(selectedMessageForMenu.messageId, emoji);
                    }
                    setMessageContextMenu(null);
                    setSelectedMessageForMenu(null);
                  }}
                  className="flex size-9 items-center justify-center rounded-2xl text-lg transition-colors hover:bg-[color:var(--shell-control-hover)]"
                >
                  {emoji}
                </button>
              ))}
              <UiButton
                variant="ghost"
                size="icon-sm"
                className="rounded-2xl"
                onClick={() => {
                  if (selectedMessageForMenu) {
                    setShowReactionPicker(selectedMessageForMenu.messageId);
                  }
                  setMessageContextMenu(null);
                  setSelectedMessageForMenu(null);
                }}
              >
                <SmilePlus className="size-4" />
              </UiButton>
            </div>

            <button
              type="button"
              onClick={handleReply}
              className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <Reply className="size-4" />
              <span>رد</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <Copy className="size-4" />
              <span>نسخ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedContactsForForward([]);
                setForwardDialogOpen(true);
                setMessageContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <Forward className="size-4" />
              <span>إعادة توجيه</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedMessageForMenu) {
                  handleStarMessage(selectedMessageForMenu);
                }
              }}
              className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <Star className="size-4" />
              <span>تمييز بنجمة</span>
            </button>
            {(() => {
              if (!selectedMessageForMenu) return null;
              let isMsgPinned = selectedMessageForMenu.isPinned === true;
              if (!isMsgPinned && selectedMessageForMenu.metadata) {
                try {
                  const m = typeof selectedMessageForMenu.metadata === 'string'
                    ? JSON.parse(selectedMessageForMenu.metadata)
                    : selectedMessageForMenu.metadata;
                  isMsgPinned = m?.isPinned === true;
                } catch {}
              }

              if (isMsgPinned) {
                return (
                  <button
                    type="button"
                    onClick={() => handleUnpinMessage(selectedMessageForMenu.messageId)}
                    className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/10"
                  >
                    <PinOff className="size-4" />
                    <span>إلغاء التثبيت</span>
                  </button>
                );
              }

              return (
                <div className="border-t border-[color:var(--shell-control-border)] pt-1.5 mt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]">
                    <Pin className="size-3.5" />
                    <span>تثبيت الرسالة لمدة:</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handlePinMessage(selectedMessageForMenu, 86400)}
                      className="rounded-xl px-1.5 py-1 text-xs text-center font-medium bg-[color:var(--shell-control-hover)] hover:bg-primary/20 transition-colors"
                      title="24 ساعة"
                    >
                      24 س
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinMessage(selectedMessageForMenu, 604800)}
                      className="rounded-xl px-1.5 py-1 text-xs text-center font-medium bg-[color:var(--shell-control-hover)] hover:bg-primary/20 transition-colors"
                      title="7 أيام"
                    >
                      7 أيام
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinMessage(selectedMessageForMenu, 2592000)}
                      className="rounded-xl px-1.5 py-1 text-xs text-center font-medium bg-[color:var(--shell-control-hover)] hover:bg-primary/20 transition-colors"
                      title="30 يوماً"
                    >
                      30 يوم
                    </button>
                  </div>
                </div>
              );
            })()}
            {selectedMessageForMenu?.fromMe ? (
              <button
                type="button"
                onClick={handleDeleteMessage}
                className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-500/10"
              >
                <Trash2 className="size-4" />
                <span>حذفف للجميع</span>
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <UiDialog
        open={forwardDialogOpen}
        onOpenChange={(open) => {
          setForwardDialogOpen(open);
          if (!open) {
            setSelectedContactsForForward([]);
          }
        }}
      >
        <UiDialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="text-lg text-[color:var(--color-foreground)]">
              إعادة توجيه الرسالة إلى...
            </UiDialogTitle>
            <UiDialogDescription>
              اختر محادثة أو أكثر لإرسال نفس الرسالة بدون فتح نافذة جديدة.
            </UiDialogDescription>
          </UiDialogHeader>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto px-4 py-4">
            {conversations.map((contact) => {
              const isSelected = selectedContactsForForward.includes(contact.jid);
              const contactName = getContactName(contact);

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedContactsForForward((prev) =>
                        prev.filter((jid) => jid !== contact.jid),
                      );
                    } else {
                      setSelectedContactsForForward((prev) => [...prev, contact.jid]);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-start transition-all',
                    isSelected
                      ? 'border-[color:var(--color-primary)] bg-primary/10'
                      : 'border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]',
                  )}
                >
                  <UiAvatar className="size-11">
                    <UiAvatarImage src={getInboxExternalImageUrl(contact.profilePicUrl) || undefined} />
                    <UiAvatarFallback className="bg-primary/10 font-semibold text-[color:var(--color-primary)]">
                      {contactName.slice(0, 2).toUpperCase()}
                    </UiAvatarFallback>
                  </UiAvatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                      {contactName}
                    </p>
                    <p className="truncate text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                      {getContactDisplayPhone(contact)}
                    </p>
                  </div>

                  {isSelected ? <Check className="size-4 text-[color:var(--color-primary)]" /> : null}
                </button>
              );
            })}
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton
              variant="outline"
              onClick={() => {
                setForwardDialogOpen(false);
                setSelectedContactsForForward([]);
              }}
            >
              إلغاء
            </UiButton>
            <UiButton
              onClick={handleForwardMessage}
              disabled={selectedContactsForForward.length === 0}
            >
              إرسال ({selectedContactsForForward.length})
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      <UiSheet
        open={showContactInfo && !selectedContact?.isGroup}
        onOpenChange={setShowContactInfo}
      >
          <UiSheetContent
            side="right"
            dir="rtl"
            className="w-full max-w-md border-l border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
          >
            {selectedContact && !selectedContact.isGroup ? (
              <>
              <UiSheetHeader className="border-b border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-6 py-6 text-start">
                <div className="flex flex-col items-center gap-4 pt-7">
                  <UiAvatar className="size-28 shadow-[0_18px_40px_rgba(15,27,45,0.12)]">
                    <UiAvatarImage src={getInboxExternalImageUrl(selectedContact.profilePicUrl) || undefined} />
                    <UiAvatarFallback className="bg-primary/10 text-2xl font-semibold text-[color:var(--color-primary)]">
                      {getContactInitials(selectedContactName)}
                    </UiAvatarFallback>
                  </UiAvatar>
                  <div className="min-w-0 max-w-full space-y-3 text-center">
                    <UiSheetTitle
                      dir="auto"
                      className="mx-auto max-w-full break-words text-center text-xl leading-7 text-[color:var(--color-foreground)]"
                    >
                      {selectedContactName}
                    </UiSheetTitle>
                    <UiSheetDescription className="sr-only">
                      رقم واتساب {selectedContactPhoneLabel}
                    </UiSheetDescription>
                    {selectedContactPhoneLabel ? (
                      <a
                        href={selectedContactPhoneHref}
                        dir="ltr"
                        className="mx-auto inline-flex h-9 max-w-full items-center justify-center gap-2 rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-input-bg)] px-3 font-mono text-sm font-semibold tracking-normal text-[color:var(--color-foreground)] shadow-[0_10px_24px_rgba(15,27,45,0.08)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                      >
                        <Phone className="size-4 text-[color:var(--color-primary)]" />
                        <span className="truncate">{selectedContactPhoneLabel}</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </UiSheetHeader>

              <div className="space-y-5 overflow-y-auto px-6 py-6">
                <div className="overflow-hidden rounded-[22px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] shadow-[0_14px_34px_rgba(15,27,45,0.05)]">
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                  >
                    <span>الوسائط والروابط والمستندات</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-[color:var(--color-muted-foreground)]">
                      0
                    </span>
                  </button>
                  <div className="h-px bg-[color:var(--shell-control-border)]" />
                  <button
                    type="button"
                    onClick={loadStarredMessages}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                  >
                    <span>الرسائل المميزة بنجمة</span>
                    <Star className="size-4 text-amber-500 dark:text-amber-400" />
                  </button>
                  <div className="h-px bg-[color:var(--shell-control-border)]" />
                  <button
                    type="button"
                    onClick={() => handleMuteChat(selectedContact)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                  >
                    <span>كتم الإشعارات</span>
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">
                      {selectedContact.isMuted ? 'مفعل' : 'غير مفعل'}
                    </span>
                  </button>
                </div>

                <div className="grid gap-3">
                  <UiButton
                    variant="outline"
                    className="h-11 w-full justify-between rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                    onClick={() => handleClearChat(selectedContact)}
                  >
                    <span>مسح المحتوى</span>
                    <Trash2 className="size-4" />
                  </UiButton>

                  <UiButton
                    variant="outline"
                    className="h-11 w-full justify-between rounded-[18px] border-rose-200 bg-rose-50/75 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/[0.08] dark:text-rose-300 dark:hover:bg-rose-500/[0.12] dark:hover:text-rose-200"
                    onClick={() => {
                      handleDeleteChat(selectedContact);
                      setShowContactInfo(false);
                    }}
                  >
                    <span>حذفف المحادثة</span>
                    <Trash2 className="size-4" />
                  </UiButton>

                  {selectedContact.isBlocked ? (
                    <UiButton
                      variant="outline"
                      className="h-11 w-full justify-between rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                      onClick={() => handleUnblockContact(selectedContact)}
                    >
                      <span>إلغاء حظر {selectedContactName}</span>
                      <Check className="size-4 text-[color:var(--color-primary)]" />
                    </UiButton>
                  ) : (
                    <UiButton
                      variant="outline"
                      className="h-11 w-full justify-between rounded-[18px] border-rose-200 bg-rose-50/75 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/[0.08] dark:text-rose-300 dark:hover:bg-rose-500/[0.12] dark:hover:text-rose-200"
                      onClick={() => handleBlockContact(selectedContact)}
                    >
                      <span>حظر {selectedContactName}</span>
                      <Ban className="size-4" />
                    </UiButton>
                  )}

                  <UiButton
                    variant="outline"
                    className="h-11 w-full justify-between rounded-[18px] border-rose-200 bg-[var(--whatsapp-surface-strong)] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/[0.12] dark:hover:text-rose-200"
                    onClick={() => tToast.info("whatsappChat.msg_36fc")}
                  >
                    <span>الإبلاغ عن {selectedContactName}</span>
                    <ShieldAlert className="size-4" />
                  </UiButton>
                </div>
              </div>
            </>
          ) : null}
        </UiSheetContent>
      </UiSheet>
      {/* Group Info Drawer */}
      <GroupInfoDrawer
        open={showContactInfo && !!selectedContact?.isGroup}
        onClose={() => setShowContactInfo(false)}
        sessionId={selectedContact?.sessionId || selectedSession}
        groupJid={selectedContact?.jid || ''}
        contacts={conversations}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
        sessionId={activeSessionId}
        contacts={conversations}
        onGroupCreated={(_group) => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
          // Optionally select the new group
          // setSelectedContact(group); 
        }}
      />
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        sessionId={activeSessionId}
        currentName={currentUserProfile?.name || ''}
        currentStatus={currentUserProfile?.status || ''}
        currentPicture={currentUserProfile?.profilePicUrl || ''}
      />

          <CheckNumberDialog
            open={checkNumberDialogOpen}
            onClose={() => setCheckNumberDialogOpen(false)}
            sessionId={activeSessionId}
            sessions={sessions}
            onChatStart={(jid, selectedSessionId) => {
              const chatSessionId = selectedSessionId || activeSessionId;
              const existingContact = conversations.find(c => c.jid === jid);
              if (existingContact) {
                setSelectedContact(existingContact);
              } else {
                queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
                const newContact: Contact = {
                  id: jid,
                  jid,
                  sessionId: chatSessionId,
                  phoneNumber: jid.replace(/@.*$/, '').replace(/[^\d]/g, ''),
              name: null,
              pushName: null,
              profilePicUrl: null,
              isGroup: false,
              category: null,
              unreadCount: 0,
              lastMessageAt: new Date().toISOString(),
              isArchived: false,
              isPinned: false,
              isMuted: false,
              isBlocked: false,
              session: { name: '', phoneNumber: '' },
              customer: null,
              isNewsletter: false,
              window: { isOpen: false, remainingSeconds: 0, remainingLabel: '', windowExpiresAt: null }
            };
            setSelectedContact(newContact);
          }
        }}
      />



      {/* Poll Dialog */}
      <UiDialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <BarChart3 className="size-5 text-[color:var(--color-primary)]" />
              إنشاء استطلاع
            </UiDialogTitle>
            <UiDialogDescription>
              اكتب السؤال وحدد الخيارات التي سيستطيع العميل الاختيار منها.
            </UiDialogDescription>
          </UiDialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                السؤال
              </label>
              <UiInput
                value={pollData.question}
                onChange={(e) => setPollData((prev) => ({ ...prev, question: e.target.value }))}
                className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  الخيارات
                </label>
                <span className="text-xs text-[color:var(--color-muted-foreground)]">
                  {pollData.options.filter((option) => option.trim()).length} مكتمل
                </span>
              </div>
              {pollData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <UiInput
                    value={option}
                    placeholder={`الخيار ${index + 1}`}
                    onChange={(e) => {
                      const newOptions = [...pollData.options];
                      newOptions[index] = e.target.value;
                      setPollData((prev) => ({ ...prev, options: newOptions }));
                    }}
                    className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-strong)]"
                  />
                  {pollData.options.length > 2 ? (
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() => {
                        const newOptions = pollData.options.filter((_, itemIndex) => itemIndex !== index);
                        setPollData((prev) => ({ ...prev, options: newOptions }));
                      }}
                    >
                      <X className="size-4" />
                    </UiButton>
                  ) : null}
                </div>
              ))}
              {pollData.options.length < 12 ? (
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPollData((prev) => ({ ...prev, options: [...prev.options, ''] }))}
                >
                  <PlusCircle className="size-4" />
                  إضافة خيار
                </UiButton>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                عدد الاختيارات المسموح بها
              </label>
              <UiSelect
                value={String(pollData.selectableCount)}
                onValueChange={(value) =>
                  setPollData((prev) => ({ ...prev, selectableCount: Number(value) }))
                }
              >
                <UiSelectTrigger className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="1">اختيار واحد فقط</UiSelectItem>
                  <UiSelectItem value="0">اختيارات متعددة</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => setPollDialogOpen(false)}>
              إلغاء
            </UiButton>
            <UiButton
              onClick={handleSendPoll}
              disabled={!pollData.question.trim() || pollData.options.filter((o) => o.trim()).length < 2}
            >
              إرسال الاستطلاع
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      {/* Reaction Picker Dialog */}
      <UiDialog open={!!showReactionPicker} onOpenChange={(open) => !open && setShowReactionPicker(null)}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-fit rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-4"
        >
          <UiDialogHeader className="pb-3 text-start">
            <UiDialogTitle className="text-base">اختر تفاعل</UiDialogTitle>
          </UiDialogHeader>
          <EmojiPicker
            onEmojiClick={(data: EmojiClickData) => {
              if (showReactionPicker) {
                handleSendReaction(showReactionPicker, data.emoji);
              }
            }}
          />
        </UiDialogContent>
      </UiDialog>

      {/* Buttons Dialog */}
      <UiDialog open={buttonsDialogOpen} onOpenChange={setButtonsDialogOpen}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <MousePointerSquare className="size-5 text-[color:var(--color-primary)]" />
              إرسال رسالة بأزرار
            </UiDialogTitle>
          </UiDialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                نص الرسالة
              </label>
              <UiTextarea
                rows={4}
                value={buttonsData.text}
                onChange={(e) => setButtonsData((prev) => ({ ...prev, text: e.target.value }))}
                className="rounded-[20px] bg-[var(--whatsapp-surface-strong)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                نص التذييل
              </label>
              <UiInput
                value={buttonsData.footer}
                onChange={(e) => setButtonsData((prev) => ({ ...prev, footer: e.target.value }))}
                className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                placeholder="اختياري"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  الأزرار
                </label>
                <span className="text-xs text-[color:var(--color-muted-foreground)]">
                  بحد أقصى 3
                </span>
              </div>
              {buttonsData.buttons.map((button, index) => (
                <div key={button.id} className="flex items-center gap-2">
                  <UiInput
                    value={button.text}
                    placeholder={`الزر ${index + 1}`}
                    onChange={(e) => {
                      const newButtons = [...buttonsData.buttons];
                      newButtons[index] = { ...button, text: e.target.value };
                      setButtonsData((prev) => ({ ...prev, buttons: newButtons }));
                    }}
                    className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-strong)]"
                  />
                  {buttonsData.buttons.length > 1 ? (
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() => {
                        setButtonsData((prev) => ({
                          ...prev,
                          buttons: prev.buttons.filter((_, itemIndex) => itemIndex !== index),
                        }));
                      }}
                    >
                      <X className="size-4" />
                    </UiButton>
                  ) : null}
                </div>
              ))}
              {buttonsData.buttons.length < 3 ? (
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setButtonsData((prev) => ({
                      ...prev,
                      buttons: [...prev.buttons, { id: String(prev.buttons.length + 1), text: '' }],
                    }))
                  }
                >
                  <PlusCircle className="size-4" />
                  إضافة زر
                </UiButton>
              ) : null}
            </div>
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => setButtonsDialogOpen(false)}>
              إلغاء
            </UiButton>
            <UiButton onClick={handleSendButtons} disabled={!buttonsData.text.trim()}>
              إرسال
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      {/* List Dialog */}
      <UiDialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-4xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <ListIcon className="size-5 text-[color:var(--color-primary)]" />
              إرسال رسالة بقائمة
            </UiDialogTitle>
          </UiDialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                نص الرسالة
              </label>
              <UiTextarea
                rows={3}
                value={listData.text}
                onChange={(e) => setListData((prev) => ({ ...prev, text: e.target.value }))}
                className="rounded-[20px] bg-[var(--whatsapp-surface-strong)]"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  عنوان القائمة
                </label>
                <UiInput
                  value={listData.title}
                  onChange={(e) => setListData((prev) => ({ ...prev, title: e.target.value }))}
                  className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  نص الزر
                </label>
                <UiInput
                  value={listData.buttonText}
                  onChange={(e) => setListData((prev) => ({ ...prev, buttonText: e.target.value }))}
                  className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                />
              </div>
            </div>

            <div className="space-y-3">
              {listData.sections.map((section, sIndex) => (
                <div
                  key={`${section.title}-${sIndex}`}
                  className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4"
                >
                  <div className="flex items-center gap-2">
                    <UiInput
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...listData.sections];
                        newSections[sIndex] = { ...section, title: e.target.value };
                        setListData((prev) => ({ ...prev, sections: newSections }));
                      }}
                      className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-elevated)]"
                      placeholder="عنوان القسم"
                    />
                    {listData.sections.length > 1 ? (
                      <UiButton
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                        onClick={() =>
                          setListData((prev) => ({
                            ...prev,
                            sections: prev.sections.filter((_, itemIndex) => itemIndex !== sIndex),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </UiButton>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {section.rows.map((row, rIndex) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <UiInput
                          value={row.title}
                          placeholder="العنوان"
                          onChange={(e) => {
                            const newSections = [...listData.sections];
                            if (newSections[sIndex]?.rows[rIndex]) {
                              newSections[sIndex]!.rows[rIndex] = { ...row, title: e.target.value };
                              setListData((prev) => ({ ...prev, sections: newSections }));
                            }
                          }}
                          className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-elevated)]"
                        />
                        <UiInput
                          value={row.description}
                          placeholder="الوصف"
                          onChange={(e) => {
                            const newSections = [...listData.sections];
                            if (newSections[sIndex]?.rows[rIndex]) {
                              newSections[sIndex]!.rows[rIndex] = { ...row, description: e.target.value };
                              setListData((prev) => ({ ...prev, sections: newSections }));
                            }
                          }}
                          className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-elevated)]"
                        />
                        {section.rows.length > 1 ? (
                          <UiButton
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                            onClick={() => {
                              const newSections = [...listData.sections];
                              if (newSections[sIndex]) {
                                newSections[sIndex]!.rows = section.rows.filter((_, itemIndex) => itemIndex !== rIndex);
                                setListData((prev) => ({ ...prev, sections: newSections }));
                              }
                            }}
                          >
                            <X className="size-4" />
                          </UiButton>
                        ) : null}
                      </div>
                    ))}
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSections = [...listData.sections];
                        if (newSections[sIndex]) {
                          newSections[sIndex]!.rows.push({
                            id: String(section.rows.length + 1),
                            title: '',
                            description: '',
                          });
                          setListData((prev) => ({ ...prev, sections: newSections }));
                        }
                      }}
                    >
                      <PlusCircle className="size-4" />
                      إضافة عنصر
                    </UiButton>
                  </div>
                </div>
              ))}
            </div>

            {listData.sections.length < 10 ? (
              <UiButton
                variant="outline"
                onClick={() =>
                  setListData((prev) => ({
                    ...prev,
                    sections: [
                      ...prev.sections,
                      {
                        title: `القسم ${prev.sections.length + 1}`,
                        rows: [{ id: '1', title: '', description: '' }],
                      },
                    ],
                  }))
                }
              >
                <PlusCircle className="size-4" />
                إضافة قسم
              </UiButton>
            ) : null}
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => setListDialogOpen(false)}>
              إلغاء
            </UiButton>
            <UiButton onClick={handleSendList} disabled={!listData.text.trim()}>
              إرسال
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      {/* Catalog Dialog */}
      <UiDialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-5xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <Store className="size-5 text-[color:var(--color-primary)]" />
              إرسال منتج
            </UiDialogTitle>
          </UiDialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
            {products.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-4 py-10 text-center text-sm text-[color:var(--color-muted-foreground)]">
                لا توجد منتجات في الكتالوج.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className={cn(
                      'overflow-hidden rounded-[24px] border text-start transition-all',
                      selectedProduct?.id === product.id
                        ? 'border-[color:var(--color-primary)] bg-primary/8 shadow-md'
                        : 'border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]',
                    )}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : null}
                    <div className="space-y-2 p-4">
                      <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                        {product.name}
                      </p>
                      <p className="line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
                        {product.description}
                      </p>
                      <p className="text-base font-semibold text-[color:var(--color-primary)]">
                        {product.price ?? 0} {product.currency || 'EGP'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => setCatalogDialogOpen(false)}>
              إلغاء
            </UiButton>
            <UiButton
              onClick={() => selectedProduct && handleSendProduct(selectedProduct)}
              disabled={!selectedProduct}
            >
              إرسال المنتج
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      {/* Starred Messages Drawer */}
      <UiSheet open={starredMessagesOpen} onOpenChange={setStarredMessagesOpen}>
        <UiSheetContent
          side="right"
          className="w-full max-w-md border-l border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiSheetHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-6 text-start">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              <UiSheetTitle>الرسائل المميزة</UiSheetTitle>
            </div>
            <UiSheetDescription>
              راجع الرسائل التي تم تمييزها داخل المحادثة الحالية.
            </UiSheetDescription>
          </UiSheetHeader>

          <div className="space-y-3 overflow-y-auto px-6 py-6">
            {starredMessages.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-4 py-10 text-center text-sm text-[color:var(--color-muted-foreground)]">
                لا توجد رسائل مميزة
              </div>
            ) : (
              starredMessages.map((msg) => (
                <div
                  key={msg.messageId}
                  className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] px-4 py-3"
                >
                  <p className="text-sm text-[color:var(--color-foreground)]">
                    {msg.content}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--color-muted-foreground)]">
                    {format(new Date(msg.timestamp), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              ))
            )}
          </div>
        </UiSheetContent>
      </UiSheet>

      {/* Quick Order Modal (same as Facebook inbox - 1:1 copy) */}
      <QuickOrderModal
        isOpen={showQuickOrderModal}
        onClose={() => {
          setShowQuickOrderModal(false);
          setQuickOrderContact(null);
        }}
        customerName={quickOrderContact ? getContactName(quickOrderContact) : (selectedContact ? getContactName(selectedContact) : undefined)}
        customerPhone={(quickOrderContact ? getContactPhoneNumber(quickOrderContact) : selectedContactPhoneNumber) || undefined}
        conversationId={quickOrderContact?.id || selectedContact?.id}
        customerId={quickOrderContact?.customer?.id || quickOrderContact?.id || selectedContact?.id}
        platform="whatsapp"
        pageName={
          selectedSession && selectedSession !== 'all'
            ? sessions.find(s => s.id === selectedSession)?.name || 'WhatsApp'
            : 'WhatsApp'
        }
        onOrderCreated={(orderId) => {
          toast.success(t('whatsapp.dialogs.orderCreated', { orderId }));
          setOrdersRefreshToken((prev) => prev + 1);
        }}
      />

      <CreateServiceOrderModal
        isOpen={showServiceOrderModal}
        onClose={() => setShowServiceOrderModal(false)}
        customerName={selectedContact ? getContactName(selectedContact) : undefined}
        customerPhone={selectedContactPhoneNumber || undefined}
        sessionId={targetSessionId || undefined}
        onOrderCreated={() => {
          setOrdersRefreshToken((prev) => prev + 1);
        }}
      />

      <QuickCreateTaskModal
        isOpen={showQuickCreateTaskModal}
        onClose={() => setShowQuickCreateTaskModal(false)}
      />

      <ProductImagePickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSendProduct={handleSendProductImages}
      />

      <InteractiveButtonsModal
        open={interactiveDialogOpen}
        onOpenChange={setInteractiveDialogOpen}
        onSend={handleSendInteractive}
      />

      {/* Location Dialog */}
      <UiDialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <MapPin className="size-5 text-[color:var(--color-primary)]" />
              إرسال موقع
            </UiDialogTitle>
          </UiDialogHeader>

          <div className="space-y-4 px-6 py-6">
            <UiButton variant="outline" className="w-full justify-center" onClick={getCurrentLocation}>
              <MapPin className="size-4" />
              استخدام موقعي الحالي
            </UiButton>

            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              أو أدخل الإحداثيات يدويًا
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <UiInput
                type="number"
                step="any"
                value={locationData.latitude}
                onChange={(e) => setLocationData((prev) => ({ ...prev, latitude: e.target.value }))}
                className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                placeholder="خط العرض"
              />
              <UiInput
                type="number"
                step="any"
                value={locationData.longitude}
                onChange={(e) => setLocationData((prev) => ({ ...prev, longitude: e.target.value }))}
                className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                placeholder="خط الطول"
              />
            </div>

            <UiInput
              value={locationData.address}
              onChange={(e) => setLocationData((prev) => ({ ...prev, address: e.target.value }))}
              className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              placeholder="مثال: القاهرة، مصر"
            />

            {locationData.latitude && locationData.longitude ? (
              <div className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4">
                <p className="text-sm text-[color:var(--color-foreground)]">
                  الموقع: {locationData.latitude}, {locationData.longitude}
                </p>
                <UiButton asChild variant="outline" size="sm">
                  <a
                    href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    عرض على الخريطة
                  </a>
                </UiButton>
              </div>
            ) : null}
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => setLocationDialogOpen(false)}>
              إلغاء
            </UiButton>
            <UiButton
              onClick={handleSendLocation}
              disabled={!locationData.latitude || !locationData.longitude}
            >
              إرسال الموقع
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      {/* Template Message Dialog */}
      <UiDialog open={templateDialogOpen} onOpenChange={(open) => {
        setTemplateDialogOpen(open);
        if (!open) {
          setSelectedTemplate(null);
          setTemplateVariables({});
        }
      }}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <FileText className="size-5 text-[color:var(--color-primary)]" />
              {selectedTemplate ? 'تعبئة متغيرات القالب' : 'إرسال قالب'}
            </UiDialogTitle>
            <UiDialogDescription>
              {selectedTemplate
                ? `املأ المتغيرات للقالب: ${selectedTemplate.name}`
                : 'اختر قالباً معتمداً لإرساله إلى المحادثة الحالية'}
            </UiDialogDescription>
          </UiDialogHeader>

          <div className="max-h-[28rem] space-y-3 overflow-y-auto px-6 py-6">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-[color:var(--color-muted-foreground)]" />
              </div>
            ) : !selectedTemplate ? (
              templates.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                  لا توجد قوالب معتمدة متاحة
                </p>
              ) : (
                templates.map((tmpl: any) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="flex w-full items-start gap-3 rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4 text-right transition-all hover:border-[color:var(--color-primary)] hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[color:var(--color-foreground)]">
                        {tmpl.name}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                        {tmpl.language} · {tmpl.category}
                      </p>
                      {tmpl.components?.find((c: any) => c.type === 'BODY')?.text && (
                        <p className="mt-1 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
                          {tmpl.components.find((c: any) => c.type === 'BODY').text}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )
            ) : (
              <div className="space-y-4">
                <div className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4">
                  <p className="mb-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                    {selectedTemplate.name}
                  </p>
                  {selectedTemplate.components?.map((comp: any, idx: number) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      {comp.type === 'HEADER' && comp.text && (
                        <p className="text-sm font-medium text-[color:var(--color-primary)]">
                          {comp.text}
                        </p>
                      )}
                      {comp.type === 'BODY' && (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]">
                          {comp.text?.replace(/\{\{(\d+)\}\}/g, (_: string, num: string) =>
                            templateVariables[`{{${num}}}`] || `{{${num}}}`
                          )}
                        </p>
                      )}
                      {comp.type === 'FOOTER' && comp.text && (
                        <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                          {comp.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {Object.keys(templateVariables).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      المتغيرات
                    </p>
                    {Object.keys(templateVariables).sort((a, b) => {
                      const numA = parseInt(a.replace(/\D/g, ''));
                      const numB = parseInt(b.replace(/\D/g, ''));
                      return numA - numB;
                    }).map((key) => (
                      <UiInput
                        key={key}
                        value={templateVariables[key]}
                        onChange={(e) =>
                          setTemplateVariables((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                        placeholder={`المتغير ${key}`}
                      />
                    ))}
                  </div>
                )}

                {Object.keys(templateVariables).length === 0 && (
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    هذا القالب لا يحتوي على متغيرات
                  </p>
                )}
              </div>
            )}
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => {
              if (selectedTemplate) {
                setSelectedTemplate(null);
                setTemplateVariables({});
              } else {
                setTemplateDialogOpen(false);
              }
            }}>
              {selectedTemplate ? 'رجوع' : 'إلغاء'}
            </UiButton>
            {selectedTemplate && (
              <UiButton
                onClick={handleSendTemplate}
                disabled={sendTemplateMutation.isPending || (
                  Object.keys(templateVariables).length > 0 &&
                  Object.values(templateVariables).some((v) => !v.trim())
                )}
              >
                {sendTemplateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                إرسال القالب
              </UiButton>
            )}
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>

      {/* Labels Dialog */}
      <LabelsDialog
        open={labelDialogOpen}
        onClose={() => {
          setLabelDialogOpen(false);
          setSelectedContactForLabel(null);
        }}
        sessionId={activeSessionId}
        contactJid={selectedContactForLabel?.jid}
        initialLabels={selectedContactForLabel?.labels || []}
        onLabelsUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
        }}
      />

      {/* Post Status Dialog */}
      <UiDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <UiDialogContent
          showCloseButton={false}
          className="max-w-xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
              <PlusCircle className="size-5 text-[color:var(--color-primary)]" />
              إضافة حالة جديدة
            </UiDialogTitle>
            <UiDialogDescription>
              ستظهر الحالة لمدة 24 ساعة ثم تختفي تلقائيًا.
            </UiDialogDescription>
          </UiDialogHeader>

          <div className="space-y-3 px-6 py-6">
            <UiTextarea
              autoFocus
              rows={4}
              value={statusContent}
              onChange={(e) => setStatusContent(e.target.value)}
              placeholder="ماذا يحدث؟"
              className="rounded-[20px] bg-[var(--whatsapp-surface-strong)]"
            />
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              الحالة ستنتهي بعد 24 ساعة.
            </p>
          </div>

          <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
            <UiButton variant="outline" onClick={() => setStatusDialogOpen(false)}>
              إلغاء
            </UiButton>
            <UiButton
              onClick={handlePostStatus}
              disabled={!statusContent.trim() || postingStatus}
            >
              {postingStatus ? <Loader2 className="size-4 animate-spin" /> : null}
              نشر
            </UiButton>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>


      {/* Broadcast Dialog */}
      <BroadcastDialog
        open={broadcastDialogOpen}
        onClose={() => setBroadcastDialogOpen(false)}
        sessionId={activeSessionId}
        contacts={conversations}
      />

      {/* Privacy Settings Dialog */}
      <PrivacySettingsDialog
        open={privacyDialogOpen}
        onClose={() => setPrivacyDialogOpen(false)}
        sessionId={activeSessionId}
        contacts={conversations}
      />

      {/* Business Profile Dialog */}
      <BusinessProfileDialog
        open={businessProfileDialogOpen}
        onClose={() => setBusinessProfileDialogOpen(false)}
        sessionId={activeSessionId}
      />
    </div>
  );
};

const WhatsAppChat: React.FC = () => <WhatsAppChatContent />;

export default WhatsAppChat;
