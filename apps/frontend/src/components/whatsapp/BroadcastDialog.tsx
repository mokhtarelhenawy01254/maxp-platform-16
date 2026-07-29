import React, { useMemo, useState } from "react";
import { Loader2, Megaphone, Search } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { apiClient as api } from "../../services/apiClient";
import {
  getBestContactDisplayName,
  getContactDisplayPhone,
} from "../../pages/whatsapp/whatsappContactDisplay";

interface Contact {
  id: string;
  jid: string;
  name: string | null;
  pushName: string | null;
  profilePicUrl: string | null;
  phoneNumber?: string;
  isGroup: boolean;
}

interface BroadcastDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  contacts: Contact[];
}

const BroadcastDialog: React.FC<BroadcastDialogProps> = ({
  open,
  onClose,
  sessionId,
  contacts,
}) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredContacts = useMemo(
    () =>
      contacts
        .filter(
          (contact) =>
            !contact.isGroup &&
            contact.jid &&
            (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              contact.pushName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (contact.phoneNumber || getContactDisplayPhone(contact)).includes(searchQuery)),
        )
        .filter(
          (contact, index, self) =>
            index === self.findIndex((item) => item.jid === contact.jid),
        ),
    [contacts, searchQuery],
  );

  const reset = () => {
    setSelectedContacts([]);
    setSearchQuery("");
    setMessage("");
    onClose();
  };

  const handleToggleContact = (jid: string) => {
    setSelectedContacts((previous) =>
      previous.includes(jid)
        ? previous.filter((item) => item !== jid)
        : [...previous, jid],
    );
  };

  const handleSendBroadcast = async () => {
    if (selectedContacts.length === 0) {
      tToast.warning("BroadcastDialog.msg_995e");
      return;
    }

    if (!message.trim()) {
      tToast.warning("BroadcastDialog.msg_7386");
      return;
    }

    setLoading(true);
    try {
      await api.post("/whatsapp/broadcast/send", {
        sessionId,
        jids: selectedContacts,
        message,
      });
      toast.success(
        `تم إرسال الرسالة إلى ${selectedContacts.length} جهة اتصال`,
      );
      reset();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error(
        error.response?.data?.error || "فشل إرسال الرسالة الجماعية",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && reset()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-5xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <Megaphone className="size-5 text-[color:var(--color-primary)]" />
            رسالة جماعية
          </DialogTitle>
          <DialogDescription>
            اختر جهات الاتصال المستهدفة واكتب الرسالة ليتم إرسالها بشكل فردي لكل مستلم.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-6 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                المستلمون
              </p>
              <span className="rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-primary)]">
                {selectedContacts.length}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="بحث..."
                className="h-10 rounded-[18px] bg-white/75 ps-10"
              />
            </div>

            <div className="max-h-[26rem] space-y-2 overflow-y-auto rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/65 p-3">
              {filteredContacts.map((contact) => {
                const isSelected = selectedContacts.includes(contact.jid);
                const contactName = getBestContactDisplayName(contact);

                return (
                  <button
                    key={`${contact.id}-${contact.jid}`}
                    type="button"
                    onClick={() => handleToggleContact(contact.jid)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-start transition-all",
                      isSelected
                        ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)]"
                        : "border-[color:var(--shell-control-border)] bg-white/75 hover:bg-white",
                    )}
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar className="size-10">
                      <AvatarImage src={contact.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] font-semibold text-[color:var(--color-primary)]">
                        {contactName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                        {contactName}
                      </p>
                      <p className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                        {getContactDisplayPhone(contact)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              محتوى الرسالة
            </p>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={15}
              placeholder="اكتب رسالتك هنا..."
              className="min-h-[26rem] rounded-[24px] border-[color:var(--shell-control-border)] bg-white/75"
            />
            <p className="text-sm leading-6 text-[color:var(--color-muted-foreground)]">
              سيتم إرسال هذه الرسالة بشكل فردي لكل جهة اتصال مختارة.
            </p>
          </section>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={reset} disabled={loading}>
            إلغاء
          </Button>
          <Button
            onClick={handleSendBroadcast}
            disabled={loading || selectedContacts.length === 0 || !message.trim()}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
            إرسال ({selectedContacts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastDialog;
