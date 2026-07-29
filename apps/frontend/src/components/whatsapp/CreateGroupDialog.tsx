import React, { useMemo, useState } from "react";
import { Group, Loader2, Search, Users } from "lucide-react";
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
      tToast.warning("components_CreateGroupDialog.please_name_3daa");
      return;
    }

    if (selectedParticipants.length === 0) {
      tToast.warning("components_CreateGroupDialog.msg_4c38");
      return;
    }

    setCreating(true);
    try {
      const response = await api.post("/whatsapp/groups", {
        sessionId,
        subject,
        participants: selectedParticipants,
      });

      if (response.data.success) {
        tToast.success("components_CreateGroupDialog.success_create_6766");
        onGroupCreated(response.data.group);
        reset();
      }
    } catch (error) {
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
        className="max-w-3xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="text-lg text-[color:var(--color-foreground)]">
            إنشاء مجموعة جديدة
          </DialogTitle>
          <DialogDescription>
            حدّد اسم المجموعة واختر المشاركين الذين تريد إضافتهم من المحادثات الحالية.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-6 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                اسم المجموعة
              </label>
              <div className="relative">
                <Group className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="أدخل اسم المجموعة..."
                  className="h-11 rounded-[18px] bg-white/75 ps-10"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/65 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  المشاركون المختارون
                </p>
                <span className="rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-primary)]">
                  {selectedParticipants.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedParticipants.length > 0 ? (
                  selectedParticipants.map((jid) => {
                    const contact = contacts.find((item) => item.jid === jid);
                    return (
                      <button
                        key={jid}
                        type="button"
                        onClick={() => handleToggleParticipant(jid)}
                        className="rounded-full border border-[color:var(--shell-control-border)] bg-white px-3 py-1.5 text-xs text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
                      >
                        {contact ? getBestContactDisplayName(contact) : getContactDisplayPhone({ jid })}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    اختر أشخاصًا من القائمة لإضافتهم إلى المجموعة.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                جهات الاتصال
              </p>
              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                {filteredContacts.length} نتيجة
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="بحث عن جهات اتصال..."
                className="h-10 rounded-[18px] bg-white/75 ps-10"
              />
            </div>

            <div className="max-h-[24rem] space-y-2 overflow-y-auto rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/65 p-3">
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
                })
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[color:var(--shell-control-border)] bg-white/40 px-4 py-10 text-center">
                  <Users className="mb-3 size-6 text-[color:var(--color-muted-foreground)]" />
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    لا توجد جهات اتصال
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
                    جرّب بحثًا مختلفًا أو اختر من الجلسة الحالية.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={reset} disabled={creating}>
            إلغاء
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !subject.trim() || selectedParticipants.length === 0}
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : null}
            إنشاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
