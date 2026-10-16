import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Users, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiClient as api } from "../../services/apiClient";

export interface LabelContactsLabel {
  id: string;
  name: string;
  color: string;
  chatCount?: number;
}

interface LabelContact {
  id: string;
  jid: string;
  phoneNumber: string;
  name?: string | null;
  pushName?: string | null;
  profilePicUrl?: string | null;
  isGroup: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
}

interface LabelContactsDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  label: LabelContactsLabel | null;
  onSynced?: () => void;
}

const getContactInitials = (name?: string | null) => {
  const clean = (name || "").trim();
  if (!clean) return "#";
  return clean.slice(0, 2).toUpperCase();
};

const getContactDisplayName = (contact: LabelContact) =>
  contact.name || contact.pushName || contact.phoneNumber || contact.jid;

const getContactPhone = (contact: LabelContact) =>
  contact.phoneNumber || contact.jid?.split("@")[0] || "";

const formatLastSeen = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const LabelContactsDialog: React.FC<LabelContactsDialogProps> = ({
  open,
  onClose,
  sessionId,
  label,
  onSynced,
}) => {
  const [contacts, setContacts] = useState<LabelContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");

  const loadContacts = useCallback(async () => {
    if (!label || !sessionId) return;
    setLoading(true);
    try {
      const response = await api.get<{
        contacts: LabelContact[];
        total: number;
      }>(`/whatsapp/labels/${label.id}/contacts`, {
        params: { sessionId, page: 1, limit: 200, search },
      });
      setContacts(response.data.contacts || []);
      setTotal(response.data.total || 0);
    } catch {
      tToast.error("LabelsDialog.failed_load_d47f");
    } finally {
      setLoading(false);
    }
  }, [label, sessionId, search]);

  useEffect(() => {
    if (open && label && sessionId) {
      setSearch("");
      void loadContacts();
    }
  }, [open, label, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadContacts();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post<{ message?: string }>(
        "/whatsapp/labels/sync",
        { sessionId },
      );
      toast.success(response.data.message || "تمت المزامنة بنجاح");
      onSynced?.();
      await loadContacts();
    } catch {
      toast.error("فشلت المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-2xl border border-border/70 bg-card p-0 text-foreground shadow-2xl overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-3.5 rounded-full ring-2 ring-border/60"
              style={{ backgroundColor: label?.color || "#25D366" }}
            />
            <DialogTitle className="text-sm font-bold text-foreground">
              {label?.name || "التصنيف"}
            </DialogTitle>
            <span className="font-mono rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
              {total} جهة اتصال
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.97]"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="space-y-3.5 p-5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="h-9.5 rounded-xl border-border/70 bg-background ps-9 text-xs placeholder:text-muted-foreground/60"
            />
          </div>

          <ScrollArea className="max-h-[22rem]">
            <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/20 p-2">
              {loading ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  جاري تحميل العملاء...
                </div>
              ) : contacts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Users className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">
                    لا يوجد عملاء على هذا التصنيف
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    استخدم زر "مزامنة" لسحب القائمة وتحديث جهات الاتصال
                  </p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-2.5 transition-colors hover:bg-muted/40"
                  >
                    <Avatar className="size-8.5 rounded-lg shrink-0">
                      <AvatarImage src={contact.profilePicUrl || undefined} />
                      <AvatarFallback className="rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                        {getContactInitials(getContactDisplayName(contact))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {getContactDisplayName(contact)}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                        {getContactPhone(contact)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatLastSeen(contact.lastMessageAt)}
                      </p>
                      {contact.isGroup ? (
                        <span className="text-[9px] font-semibold text-primary">
                          مجموعة
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-border/70 bg-card px-4 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-card px-4 text-xs font-semibold text-foreground transition-all hover:bg-muted/60 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            <span>{syncing ? "جاري المزامنة..." : "مزامنة من واتساب"}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelContactsDialog;
