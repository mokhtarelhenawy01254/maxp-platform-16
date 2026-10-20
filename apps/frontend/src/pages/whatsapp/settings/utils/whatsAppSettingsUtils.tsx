import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ApiErrorShape, Session } from "../types/whatsAppSettingsTypes";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorShape;
  return apiError?.response?.data?.error || fallback;
}

export function isConnectedStatus(status?: string | null): boolean {
  return status === "connected" || status === "CONNECTED";
}

export function isPendingStatus(status?: string | null): boolean {
  return (
    status === "qr_pending" ||
    status === "QR_PENDING" ||
    status === "pairing_code_pending" ||
    status === "PAIRING_CODE_PENDING"
  );
}

export function isReconnectingStatus(status?: string | null): boolean {
  return status === "reconnecting" || status === "RECONNECTING";
}

export function formatPairingCode(code?: string | null): string {
  return (
    String(code || "")
      .replace(/\s+/g, "")
      .match(/.{1,4}/g)
      ?.join(" ") || ""
  );
}

export function getStatusText(status: string, t: (key: string) => string): string {
  switch (status) {
    case "connected":
    case "CONNECTED":
      return t("whatsappSettings.connected");
    case "qr_pending":
    case "QR_PENDING":
    case "pairing_code_pending":
    case "PAIRING_CODE_PENDING":
      return t("whatsappSettings.pendingQR");
    case "connecting":
    case "CONNECTING":
      return t("whatsappSettings.connecting");
    case "authenticating":
    case "AUTHENTICATING":
      return t("whatsappSettings.authenticating") || "Authenticating...";
    case "reconnecting":
    case "RECONNECTING":
      return t("whatsappSettings.reconnecting") || "Reconnecting...";
    default:
      return t("whatsappSettings.disconnected");
  }
}

export function SettingsToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[color:var(--color-foreground)]">
            {label}
          </p>
          {description ? (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

export function SessionScopeSelector({
  label,
  sessions,
  value,
  onValueChange,
}: {
  label: string;
  sessions: Session[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onValueChange(v ?? "")}>
        <SelectTrigger className="min-w-[15rem] bg-[color:var(--color-card)]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => {
            const isCuid =
              session.name &&
              session.name.length === 25 &&
              /^[a-z0-9]+$/.test(session.name);
            const nameToUse = isCuid ? "جلسة واتساب" : session.name;
            const phone =
              session.metaDisplayPhoneNumber || session.phoneNumber;
            return (
              <SelectItem key={session.id} value={session.id}>
                {phone ? `${nameToUse} (${phone})` : nameToUse}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EmptyScopedSessionAlert({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
      <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
