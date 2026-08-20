import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

import { Button } from "@/components/ui/button";
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
      toast.success(response.data.message || "╪¬┘à╪¬ ╪º┘ä┘à╪▓╪º┘à┘å╪⌐");
      onSynced?.();
      await loadContacts();
    } catch {
      toast.error("┘ü╪┤┘ä╪¬ ╪º┘ä┘à╪▓╪º┘à┘å╪⌐");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2.5 text-lg text-[color:var(--color-foreground)]">
            <span
              className="inline-flex size-5 rounded-full border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
              style={{ backgroundColor: label?.color || "#25D366" }}
            />
            {label?.name || "╪º┘ä╪¬╪╡┘å┘è┘ü"}
            <span className="rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-primary)]">
              {total}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="╪º╪¿╪¡╪½ ╪¿╪º╪│┘à ╪ú┘ê ╪▒┘é┘à..."
              className="h-11 rounded-[18px] ps-10 bg-white/80"
            />
          </div>

          <ScrollArea className="max-h-[24rem]">
            <div className="space-y-2 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/65 p-3">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                  ╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪º┘ä╪╣┘à┘ä╪º╪í...
                </div>
              ) : contacts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Users className="mx-auto mb-3 size-8 text-[color:var(--color-muted-foreground)]" />
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    ┘ä╪º ┘è┘ê╪¼╪» ╪╣┘à┘ä╪º╪í ╪╣┘ä┘ë ┘ç╪░╪º ╪º┘ä╪¬╪╡┘å┘è┘ü
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                    ╪º╪│╪¬╪«╪»┘à "┘à╪▓╪º┘à┘å╪⌐" ┘ä╪│╪¡╪¿ ╪º┘ä┘é╪º╪ª┘à╪⌐ ┘à┘å ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ┘ê╪¬╪¡╪»┘è╪½ ╪º┘ä╪╣┘à┘ä╪º╪í
                  </p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 rounded-[20px] border border-[color:var(--shell-control-border)] bg-white/75 px-3 py-3"
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={contact.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-primary)_16%,transparent)] to-[color:color-mix(in_srgb,var(--color-primary)_4%,transparent)] text-xs font-semibold text-[color:var(--color-primary)]">
                        {getContactInitials(getContactDisplayName(contact))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                        {getContactDisplayName(contact)}
                      </p>
                      <p className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                        {getContactPhone(contact)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        {formatLastSeen(contact.lastMessageAt)}
                      </p>
                      {contact.isGroup ? (
                        <p className="text-[10px] text-[color:var(--color-muted-foreground)]">
                          ┘à╪¼┘à┘ê╪╣╪⌐
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={onClose}>
            ╪Ñ╪║┘ä╪º┘é
          </Button>
          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
            {syncing ? "╪¼╪º╪▒┘è ╪º┘ä┘à╪▓╪º┘à┘å╪⌐..." : "┘à╪▓╪º┘à┘å╪⌐ ┘à┘å ╪º┘ä┘ê╪º╪¬╪│╪º╪¿"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelContactsDialog;
