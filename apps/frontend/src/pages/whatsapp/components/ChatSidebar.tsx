import React, { useEffect, useMemo, useState, useRef } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Ban,
  Camera,
  Check,
  CheckCheck,
  Filter,
  Loader2,
  Megaphone,
  MessageSquarePlus,
  MoreVertical,
  Pin,
  RefreshCw,
  Search,
  Shield,
  Store,
  Tags,
  Trash2,
  User,
  Users,
  VolumeX,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type {
  Contact,
  Session as WhatsAppSession,
} from "../../../hooks/useWhatsAppQueries";
import {
  getBestContactDisplayName,
  getContactDisplayPhone,
  getContactInitials,
  getContactPhoneNumber,
} from "../whatsappContactDisplay";

interface WhatsAppStatus {
  id: string;
  remoteJid: string;
  content?: string;
  mediaUrl?: string;
  timestamp: Date;
  type: string;
}

interface ChatSidebarProps {
  className?: string;
  sessions: WhatsAppSession[];
  conversations: Contact[];
  statuses: WhatsAppStatus[];
  selectedSession: string;
  selectedContact: Contact | null;
  currentUserProfile: {
    name?: string;
    status?: string;
    profilePicUrl?: string;
  } | null;
  isLoadingConversations: boolean;
  isLoadingMoreConversations: boolean;
  hasMoreConversations: boolean;
  isLoadingStatuses: boolean;
  onSelectSession: (sessionId: string) => void;
  onSelectContact: (contact: Contact) => void;
  onOpenProfile: () => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenPrivacySettings: () => void;
  onOpenBusinessProfile: () => void;
  onSyncHistory: () => void;
  isSyncingHistory?: boolean;
  onPinChat: (contact: Contact) => void;
  onArchiveChat: (contact: Contact) => void;
  onDeleteChat: (contact: Contact) => void;
  onBlockContact: (contact: Contact) => void;
  onMuteChat: (contact: Contact) => void;
  onMarkAsRead: (contact: Contact) => void;
  onLoadMore: () => void;
  onAddStatus: () => void;
  onOpenBroadcast: () => void;
  onOpenCheckNumber: () => void;
  onOpenLabels: () => void;
  conversationsError?: boolean;
  onRetryConversations?: () => void;
  // Bulk actions
  onBulkDelete?: (jids: string[], sessionId: string) => void;
  onDeleteAll?: (sessionId?: string) => void;
  // تصنيفات واتساب
  labels?: { id: string; name: string; color: string }[];
}

type SidebarFilter = "all" | "unread" | "groups" | "statuses";

function getContactName(contact: Contact) {
  return getBestContactDisplayName(contact);
}

function getLastMessagePreview(contact: Contact) {
  if (contact.lastMessage?.content) {
    return contact.lastMessage.content;
  }

  switch (contact.lastMessage?.messageType) {
    case "IMAGE":
      return "صورة";
    case "VIDEO":
      return "فيديو";
    case "AUDIO":
      return "رسالة صوتية";
    case "DOCUMENT":
      return "ملف";
    case "LOCATION":
      return "موقع";
    default:
      return "....";
  }
}

function FilterPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 min-w-0 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors",
        active
          ? "border-[color:var(--color-primary)] bg-primary/10 text-[color:var(--color-primary)]"
          : "border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)] hover:text-[color:var(--color-foreground)]",
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          className={cn(
            "inline-flex h-3.5 min-w-3.5 shrink-0 items-center justify-center rounded-full px-0.5 text-[8px] font-semibold leading-none",
            active
              ? "bg-[color:var(--color-primary)]/12 text-[color:var(--color-primary)]"
              : "bg-[var(--whatsapp-surface-muted)] text-[color:var(--color-muted-foreground)]",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-5 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-[color:var(--color-primary)]">
        <Icon className="size-6" />
      </div>
      <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
        {title}
      </p>
      <p className="mt-1 max-w-[22rem] text-sm leading-6 text-[color:var(--color-muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  className,
  sessions,
  conversations,
  statuses,
  selectedSession,
  selectedContact,
  currentUserProfile,
  isLoadingConversations,
  isLoadingMoreConversations,
  hasMoreConversations,
  isLoadingStatuses,
  onSelectSession,
  onSelectContact,
  onOpenProfile,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenPrivacySettings,
  onOpenBusinessProfile,
  onSyncHistory,
  isSyncingHistory = false,
  onPinChat,
  onArchiveChat,
  onDeleteChat,
  onBlockContact,
  onMuteChat,
  onMarkAsRead,
  onLoadMore,
  onAddStatus,
  onOpenBroadcast,
  onOpenCheckNumber,
  onOpenLabels,
  conversationsError,
  onRetryConversations,
  onBulkDelete,
  onDeleteAll,
  labels,
}) => {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [filterType, setFilterType] = useState<SidebarFilter>("all");
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    contact: Contact;
  } | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedJids, setSelectedJids] = useState<Set<string>>(new Set());

  // Swipe-to-action states for mobile
  const [swipedContactId, setSwipedContactId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const swipeTouchStartRef = useRef<number>(0);
  const swipeTouchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  const handleSwipeTouchStart = (e: React.TouchEvent, _contactId: string) => {
    swipeTouchStartRef.current = e.touches[0]!.clientX;
    swipeTouchStartYRef.current = e.touches[0]!.clientY;
    isSwipingRef.current = true;
  };

  const handleSwipeTouchMove = (e: React.TouchEvent, contactId: string) => {
    if (!isSwipingRef.current) return;
    const diffX = e.touches[0]!.clientX - swipeTouchStartRef.current;
    const diffY = Math.abs(e.touches[0]!.clientY - swipeTouchStartYRef.current);
    
    // If scrolling vertically, do not swipe
    if (diffY > 30 && Math.abs(diffX) < 10) {
      isSwipingRef.current = false;
      setSwipeOffset(0);
      setSwipedContactId(null);
      return;
    }

    const isRtl = document.documentElement.dir === 'rtl';
    const limit = 80;
    
    if (isRtl) {
      if (diffX > 0) {
        setSwipedContactId(contactId);
        setSwipeOffset(Math.min(limit, diffX));
      }
    } else {
      if (diffX < 0) {
        setSwipedContactId(contactId);
        setSwipeOffset(Math.max(-limit, diffX));
      }
    }
  };

  const handleSwipeTouchEnd = (_e: React.TouchEvent, _contact: Contact) => {
    isSwipingRef.current = false;
    const isRtl = document.documentElement.dir === 'rtl';
    const threshold = 40;
    
    if (isRtl) {
      if (swipeOffset > threshold) {
        setSwipeOffset(80);
      } else {
        setSwipeOffset(0);
        setSwipedContactId(null);
      }
    } else {
      if (swipeOffset < -threshold) {
        setSwipeOffset(-80);
      } else {
        setSwipeOffset(0);
        setSwipedContactId(null);
      }
    }
  };

  const sessionOptions = useMemo(
    () => sessions.filter((session) => session.id !== "all"),
    [sessions],
  );

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const handleResize = () => setContextMenu(null);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [contextMenu]);

  const formatTime = (dateString: string | null) => {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "HH:mm");
    }
    if (isYesterday(date)) {
      return t("whatsapp.window.yesterday");
    }
    return format(date, "dd/MM/yyyy");
  };

  // خريطة للتصنيفات: labelId -> { name, color }
  const labelsMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    if (labels) {
      labels.forEach(l => map.set(l.id, { name: l.name, color: l.color }));
    }
    return map;
  }, [labels]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(lowerTerm) ||
          contact.pushName?.toLowerCase().includes(lowerTerm) ||
          getContactPhoneNumber(contact).toLowerCase().includes(lowerTerm),
      );
    }

    filtered = filtered.filter(
      (contact) => Boolean(contact.isArchived) === showArchived,
    );

    if (filterType === "unread") {
      filtered = filtered.filter((contact) => contact.unreadCount > 0);
    } else if (filterType === "groups") {
      filtered = filtered.filter((contact) => contact.isGroup);
    }

    return [...filtered].sort((first, second) => {
      if (first.isPinned !== second.isPinned) {
        return first.isPinned ? -1 : 1;
      }

      const firstDate = new Date(first.lastMessageAt || 0).getTime();
      const secondDate = new Date(second.lastMessageAt || 0).getTime();
      return secondDate - firstDate;
    });
  }, [conversations, filterType, searchTerm, showArchived]);

  const unreadCount = useMemo(
    () => conversations.filter((contact) => contact.unreadCount > 0).length,
    [conversations],
  );

  const groupCount = useMemo(
    () => conversations.filter((contact) => contact.isGroup).length,
    [conversations],
  );

  const connectedSessionCount = useMemo(
    () =>
      sessionOptions.filter((session) =>
        ["CONNECTED", "connected"].includes(session.liveStatus || session.status),
      ).length,
    [sessionOptions],
  );

  const selectedSessionMeta = sessionOptions.find((session) => session.id === selectedSession);
  const isSelectedSessionConnected = selectedSessionMeta
    ? ["CONNECTED", "connected"].includes(selectedSessionMeta.liveStatus || selectedSessionMeta.status)
    : connectedSessionCount > 0;

  const resolvedSessionValue = selectedSession || "all";
  const currentMenuContact = contextMenu?.contact ?? null;
  const menuLeft =
    contextMenu && typeof window !== "undefined"
      ? Math.min(contextMenu.mouseX, window.innerWidth - 240)
      : 0;
  const menuTop =
    contextMenu && typeof window !== "undefined"
      ? Math.min(contextMenu.mouseY, window.innerHeight - 280)
      : 0;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    const threshold = 150;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + threshold;

    if (isNearBottom && hasMoreConversations && !isLoadingMoreConversations) {
      onLoadMore();
    }
  };

  const renderLoadingRows = () => (
    <div className="space-y-0 px-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_50%,transparent)] px-3 py-2.5"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <aside
      dir={i18n.dir()}
      className={cn(
        "whatsapp-theme-transition relative flex h-full max-lg:w-full min-w-0 shrink-0 flex-col overflow-hidden border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_82%,transparent)] bg-[var(--app-panel-bg)] lg:min-h-0 lg:w-[390px] lg:min-w-[360px] lg:border-b-0 lg:border-r",
        className,
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] bg-[color:var(--color-muted)] px-3 shrink-0">
        {multiSelectMode ? (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setMultiSelectMode(false);
                  setSelectedJids(new Set());
                }}
                className="size-8 rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
                title="إلغاء"
              >
                <X className="size-4" />
              </Button>
              <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                {selectedJids.size > 0
                  ? `محدد ${selectedJids.size}`
                  : 'اختر المحادثات'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allJids = filteredConversations.map(c => c.jid);
                  if (selectedJids.size === allJids.length) {
                    setSelectedJids(new Set());
                  } else {
                    setSelectedJids(new Set(allJids));
                  }
                }}
                className="h-7 rounded-lg px-2 text-[11px] text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
              >
                {selectedJids.size === filteredConversations.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </Button>
              {selectedJids.size > 0 && onBulkDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const sessionId = selectedSession && selectedSession !== 'all'
                      ? selectedSession
                      : sessionOptions.find(s => s.id !== 'all')?.id || '';
                    if (sessionId) {
                      onBulkDelete(Array.from(selectedJids), sessionId);
                      setMultiSelectMode(false);
                      setSelectedJids(new Set());
                    }
                  }}
                  className="h-7 rounded-lg px-2 text-[11px] text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  حذف
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenProfile}
            className="relative rounded-full transition-transform hover:scale-[1.02]"
          >
            <Avatar className="size-8">
              <AvatarImage src={currentUserProfile?.profilePicUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_16%,transparent)] to-[color:color-mix(in_srgb,var(--color-primary)_4%,transparent)] text-[10px] font-semibold text-[color:var(--color-primary)]">
                {getContactInitials(currentUserProfile?.name || "WA")}
              </AvatarFallback>
            </Avatar>
            {/* Connection status dot */}
            <span
              className={cn(
                "absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-[color:var(--color-muted)]",
                isSelectedSessionConnected ? "bg-emerald-500" : "bg-amber-500",
              )}
              title={isSelectedSessionConnected ? "متاح" : "يتطلب اتصال"}
            />
          </button>
          {showArchived ? (
            <Badge
              variant="outline"
              className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)] px-1.5 py-0"
            >
              الأرشيف
            </Badge>
          ) : null}
          {/* Inline session selector — compact */}
          {sessionOptions.length > 1 ? (
            <Select value={resolvedSessionValue} onValueChange={(v) => v && onSelectSession(v)}>
              <SelectTrigger className="h-7 min-w-0 max-w-[9rem] rounded-lg bg-[var(--whatsapp-surface)] text-[10px] px-2 gap-1">
                <span className="truncate font-medium text-[color:var(--color-foreground)]">
                  {resolvedSessionValue === "all"
                    ? t("whatsapp.sidebar.all")
                    : sessionOptions.find((s) => s.id === resolvedSessionValue)?.name || resolvedSessionValue}
                </span>
              </SelectTrigger>
              <SelectContent align={i18n.dir() === "rtl" ? "start" : "end"}>
                <SelectItem value="all">{t("whatsapp.sidebar.all")}</SelectItem>
                {sessionOptions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenNewChat}
            className="size-8 rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
            title="محادثة"
          >
            <MessageSquarePlus className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
                title="المزيد"
                aria-label="المزيد"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={i18n.dir() === "rtl" ? "start" : "end"}
              className="w-52"
            >
              <DropdownMenuItem
                onClick={onOpenNewGroup}
              >
                <Users className="size-4" />
                <span>{t("whatsapp.sidebar.newGroup")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onSyncHistory}
                disabled={!selectedSession || selectedSession === 'all' || isSyncingHistory}
              >
                <RefreshCw className={cn("size-4", isSyncingHistory && "animate-spin")} />
                <span>{isSyncingHistory ? 'جاري طلب المزامنة' : 'مزامنة الرسائل'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenBroadcast}
              >
                <Megaphone className="size-4" />
                <span>إرسال بث</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenLabels}
              >
                <Tags className="size-4" />
                <span>التصنيفات</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setMultiSelectMode(true);
                  setSelectedJids(new Set());
                }}
              >
                <Trash2 className="size-4" />
                <span>حذف متعدد</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteAll?.()}
              >
                <Trash2 className="size-4 text-rose-600" />
                <span className="text-rose-600">حذف كل المحادثات</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onOpenProfile}
              >
                <User className="size-4" />
                <span>{t("whatsapp.sidebar.profile")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenBusinessProfile}
              >
                <Store className="size-4" />
                <span>{t("whatsapp.sidebar.settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenPrivacySettings}
              >
                <Shield className="size-4" />
                <span>{t("whatsapp.sidebar.settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenCheckNumber}
              >
                <Search className="size-4" />
                <span>فحص الرقم</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(Boolean(checked))}
              >
                {showArchived
                  ? t("whatsapp.sidebar.all")
                  : t("whatsapp.sidebar.archive")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </>
      )}
      </div>

      <div className="wa-glass-search-bar border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] px-2 py-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("whatsapp.sidebar.searchPlaceholder") as string}
              aria-label={t("whatsapp.sidebar.searchPlaceholder") as string}
              className="whatsapp-search-input h-7 rounded-lg bg-[var(--whatsapp-surface)] ps-8 pe-8 text-[11px]"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setFilterType((current) =>
                  current === "unread" ? "all" : "unread",
                )
              }
              className={cn(
                "absolute end-0.5 top-0.5 size-6 rounded-lg",
                filterType === "unread"
                  ? "bg-primary/10 text-[color:var(--color-primary)] hover:bg-primary/12"
                  : "text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]",
              )}
              title={t("whatsapp.sidebar.unread") as string}
            >
              <Filter className="size-3.5" />
            </Button>
          </div>
          {/* Filter pills inline with search on desktop */}
          <div className="wa-filter-strip shrink-0">
            <FilterPill
              active={filterType === "all" && !showArchived}
              label={t("whatsapp.sidebar.all")}
              count={conversations.length}
              onClick={() => { setFilterType("all"); setShowArchived(false); }}
            />
            <FilterPill
              active={filterType === "unread"}
              label={t("whatsapp.sidebar.unread")}
              count={unreadCount}
              onClick={() => { setFilterType("unread"); setShowArchived(false); }}
            />
            <FilterPill
              active={filterType === "groups"}
              label={t("whatsapp.sidebar.groups")}
              count={groupCount}
              onClick={() => { setFilterType("groups"); setShowArchived(false); }}
            />
            <FilterPill
              active={showArchived}
              label={t("whatsapp.sidebar.archive") || "الأرشيف"}
              count={conversations.filter(c => c.isArchived).length}
              onClick={() => { setShowArchived(true); if (filterType === "statuses") setFilterType("all"); }}
            />
            <FilterPill
              active={filterType === "statuses"}
              label={t("whatsapp.sidebar.statuses")}
              count={statuses.length}
              onClick={() => { setFilterType("statuses"); setShowArchived(false); }}
            />
          </div>
        </div>
      </div>

      <div className="wa-slim-scroll wa-safe-bottom min-h-0 flex-1 overflow-y-auto px-space-2 py-space-1 sm:py-space-2" onScroll={handleScroll}>
        {filterType === "statuses" ? (
          <div className="space-y-space-3">
            <button
              type="button"
              onClick={onAddStatus}
              className="flex w-full items-center justify-between rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-elevated)] px-space-4 py-space-3 text-start shadow-soft transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
            >
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {t("whatsapp.sidebar.addStatus")}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                  {t("whatsapp.sidebar.recentUpdates")}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-[color:var(--color-primary)]">
                <Camera className="size-5" />
              </div>
            </button>

            {isLoadingStatuses ? (
              renderLoadingRows()
            ) : statuses.length === 0 ? (
              <EmptyState
                icon={Camera}
                title={t("whatsapp.sidebar.noStatuses")}
                description={t("whatsapp.sidebar.recentUpdates")}
              />
            ) : (
              statuses.map((status) => (
                <article
                  key={status.id}
                  className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] px-space-4 py-space-4 shadow-soft"
                >
                  <div className="flex items-start gap-space-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-[color:var(--color-primary)]">
                      <Camera className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                            {getContactDisplayPhone({ jid: status.remoteJid })}
                          </p>
                        <p className="shrink-0 text-xs text-[color:var(--color-muted-foreground)]">
                          {formatDistanceToNow(new Date(status.timestamp), {
                            addSuffix: true,
                            locale: i18n.language === "ar" ? ar : enUS,
                          })}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                        {status.content || `[${status.type}]`}
                      </p>
                    </div>
                    {status.mediaUrl ? (
                      <img
                        src={status.mediaUrl}
                        alt=""
                        className="size-14 rounded-2xl object-cover"
                      />
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : conversationsError ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <AlertTriangle className="mb-4 size-10 text-rose-500" />
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {t("whatsapp.dialogs.error")}
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
              {t("whatsapp.window.selectChat")}
            </p>
            {onRetryConversations ? (
              <Button
                variant="outline"
                className="mt-4 rounded-full border-[color:var(--shell-control-border)]"
                onClick={onRetryConversations}
              >
                <RefreshCw className="size-4 ml-2" />
                {t("conversations.retry")}
              </Button>
            ) : null}
          </div>
        ) : isLoadingConversations && filteredConversations.length === 0 ? (
          renderLoadingRows()
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("conversations.noConversations")}
            description="جرّب تعديل البحث أو أظهر الأرشيف للعثور على محادثات إضافية."
          />
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((contact) => {
              const contactName = getContactName(contact);
              const isSelected = selectedContact?.id === contact.id;
              const isSwiped = swipedContactId === contact.id;

              const isSelectedInMulti = selectedJids.has(contact.jid);

              return (
                <div key={contact.id} className="relative overflow-hidden rounded-2xl">
                  {/* Action panel underneath */}
                  {!multiSelectMode ? (
                  <div
                    className={cn(
                      "absolute inset-y-0 flex items-center px-4 transition-opacity duration-150",
                      document.documentElement.dir === "rtl" ? "left-0 bg-primary/20 text-[color:var(--color-primary)] rounded-l-2xl" : "right-0 bg-primary/20 text-[color:var(--color-primary)] rounded-r-2xl",
                      isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    style={{ width: '80px' }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveChat(contact);
                        setSwipedContactId(null);
                        setSwipeOffset(0);
                      }}
                      className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-semibold"
                    >
                      <Archive className="size-4" />
                      <span>{contact.isArchived ? "إلغاء" : "أرشفة"}</span>
                    </button>
                  </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      if (multiSelectMode) {
                        setSelectedJids(prev => {
                          const next = new Set(prev);
                          if (next.has(contact.jid)) {
                            next.delete(contact.jid);
                          } else {
                            next.add(contact.jid);
                          }
                          return next;
                        });
                        return;
                      }
                      if (swipedContactId === contact.id) {
                        setSwipedContactId(null);
                        setSwipeOffset(0);
                      } else {
                        onSelectContact(contact);
                      }
                    }}
                    onTouchStart={!multiSelectMode ? (e) => handleSwipeTouchStart(e, contact.id) : undefined}
                    onTouchMove={!multiSelectMode ? (e) => handleSwipeTouchMove(e, contact.id) : undefined}
                    onTouchEnd={!multiSelectMode ? (e) => handleSwipeTouchEnd(e, contact) : undefined}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (multiSelectMode) return;
                      setContextMenu({
                        mouseX: event.clientX + 2,
                        mouseY: event.clientY - 6,
                        contact,
                      });
                    }}
                    className={cn(
                      "wa-conversation-item min-h-[3.25rem] w-full border-b border-t-0 border-x-0 border-[color:color-mix(in_srgb,var(--shell-control-border)_50%,transparent)] px-space-3 py-space-1 text-start transition-all duration-150 sm:min-h-[3.5rem] sm:py-space-2 rounded-none",
                      multiSelectMode && isSelectedInMulti
                        ? "bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]"
                        : !multiSelectMode && isSelected
                        ? "bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-background))]"
                        : "bg-transparent hover:bg-[var(--whatsapp-surface-hover)]",
                    )}
                    style={{
                      transform: !multiSelectMode && isSwiped ? `translateX(${swipeOffset}px)` : 'translateX(0px)',
                    }}
                  >
                    <div className="flex items-center gap-space-3">
                      {multiSelectMode ? (
                        <div className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isSelectedInMulti
                            ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-white"
                            : "border-[color:var(--shell-control-border)]"
                        )}>
                          {isSelectedInMulti ? <Check className="size-3.5" /> : null}
                        </div>
                      ) : null}
                      <Avatar className="size-10 sm:size-10">
                        <AvatarImage src={contact.profilePicUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_16%,transparent)] to-[color:color-mix(in_srgb,var(--color-primary)_4%,transparent)] text-xs font-semibold text-[color:var(--color-primary)]">
                          {getContactInitials(contactName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={cn(
                                  "truncate text-sm text-[color:var(--color-foreground)]",
                                  contact.unreadCount > 0 && "font-semibold",
                                )}
                              >
                                {contactName}
                              </p>
                              {contact.isGroup ? (
                                <Badge
                                  variant="outline"
                                  className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-1.5 text-[9px] uppercase text-[color:var(--color-muted-foreground)]"
                                >
                                  G
                                </Badge>
                              ) : null}
                              {contact.isNewsletter ? (
                                <Badge
                                  variant="outline"
                                  className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-1.5 text-[9px] uppercase text-[color:var(--color-muted-foreground)]"
                                >
                                  {t("whatsapp.window.channel")}
                                </Badge>
                              ) : null}
                              {contact.labels && contact.labels.length > 0 ? (
                                <div className="flex -space-x-1 rtl:space-x-reverse">
                                  {contact.labels.slice(0, 3).map(labelId => {
                                    const labelDef = labelsMap.get(labelId);
                                    return labelDef ? (
                                      <span
                                        key={labelId}
                                        className="inline-block size-2 rounded-full border border-white ring-1 ring-white/50"
                                        style={{ backgroundColor: labelDef.color }}
                                        title={labelDef.name}
                                      />
                                    ) : null;
                                  })}
                                  {contact.labels.length > 3 ? (
                                    <span className="text-[9px] leading-none text-[color:var(--color-muted-foreground)]">
                                      +{contact.labels.length - 3}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <p
                            className={cn(
                              "shrink-0 text-[11px]",
                              contact.unreadCount > 0
                                ? "font-medium text-[color:var(--color-primary)]"
                                : "text-[color:var(--color-muted-foreground)]",
                            )}
                          >
                            {formatTime(contact.lastMessageAt)}
                          </p>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-sm leading-5 text-[color:var(--color-muted-foreground)]">
                            {getLastMessagePreview(contact)}
                          </p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {contact.isPinned ? (
                              <Pin className="size-3 text-[color:var(--color-muted-foreground)]" />
                            ) : null}
                            {contact.isMuted ? (
                              <VolumeX className="size-3 text-[color:var(--color-muted-foreground)]" />
                            ) : null}
                            {contact.unreadCount > 0 ? (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1 py-0.5 text-[10px] font-semibold text-white">
                                {contact.unreadCount}
                              </span>
                            ) : null}
                            {contact.window ? (
                              <span className={cn(
                                "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                contact.window.isOpen
                                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                              )}>
                                <span className="text-[9px]">{contact.window.isOpen ? '⏱' : '✕'}</span>
                                <span>{contact.window.remainingLabel}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}

            {isLoadingMoreConversations ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="size-4 animate-spin text-[color:var(--color-muted-foreground)]" />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {contextMenu ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setContextMenu(null)}
            aria-label="Close menu"
          />
          <div
            className="fixed z-50 w-56 rounded-3xl border border-[color:var(--shell-overlay-border)] bg-[var(--shell-overlay-bg)] p-1.5 shadow-[var(--shell-overlay-shadow)] ring-1 ring-[color:var(--shell-overlay-edge)]"
            style={{ left: menuLeft, top: menuTop }}
            role="menu"
            onKeyDown={(e) => {
              const buttons = e.currentTarget.querySelectorAll('button');
              const current = document.activeElement;
              const currentIdx = Array.from(buttons).indexOf(current as HTMLButtonElement);
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = buttons[currentIdx + 1] || buttons[0];
                (next as HTMLButtonElement)?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = buttons[currentIdx - 1] || buttons[buttons.length - 1];
                (prev as HTMLButtonElement)?.focus();
              }
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (currentMenuContact) {
                  onPinChat(currentMenuContact);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <span>
                {currentMenuContact?.isPinned
                  ? t("whatsapp.sidebar.unpinChat")
                  : t("whatsapp.sidebar.pinChat")}
              </span>
              <Pin className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentMenuContact) {
                  onMarkAsRead(currentMenuContact);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <span>
                {currentMenuContact?.unreadCount
                  ? t("whatsapp.sidebar.read")
                  : t("whatsapp.sidebar.unreadAction")}
              </span>
              <CheckCheck className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentMenuContact) {
                  onMuteChat(currentMenuContact);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <span>
                {currentMenuContact?.isMuted
                  ? t("whatsapp.sidebar.unmute")
                  : t("whatsapp.sidebar.mute")}
              </span>
              <VolumeX className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentMenuContact) {
                  onArchiveChat(currentMenuContact);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              <span>
                {currentMenuContact?.isArchived
                  ? t("whatsapp.sidebar.unarchive")
                  : t("whatsapp.sidebar.archive")}
              </span>
              {currentMenuContact?.isArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentMenuContact) {
                  onDeleteChat(currentMenuContact);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-500/10"
            >
              <span>{t("whatsapp.sidebar.deleteChat")}</span>
              <Trash2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentMenuContact) {
                  onBlockContact(currentMenuContact);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-500/10"
            >
              <span>
                {currentMenuContact?.isBlocked
                  ? t("whatsapp.sidebar.unblock")
                  : t("whatsapp.sidebar.block")}
              </span>
              <Ban className="size-4" />
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
};

ChatSidebar.displayName = "ChatSidebar";

export default ChatSidebar;
