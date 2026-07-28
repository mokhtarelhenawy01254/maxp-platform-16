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
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { format } from 'date-fns';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../services/apiClient';
import { indexedDBStorage } from '../../services/indexedDBStorage';
import useSocket from '../../hooks/useSocket';
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
import { useAuth } from '../../hooks/useAuthSimple';

import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatRightPanel from './components/ChatRightPanel';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import {
  useWhatsAppSessions,
  useWhatsAppConversations,
  useWhatsAppMessages,
  useWhatsAppQuickReplies,
  type Session,
  type Contact,
  type Message,
  type QuickReply
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
      toast.error(getErrorMessage(error, 'تعذر طلب مزامنة الرسائل'));
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
  const [_highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
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

  // — Fix AppShell intermediate wrapper height (same pattern as FacebookInbox) —
  useEffect(() => {
    const appContent = document.querySelector(".app-shell-content");
    if (appContent) {
      appContent.style.overflow = "hidden";

      const root = document.querySelector(".whatsapp-workspace-root");
      if (root && root.parentElement) {
        root.parentElement.classList.add("h-full");
      }

      return () => {
        appContent.style.overflow = "";
        if (root && root.parentElement) {
          root.parentElement.classList.remove("h-full");
        }
      };
    }
    return undefined;
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
        window.history.back();
      }
      return;
    }
    window.location.hash = 'chat';
    const onHashChange = () => {
      if (window.location.hash !== '#chat' && selectedContact) {
        setSelectedContact(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectedContact]);

  // Persist right panel visibility
  useEffect(() => {
    localStorage.setItem('whatsappChatRightPanelVisible', String(showRightPanel));
  }, [showRightPanel]);

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
  // const [chatFilter, setChatFilter] = useState('all'); // Moved to ChatSidebar
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
  } = useWhatsAppConversations(selectedSession || 'all', 30);

  const conversations = useMemo(() => {
    if (!conversationsData) return [];
    return conversationsData.pages.flatMap(page => page.conversations || []);
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

  // Filter out reactions from the main message list
  const visibleMessages = useMemo(() => {
    return messages.filter(m => m.messageType !== 'REACTION');
  }, [messages]);



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

  // Filtered contacts logic moved to ChatSidebar

  const handlePostStatus = useCallback(() => {
    if (!statusContent.trim() || !selectedSession || selectedSession === 'all') return;

    postStatus(
      { sessionId: selectedSession, content: statusContent },
      {
        onSuccess: () => {
          setStatusContent('');
          setStatusDialogOpen(false);
          toast.success('تم نشر الحالة بنجاح');
        },
        onError: () => {
          toast.error('فشل نشر الحالة');
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
          const conversationsQuery = queryClient.getQueryData<ConversationsCache>(['whatsapp', 'conversations', sessionKey, 30]);
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
                const conversationsQuery = queryClient.getQueryData<ConversationsCache>(['whatsapp', 'conversations', sessionKey, 30]);
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
      // Update conversations cache immediately
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueryData<ConversationsCache>(['whatsapp', 'conversations', sessionKey, 30], old => {
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
      const conversationsQuery = queryClient.getQueryData<ConversationsCache>(['whatsapp', 'conversations', sessionKey, 30]);
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

      // Update conversations cache
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueryData<ConversationsCache>(['whatsapp', 'conversations', sessionKey, 30], old => {
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

    socket.on('whatsapp:message:new', handleNewMessage);
    socket.on('whatsapp:message:status', handleMessageStatus);
    socket.on('whatsapp:message:sent', handleMessageSent);
    socket.on('whatsapp:notification:new', handleNotification);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('whatsapp:message:new', handleNewMessage);
      socket.off('whatsapp:message:status', handleMessageStatus);
      socket.off('whatsapp:message:sent', handleMessageSent);
      socket.off('whatsapp:notification:new', handleNotification);
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
      toast.error('لم يتم العثور على محادثة نشطة لهذا الرقم للتحكم في الرد الآلي');
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
      toast.error('فشل تحديث حالة الرد الآلي');
    }
  }, [queryClient]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !selectedSession || sendMessageMutation.isPending) return;

    // Check authentication
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول لإرسال الرسائل');
      return;
    }

    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      toast.error('خطأ: لا يمكن تحديد الجلسة');
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
        toast.error(getErrorMessage(error, 'حدث خطأ أثناء الإرسال'));
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedContact || !selectedSession) return;

    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      toast.error('خطأ: لا يمكن تحديد الجلسة');
      return;
    }

    const file = files[0];
    if (!file) return;

    sendMediaMutation.mutate({
      sessionId: targetSessionId,
      to: selectedContact.jid,
      file,
      userId: user?.id
    }, {
      onError: (error: unknown) => {
        toast.error(getErrorMessage(error, 'حدث خطأ أثناء رفع الملف'));
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
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
          toast.error('فشل مسح المحادثة');
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
            toast.error('فشل حذف المحادثات');
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
            toast.error('فشل حذف المحادثات');
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
      toast.error('فشل تحديث حالة التثبيت');
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
      toast.error('فشل تحديث حالة كتم الصوت');
    }
  };

  const handleMarkUnread = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/chats/unread`, { sessionId: contact.sessionId || selectedSession, jid: contact.jid, unread: true });
      toast.success('تم تحديد المحادثة كغير مقروءة');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch (error) {
      toast.error('فشل تحديد حالة القراءة');
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
      toast.success('تم إعادة توجيه الرسالة');
      setForwardDialogOpen(false);
      setSelectedContactsForForward([]);
      setSelectedMessageForMenu(null);
    } catch (error) {
      toast.error('فشل إعادة توجيه الرسالة');
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
      toast.success('تم حذف الرسالة');

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
      toast.error('فشل حذف الرسالة');
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
      toast.success('تم نسخ النص');
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
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
    try {
      await api.post('/whatsapp/messages/send-reaction', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        messageId,
        emoji
      });
      setShowReactionPicker(null);
      toast.success('تم إرسال التفاعل');
    } catch (error) {
      toast.error('فشل إرسال التفاعل');
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
      toast.success('تم تمييز الرسالة بنجمة');
      setMessageContextMenu(null);
    } catch (error) {
      toast.error('فشل تمييز الرسالة');
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
      toast.warning('يجب إضافة خيارين على الأقل');
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
      toast.success('تم إرسال الاستطلاع');
      setPollDialogOpen(false);
      setPollData({ question: '', options: ['', ''], selectableCount: 1 });
    } catch (error) {
      toast.error('فشل إرسال الاستطلاع');
    }
  };

  // ==================== Interactive Buttons ====================
  const handleSendButtons = async () => {
    if (!selectedSession || !selectedContact || !buttonsData.text.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    const validButtons = buttonsData.buttons.filter(b => b.text.trim());
    if (validButtons.length === 0 || validButtons.length > 3) {
      toast.warning('يجب إضافة 1-3 أزرار');
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
      toast.success('تم إرسال الرسالة بالأزرار');
      setButtonsDialogOpen(false);
      setButtonsData({ text: '', footer: '', buttons: [{ id: '1', text: '' }] });
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
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
      toast.success('تم إرسال القائمة');
      setListDialogOpen(false);
      setListData({ text: '', buttonText: 'اختر', title: '', sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }] });
    } catch (error) {
      toast.error('فشل إرسال القائمة');
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
      toast.success('تم إرسال المنتج');
      setCatalogDialogOpen(false);
    } catch (error) {
      toast.error('فشل إرسال المنتج');
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
      toast.error('فشل تحميل الرسائل المميزة');
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
          toast.success('تم تحديد موقعك الحالي');
        },
        (error) => {
          toast.error('فشل تحديد الموقع: ' + error.message);
        }
      );
    } else {
      toast.error('المتصفح لا يدعم تحديد الموقع');
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
      toast.success('تم إرسال الموقع');
      setLocationDialogOpen(false);
      setLocationData({ latitude: '', longitude: '', address: '' });
    } catch (error) {
      toast.error('فشل إرسال الموقع');
    }
  };

  const handleOpenTemplateDialog = useCallback(async () => {
    if (!selectedSession) return;
    const sessionId = selectedContact?.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!sessionId) {
      toast.error('الرجاء اختيار جلسة واتساب محددة');
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
      toast.error('فشل تحميل القوالب');
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
    if (!targetSessionId) { toast.error('الرجاء اختيار جلسة واتساب محددة'); return; }
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
      toast.success('تم إرسال القالب');
      setTemplateDialogOpen(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    } catch (error) {
      toast.error('فشل إرسال القالب');
    }
  };

  const handleBlockContact = async (contact: Contact) => {
    if (!window.confirm(`هل أنت متأكد من حظر ${getContactName(contact)}؟`)) return;
    try {
      await api.post('/whatsapp/contacts/block', { sessionId: contact.sessionId || selectedSession, jid: contact.jid });
      toast.success('تم حظر جهة الاتصال');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      setShowContactInfo(false);
    } catch (error) {
      toast.error('فشل حظر جهة الاتصال');
    }
  };

  const handleUnblockContact = async (contact: Contact) => {
    try {
      await api.post('/whatsapp/contacts/unblock', { sessionId: contact.sessionId || selectedSession, jid: contact.jid });
      toast.success('تم إلغاء حظر جهة الاتصال');
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
      toast.success('تم تحديث إعدادات الرسائل المؤقتة');
    } catch (error) {
      toast.error('فشل تحديث الإعدادات');
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
      toast.success('تم تحديث صورة المجموعة');
    } catch (error) {
      toast.error('فشل تحديث الصورة');
    }
  };

  const _handleAcceptGroupInvite = async (inviteCode: string) => {
    if (!selectedSession) return;
    try {
      await api.post('/whatsapp/groups/invite/accept', {
        sessionId: selectedSession,
        inviteCode
      });
      toast.success('تم قبول الدعوة والانضمام للمجموعة');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    } catch (error) {
      toast.error('فشل قبول الدعوة');
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
    // Normalize JID for lookup
    const normalizedJid = participantJid.includes('@') ? participantJid : `${participantJid}@s.whatsapp.net`;
    const contact = conversations.find(c => c.jid === normalizedJid || c.jid === normalizedJid.split('@')[0] + '@s.whatsapp.net');
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
    <div className="whatsapp-workspace-root whatsapp-theme-transition flex min-h-0 flex-col overflow-hidden">
      <h1 className="sr-only">لوحة تشغيل واتساب</h1>
      <div className="whatsapp-theme-transition flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row border-none rounded-none shadow-none bg-[color:var(--color-card)]">
      {/* Sidebar */}
      <ChatSidebar
        className={cn("wa-panel-sidebar", selectedContact && "max-lg:hidden")}
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
        onOpenLabels={() => setLabelDialogOpen(true)}
        onBulkDelete={handleBulkDeleteChats}
        onDeleteAll={handleDeleteAllChats}
        labels={labels}
      />

      <div className="relative flex min-w-0 flex-1">
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
                toast.success('تم إرسال الرسالة الصوتية');
                // Messages reload automatically via socket or refetch
              } catch (error) {
                toast.error('فشل إرسال الرسالة الصوتية');
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
          onOpenTasks={() => setShowQuickCreateTaskModal(true)}
          onOpenTemplate={handleOpenTemplateDialog}
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
          messagesError={messagesError}
          onRetryMessages={() => refetchMessages()}
        />
        {selectedContact && showRightPanel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 max-lg:block lg:hidden"
              onClick={() => setShowRightPanel(false)}
            />
            <div className="chat-right-panel-container">
              <ChatRightPanel
                contact={selectedContact}
                onOpenOrder={() => setShowQuickOrderModal(true)}
                onOpenTasks={() => setShowQuickCreateTaskModal(true)}
                onClose={() => setShowRightPanel(false)}
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
                    <UiAvatarImage src={contact.profilePicUrl || undefined} />
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
                    <UiAvatarImage src={selectedContact.profilePicUrl || undefined} />
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
                    onClick={() => toast.info('قريباً')}
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
        onClose={() => setShowQuickOrderModal(false)}
        customerName={selectedContact ? getContactName(selectedContact) : undefined}
        customerPhone={selectedContactPhoneNumber || undefined}
        conversationId={selectedContact?.id}
        customerId={selectedContact?.id}
        platform="whatsapp"
        pageName={
          selectedSession && selectedSession !== 'all'
            ? sessions.find(s => s.id === selectedSession)?.name || 'WhatsApp'
            : 'WhatsApp'
        }
        onOrderCreated={(orderId) => {
          toast.success(t('whatsapp.dialogs.orderCreated', { orderId }));
        }}
      />

      <QuickCreateTaskModal
        isOpen={showQuickCreateTaskModal}
        onClose={() => setShowQuickCreateTaskModal(false)}
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
