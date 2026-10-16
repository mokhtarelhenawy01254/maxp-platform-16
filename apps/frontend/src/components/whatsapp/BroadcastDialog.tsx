import React, { useMemo, useState } from "react";
import { Loader2, Megaphone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.jid));
    }
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
        `تم إرسال الرسالة إلى ${selectedContacts.length} جهة اتصال بنجاح`,
      );
      reset();
    } catch (error: any) {
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
        className="max-w-4xl gap-0 rounded-2xl border border-border/70 bg-card p-0 text-foreground shadow-2xl overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Megaphone className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                إرسال رسالة جماعية (Broadcast)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                إرسال رسالة مخصصة بشكل فردي لجهات الاتصال المحددة عبر واتساب
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.97]"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr] max-h-[70vh] overflow-y-auto">
          {/* Contacts selector */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-foreground">جهات الاتصال المستهدفة</p>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {selectedContacts.length === filteredContacts.length
                    ? "إلغاء التحديد"
                    : "تحديد الكل"}
                </button>
              </div>
              <span className="font-mono rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {selectedContacts.length} من {filteredContacts.length}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="بحث بالاسم أو رقم الهاتف..."
                className="h-9.5 rounded-xl border-border/70 bg-background ps-9 text-xs placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="max-h-[22rem] space-y-1.5 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-2">
              {filteredContacts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">لا توجد جهات اتصال مطابقة</p>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.includes(contact.jid);
                  const contactName = getBestContactDisplayName(contact);

                  return (
                    <button
                      key={`${contact.id}-${contact.jid}`}
                      type="button"
                      onClick={() => handleToggleContact(contact.jid)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-start transition-all duration-150 active:scale-[0.99]",
                        isSelected
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/60 bg-card hover:bg-muted/40",
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar className="size-8.5 rounded-lg">
                        <AvatarImage src={contact.profilePicUrl || undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                          {contactName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {contactName}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                          {getContactDisplayPhone(contact)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Message content */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-foreground">نص الرسالة</p>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={11}
              placeholder="اكتب رسالتك الترويجية أو التنبيهية هنا..."
              className="min-h-[19rem] rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>يتم الإرسال بصورة شخصية لكل مستلم على حدة</span>
              <span className="font-mono tabular-nums">{message.length} حرف</span>
            </div>
          </section>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={reset}
            disabled={loading}
            className="h-9 rounded-xl border border-border/70 bg-card px-4 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={loading || selectedContacts.length === 0 || !message.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Megaphone className="size-3.5" />
            )}
            <span>إرسال ({selectedContacts.length})</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastDialog;
