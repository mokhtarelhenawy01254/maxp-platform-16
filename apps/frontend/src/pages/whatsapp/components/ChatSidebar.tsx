import React, { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ArchiveRestore,
  Ban,
  Camera,
  CheckCheck,
  Filter,
  Loader2,
  Megaphone,
  MessageSquarePlus,
  MoreVertical,
  Pin,
  Search,
  Shield,
  Store,
  Tags,
  Trash2,
  User,
  UserPlus,
  Users,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
        "inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors",
        active
          ? "border-[color:var(--color-primary)] bg-primary/10 text-[color:var(--color-primary)]"
          : "border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)] hover:text-[color:var(--color-foreground)]",
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none",
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
    <div className="space-y-3 p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] px-3 py-3"
        >
          <Skeleton className="size-12 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <aside
      dir={i18n.dir()}
      className={cn(
        "whatsapp-theme-transition relative flex h-full min-h-[34rem] max-h-none max-xl:w-full min-w-0 shrink-0 flex-col overflow-hidden border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_82%,transparent)] bg-[var(--app-panel-bg)] xl:min-h-0 xl:w-[390px] xl:min-w-[360px] xl:border-b-0 xl:border-r",
        className,
      )}
    >
      <div className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] bg-[color:var(--color-muted)] px-3 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenProfile}
            className="rounded-full transition-transform hover:scale-[1.02]"
          >
            <Avatar size="lg" className="shadow-md">
              <AvatarImage src={currentUserProfile?.profilePicUrl || undefined} />
              <AvatarFallback className="bg-primary/10 font-semibold text-[color:var(--color-primary)]">
                {getContactInitials(currentUserProfile?.name || "WA")}
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                {currentUserProfile?.name || "WhatsApp Workspace"}
              </p>
              {showArchived ? (
                <Badge
                  variant="outline"
                  className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-muted-foreground)]"
                >
                  الأرشيف
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[color:var(--color-muted-foreground)]">
              {currentUserProfile?.status ||
                "صندوق تشغيل موحد للجلسات والمحادثات المباشرة."}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenNewChat}
              className="rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
              title="محادثة"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenNewGroup}
              className="rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
              title="مجموعة"
            >
              <UserPlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenBroadcast}
              className="rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
              title="إرسال بث"
            >
              <Megaphone className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenLabels}
              className="rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
              title="التصنيفات"
            >
              <Tags className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
                  title="المزيد"
                  aria-label="المزيد"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={i18n.dir() === "rtl" ? "start" : "end"}
                className="w-60"
              >
                <DropdownMenuLabel>إجراءات مساحة واتساب</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={onOpenNewGroup}
                  className="justify-between"
                >
                  <span>{t("whatsapp.sidebar.newGroup")}</span>
                  <Users className="size-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onOpenProfile}
                  className="justify-between"
                >
                  <span>{t("whatsapp.sidebar.profile")}</span>
                  <User className="size-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onOpenBusinessProfile}
                  className="justify-between"
                >
                  <span>{t("whatsapp.sidebar.settings")}</span>
                  <Store className="size-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onOpenPrivacySettings}
                  className="justify-between"
                >
                  <span>{t("whatsapp.sidebar.settings")}</span>
                  <Shield className="size-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onOpenCheckNumber}
                  className="justify-between"
                >
                  <span>فحص الرقم</span>
                  <Search className="size-4" />
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
        </div>

        {sessionOptions.length > 0 ? (
          <div className="mt-3 flex items-center gap-2">
            <Select value={resolvedSessionValue} onValueChange={onSelectSession}>
              <SelectTrigger className="h-9 min-w-0 flex-1 rounded-xl bg-[var(--whatsapp-surface)] text-xs">
                <SelectValue placeholder={t("whatsapp.sidebar.all")} />
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
            <Badge
              variant="outline"
              className={cn(
                "h-9 shrink-0 gap-1 rounded-xl border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-2 text-[10px]",
                isSelectedSessionConnected ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400",
              )}
            >
              {isSelectedSessionConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {isSelectedSessionConnected ? "متاح" : "يتطلب اتصال"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("whatsapp.sidebar.searchPlaceholder")}
            className="whatsapp-search-input h-11 rounded-xl bg-[var(--whatsapp-surface)] ps-9 pe-11"
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
              "absolute end-1 top-1 rounded-xl",
              filterType === "unread"
                ? "bg-primary/10 text-[color:var(--color-primary)] hover:bg-primary/12"
                : "text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]",
            )}
            title={t("whatsapp.sidebar.unread")}
          >
            <Filter className="size-4" />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-5 gap-1.5">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" onScroll={handleScroll}>
        {filterType === "statuses" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onAddStatus}
              className="flex w-full items-center justify-between rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-elevated)] px-4 py-3 text-start shadow-sm transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
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
                  className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] px-4 py-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
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

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelectContact(contact)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({
                      mouseX: event.clientX + 2,
                      mouseY: event.clientY - 6,
                      contact,
                    });
                  }}
                  className={cn(
                    "min-h-[5.75rem] w-full rounded-3xl border px-3 py-3 text-start transition-all",
                    isSelected
                      ? "border-[color:var(--color-primary)] bg-primary/10 shadow-md"
                      : "border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] hover:bg-[var(--whatsapp-surface-hover)] hover:shadow-sm",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar size="lg">
                      <AvatarImage src={contact.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-primary/8 font-semibold text-[color:var(--color-primary)]">
                        {getContactInitials(contactName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
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
                                className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-muted-foreground)]"
                              >
                                Group
                              </Badge>
                            ) : null}
                            {resolvedSessionValue === "all" ? (
                              <Badge
                                variant="outline"
                                className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[10px] text-[color:var(--color-muted-foreground)]"
                              >
                                {contact.session?.name || "Session"}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                            {getContactDisplayPhone(contact)}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-xs",
                            contact.unreadCount > 0
                              ? "font-medium text-[color:var(--color-primary)]"
                              : "text-[color:var(--color-muted-foreground)]",
                          )}
                        >
                          {formatTime(contact.lastMessageAt)}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="line-clamp-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                          {getLastMessagePreview(contact)}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {contact.isPinned ? (
                            <Pin className="size-3.5 text-[color:var(--color-muted-foreground)]" />
                          ) : null}
                          {contact.isMuted ? (
                            <VolumeX className="size-3.5 text-[color:var(--color-muted-foreground)]" />
                          ) : null}
                          {contact.unreadCount > 0 ? (
                            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                              {contact.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {isLoadingMoreConversations ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-5 animate-spin text-[color:var(--color-muted-foreground)]" />
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
