import React, { useMemo, useState } from "react";
import { Users, Loader2, Search, X } from "lucide-react";
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

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  contacts: Contact[];
  onGroupCreated: (group: unknown) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  open,
  onClose,
  sessionId,
  contacts,
  onGroupCreated,
}) => {
  const [subject, setSubject] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !contact.isGroup &&
          (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.pushName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (contact.phoneNumber || getContactDisplayPhone(contact)).includes(searchQuery)),
      ),
    [contacts, searchQuery],
  );

  const reset = () => {
    setSubject("");
    setSelectedParticipants([]);
    setSearchQuery("");
    onClose();
  };

  const handleToggleParticipant = (jid: string) => {
    setSelectedParticipants((previous) =>
      previous.includes(jid)
        ? previous.filter((item) => item !== jid)
        : [...previous, jid],
    );
  };

  const handleCreate = async () => {
    if (!subject.trim()) {
      tToast.warning("CreateGroupDialog.please_name_3daa");
      return;
    }

    if (selectedParticipants.length === 0) {
      tToast.warning("CreateGroupDialog.msg_4c38");
      return;
    }

    setCreating(true);
    try {
      const response = await api.post("/whatsapp/groups", {
        sessionId,
        subject,
        participants: selectedParticipants,
      });

      if (response.data?.success) {
        tToast.success("CreateGroupDialog.success_create_6766");
        onGroupCreated(response.data.group);
        reset();
      }
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(
        error.response?.data?.error || "حدث خطأ أثناء إنشاء المجموعة",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && reset()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl gap-0 rounded-2xl border border-border/70 bg-card p-0 text-foreground shadow-2xl overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Users className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                إنشاء مجموعة واتساب جديدة
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                تحديد اسم المجموعة واختيار جهات الاتصال المراد إضافتها
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

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr] max-h-[70vh] overflow-y-auto">
          {/* Group details */}
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                اسم المجموعة
              </label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="أدخل اسم المجموعة الجديد..."
                className="h-9.5 rounded-xl border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  المشاركون المختارون
                </p>
                <span className="font-mono rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                  {selectedParticipants.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                {selectedParticipants.length > 0 ? (
                  selectedParticipants.map((jid) => {
                    const contact = contacts.find((item) => item.jid === jid);
                    return (
                      <button
                        key={jid}
                        type="button"
                        onClick={() => handleToggleParticipant(jid)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shadow-2xs hover:bg-primary/15 transition-colors"
                      >
                        <span>{contact ? getBestContactDisplayName(contact) : getContactDisplayPhone({ jid })}</span>
                        <X className="size-3" />
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    اختر أعضاء من القائمة المقابلة لإضافتهم للمجموعة
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contacts selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                جهات الاتصال
              </p>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {filteredContacts.length} جهة اتصال
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="بحث بالاسم أو الرقم..."
                className="h-9.5 rounded-xl border-border/70 bg-background ps-9 text-xs placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="max-h-[22rem] space-y-1.5 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => {
                  const isSelected = selectedParticipants.includes(contact.jid);
                  const contactName = getBestContactDisplayName(contact);

                  return (
                    <button
                      key={contact.jid}
                      type="button"
                      onClick={() => handleToggleParticipant(contact.jid)}
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
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center">
                  <Users className="mb-2 size-5 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">لا توجد جهات اتصال مطابقة</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={reset}
            disabled={creating}
            className="h-9 rounded-xl border border-border/70 bg-card px-4 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !subject.trim() || selectedParticipants.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>إنشاء المجموعة ({selectedParticipants.length})</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
