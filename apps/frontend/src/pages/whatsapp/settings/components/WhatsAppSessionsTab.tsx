import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  Globe,
  Link2,
  Link2Off,
  MoreVertical,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Users,
  XCircle,
  MessageSquareText,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import type { Session, WorkspaceSettings } from "../types/whatsAppSettingsTypes";
import {
  providerLabels,
  statusBadgeClasses,
} from "../types/whatsAppSettingsTypes";
import {
  getStatusText,
  isConnectedStatus,
  isPendingStatus,
  isReconnectingStatus,
} from "../utils/whatsAppSettingsUtils";

interface WhatsAppSessionsTabProps {
  sessions: Session[];
  settings: WorkspaceSettings | null;
  connectingSessionId: string | null;
  onRefresh: () => void;
  onOpenCreateSession: () => void;
  onOpenWebhookDetails: (session: Session | null) => void;
  onConnectSession: (session: Session) => void;
  onDisconnectSession: (sessionId: string) => void;
  onStartEditSession: (session: Session) => void;
  onDeleteSession: (session: Session) => void;
}

export const WhatsAppSessionsTab: React.FC<WhatsAppSessionsTabProps> = ({
  sessions,
  settings,
  connectingSessionId,
  onRefresh,
  onOpenCreateSession,
  onOpenWebhookDetails,
  onConnectSession,
  onDisconnectSession,
  onStartEditSession,
  onDeleteSession,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <div className="space-y-3 sm:space-y-4">
      <WhatsAppSurfaceCard
        title={ts("whatsappSettings.sidebarTitle")}
        description={ts("whatsappSettings.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-muted)] text-xs font-medium gap-1.5"
              onClick={() => {
                const metaSession =
                  sessions.find((s) => s.provider === "META_CLOUD") || null;
                onOpenWebhookDetails(metaSession);
              }}
            >
              <Globe className="size-3.5 text-sky-600 dark:text-sky-400" />
              <span>بيانات Webhook</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
              onClick={onRefresh}
            >
              <RefreshCw className="size-4" />
              {t("whatsappSettings.update")}
            </Button>
            <Button
              className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
              onClick={onOpenCreateSession}
              disabled={sessions.length >= (settings?.maxSessions || 9999)}
            >
              <Plus className="size-4" />
              {t("whatsappSettings.addSession")}
            </Button>
          </div>
        }
      >
        {sessions.length === 0 ? (
          <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
            <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
            <AlertTitle>{t("whatsappSettings.sidebarTitle")}</AlertTitle>
            <AlertDescription>{t("whatsappSettings.noSessions")}</AlertDescription>
          </Alert>
        ) : (
          <div className="divide-y divide-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] sm:divide-y-0 sm:grid sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => {
              const statusValue = (
                session.liveStatus ||
                session.status ||
                "DISCONNECTED"
              ).toUpperCase();
              const phoneLabel =
                session.provider === "META_CLOUD"
                  ? session.metaDisplayPhoneNumber ||
                    session.phoneNumber ||
                    (session.metaPhoneNumberId
                      ? `ID: ${session.metaPhoneNumberId}`
                      : t("whatsappSettings.disconnected"))
                  : session.phoneNumber || t("whatsappSettings.disconnected");

              return (
                <div
                  key={session.id}
                  className="py-4 first:pt-0 last:pb-0 sm:py-5 sm:rounded-3xl sm:border sm:border-[color:var(--shell-control-border)] sm:bg-[color:var(--color-card)] sm:p-5 sm:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <Avatar
                        size="lg"
                        className="bg-primary/10 ring-2 ring-primary/10"
                      >
                        <AvatarFallback className="bg-transparent text-[color:var(--color-primary)]">
                          <Smartphone className="size-5" />
                        </AvatarFallback>
                        <AvatarBadge
                          className={cn(
                            "ring-[color:var(--app-panel-bg)]",
                            isConnectedStatus(statusValue)
                              ? "bg-emerald-500 text-white"
                              : isPendingStatus(statusValue)
                              ? "bg-amber-500 text-white"
                              : isReconnectingStatus(statusValue)
                              ? "bg-violet-500 text-white"
                              : "bg-rose-500 text-white",
                          )}
                        >
                          {isConnectedStatus(statusValue) ? (
                            <CheckCircle2 className="size-3" />
                          ) : isPendingStatus(statusValue) ||
                            isReconnectingStatus(statusValue) ? (
                            <RefreshCw
                              className={`size-3 ${
                                isReconnectingStatus(statusValue)
                                  ? "animate-spin"
                                  : ""
                              }`}
                            />
                          ) : (
                            <XCircle className="size-3" />
                          )}
                        </AvatarBadge>
                      </Avatar>

                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <p className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                            {session.name}
                          </p>
                          {session.isDefault ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200 text-[10px] sm:text-xs font-medium"
                            >
                              {t("whatsappSettings.default")}
                            </Badge>
                          ) : null}
                        </div>
                        <p
                          className="text-xs text-[color:var(--color-muted-foreground)] sm:text-sm font-mono tabular-nums"
                          dir="ltr"
                        >
                          {phoneLabel}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full shrink-0 text-[11px] sm:text-xs font-medium",
                        statusBadgeClasses[
                          statusValue as keyof typeof statusBadgeClasses
                        ] || statusBadgeClasses["DISCONNECTED"],
                      )}
                    >
                      {getStatusText(statusValue, t)}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[11px] sm:text-xs font-medium"
                    >
                      {providerLabels[session.provider || "BAILEYS"]}
                    </Badge>
                    {session.autoReply ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200 text-[11px] sm:text-xs font-medium"
                      >
                        {t("whatsappSettings.dialogs.autoReply")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-[color:var(--color-muted)]/60 px-3 py-2 text-xs sm:mt-4 sm:px-4 sm:py-2.5">
                    <div className="flex items-center gap-1.5 text-[color:var(--color-muted-foreground)]">
                      <Users className="size-3.5 text-primary" />
                      <span>المحادثات:</span>
                      <span className="font-semibold text-[color:var(--color-foreground)] font-mono tabular-nums">
                        {session._count?.contacts || 0}
                      </span>
                    </div>
                    <div className="h-3.5 w-px bg-[color:var(--shell-control-border)]" />
                    <div className="flex items-center gap-1.5 text-[color:var(--color-muted-foreground)]">
                      <MessageSquareText className="size-3.5 text-primary" />
                      <span>الرسائل:</span>
                      <span className="font-semibold text-[color:var(--color-foreground)] font-mono tabular-nums">
                        {session._count?.messages || 0}
                      </span>
                    </div>
                    {session.provider === "META_CLOUD" && (
                      <>
                        <div className="h-3.5 w-px bg-[color:var(--shell-control-border)]" />
                        <button
                          type="button"
                          onClick={() => onOpenWebhookDetails(session)}
                          className="flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
                          title="عرض رابط ورمز التحقق للويب هوك"
                        >
                          <Globe className="size-3.5" />
                          <span>الويب هوك</span>
                        </button>
                      </>
                    )}
                  </div>

                  {session.historyImport &&
                  ["REQUESTED", "IN_PROGRESS"].includes(
                    session.historyImport.status,
                  ) ? (
                    <div className="mt-3 rounded-xl border border-sky-300/60 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:border-sky-500/40 dark:text-sky-100">
                      <div className="flex items-center justify-between gap-3">
                        <span>جاري مزامنة الرسائل</span>
                        <span className="font-mono tabular-nums">
                          {Math.round(session.historyImport.lastProgress || 0)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-950/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                session.historyImport.lastProgress || 0,
                                0,
                              ),
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] pt-3 sm:mt-4 sm:pt-4">
                    {isConnectedStatus(statusValue) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200 text-xs sm:text-sm font-medium h-9"
                        onClick={() => onDisconnectSession(session.id)}
                      >
                        <Link2Off className="size-3.5 ms-1" />
                        {t("whatsappSettings.disconnect")}
                      </Button>
                    ) : isReconnectingStatus(statusValue) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-full border-violet-300/70 bg-violet-500/10 text-violet-800 hover:bg-violet-500/15 dark:border-violet-500/40 dark:text-violet-200 text-xs sm:text-sm font-medium h-9"
                        disabled
                      >
                        <RefreshCw className="size-3.5 ms-1 animate-spin" />
                        {t("whatsappSettings.reconnecting") || "Reconnecting..."}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 rounded-full bg-[color:var(--business-success)] text-white hover:brightness-90 text-xs sm:text-sm font-medium h-9 shadow-sm"
                        onClick={() => onConnectSession(session)}
                        disabled={connectingSessionId === session.id}
                      >
                        {connectingSessionId === session.id ? (
                          <RefreshCw className="size-3.5 ms-1 animate-spin" />
                        ) : (
                          <Link2 className="size-3.5 ms-1" />
                        )}
                        {t("whatsappSettings.connect")}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-muted)] text-xs font-medium h-9 px-3"
                      onClick={() => onStartEditSession(session)}
                    >
                      <Edit className="size-3.5 ms-1" />
                      {t("whatsappSettings.edit")}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] shrink-0"
                          aria-label="خيارات الجلسة"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-2xl p-1.5 shadow-lg border-[color:var(--shell-control-border)]"
                      >
                        <DropdownMenuItem
                          onClick={() => onStartEditSession(session)}
                          className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm py-2 rounded-xl"
                        >
                          <Edit className="size-4 text-[color:var(--color-primary)]" />
                          <span>{t("whatsappSettings.edit")}</span>
                        </DropdownMenuItem>
                        {session.provider === "META_CLOUD" && (
                          <DropdownMenuItem
                            onClick={() => onOpenWebhookDetails(session)}
                            className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm py-2 rounded-xl text-sky-600 focus:text-sky-700"
                          >
                            <Globe className="size-4" />
                            <span>بيانات Webhook</span>
                          </DropdownMenuItem>
                        )}
                        {session.provider === "BAILEYS" &&
                          isConnectedStatus(statusValue) && (
                            <DropdownMenuItem
                              onClick={() => onConnectSession(session)}
                              className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm py-2 rounded-xl"
                            >
                              <RefreshCw className="size-4 text-[color:var(--color-muted-foreground)]" />
                              <span>إعادة المزامنة</span>
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDeleteSession(session)}
                          className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm py-2 rounded-xl text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                        >
                          <Trash2 className="size-4" />
                          <span>{t("whatsappSettings.delete")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WhatsAppSurfaceCard>
    </div>
  );
};
