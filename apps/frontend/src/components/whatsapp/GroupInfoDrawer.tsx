import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clipboard, Copy, Link, Loader2, LogOut, Pencil, Plus, Save, Shield, ShieldOff, Users, X } from 'lucide-react';
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getBestContactDisplayName,
  getContactDisplayPhone,
} from "../../pages/whatsapp/whatsappContactDisplay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { apiClient as api } from "../../services/apiClient";

interface Participant {
  id: string;
  admin?: "admin" | "superadmin" | null;
}

interface GroupMetadata {
  id: string;
  subject: string;
  desc?: string;
  owner?: string;
  participants: Participant[];
  restrict?: boolean;
  announce?: boolean;
}

interface Contact {
  id: string;
  jid: string;
  name: string | null;
  pushName: string | null;
  profilePicUrl: string | null;
  isGroup?: boolean;
  phoneNumber?: string;
}

interface GroupInfoDrawerProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  groupJid: string;
  contacts: Contact[];
}

function getInitials(value: string) {
  return value.slice(0, 2).toUpperCase();
}

const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  open,
  onClose,
  sessionId,
  groupJid,
  contacts,
}) => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<GroupMetadata | null>(null);
  const [editingSubject, setEditingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<string[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const fetchGroupMetadata = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/whatsapp/groups/${groupJid}`, {
        params: { sessionId },
      });
      if (response.data.success) {
        setMetadata(response.data.metadata);
        setNewSubject(response.data.metadata.subject);
        setNewDesc(response.data.metadata.desc || "");
      }
    } catch (error) {
      console.error("Error fetching group metadata:", error);
      toast.error("فشل جلب بيانات المجموعة");
    } finally {
      setLoading(false);
    }
  }, [groupJid, sessionId]);

  useEffect(() => {
    if (open && sessionId && groupJid) {
      void fetchGroupMetadata();
    }
  }, [fetchGroupMetadata, open, sessionId, groupJid]);

  const getContactName = (jid: string) => {
    const contact = contacts.find(
      (item) => item.jid === jid || item.jid === `${jid.split("@")[0]}@s.whatsapp.net`,
    );
    if (contact) {
      return getBestContactDisplayName(contact);
    }
    return getContactDisplayPhone({ jid });
  };

  const getContactPic = (jid: string) => {
    const contact = contacts.find(
      (item) => item.jid === jid || item.jid === `${jid.split("@")[0]}@s.whatsapp.net`,
    );
    return contact?.profilePicUrl;
  };

  const handleUpdateSetting = async (
    setting: "restrict" | "announce",
    value: boolean,
  ) => {
    try {
      await api.put(`/whatsapp/groups/${groupJid}/settings`, {
        sessionId,
        setting,
        value,
      });
      toast.success("تم تحديث إعدادات المجموعة");
      await fetchGroupMetadata();
    } catch {
      toast.error("فشل تحديث إعدادات المجموعة");
    }
  };

  const fetchInviteCode = async () => {
    try {
      const response = await api.get(`/whatsapp/groups/${groupJid}/invite-code`, {
        params: { sessionId },
      });
      if (response.data.success) {
        setInviteCode(response.data.code);
        setInviteDialogOpen(true);
      }
    } catch {
      toast.error("فشل جلب رابط الدعوة");
    }
  };

  const revokeInviteCode = async () => {
    try {
      await api.post(`/whatsapp/groups/${groupJid}/revoke-invite`, { sessionId });
      toast.success("تم إلغاء رابط الدعوة");
      await fetchInviteCode();
    } catch {
      toast.error("فشل إلغاء رابط الدعوة");
    }
  };

  const handleUpdateSubject = async () => {
    try {
      await api.put(`/whatsapp/groups/${groupJid}/subject`, {
        sessionId,
        subject: newSubject,
      });
      toast.success("تم تحديث اسم المجموعة");
      setEditingSubject(false);
      await fetchGroupMetadata();
    } catch {
      toast.error("فشل تحديث اسم المجموعة");
    }
  };

  const handleUpdateDesc = async () => {
    try {
      await api.put(`/whatsapp/groups/${groupJid}/description`, {
        sessionId,
        description: newDesc,
      });
      toast.success("تم تحديث وصف المجموعة");
      setEditingDesc(false);
      await fetchGroupMetadata();
    } catch {
      toast.error("فشل تحديث وصف المجموعة");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("هل أنت متأكد من مغادرة المجموعة؟")) {
      return;
    }

    try {
      await api.post(`/whatsapp/groups/${groupJid}/leave`, { sessionId });
      toast.success("تم مغادرة المجموعة");
      onClose();
    } catch {
      toast.error("فشل مغادرة المجموعة");
    }
  };

  const handleParticipantAction = async (
    participantId: string,
    action: "remove" | "promote" | "demote",
  ) => {
    try {
      await api.put(`/whatsapp/groups/${groupJid}/participants`, {
        sessionId,
        participants: [participantId],
        action,
      });
      toast.success("تم تنفيذ الإجراء بنجاح");
      await fetchGroupMetadata();
    } catch {
      toast.error("فشل تنفيذ الإجراء");
    }
  };

  const handleAddParticipants = async () => {
    try {
      await api.put(`/whatsapp/groups/${groupJid}/participants`, {
        sessionId,
        participants: selectedContactsToAdd,
        action: "add",
      });
      toast.success("تم إضافة المشاركين");
      setAddParticipantOpen(false);
      setSelectedContactsToAdd([]);
      await fetchGroupMetadata();
    } catch {
      toast.error("فشل إضافة المشاركين");
    }
  };

  const filteredContactsForAdd = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !contact.isGroup &&
          !metadata?.participants.some((participant) => participant.id === contact.jid),
      ),
    [contacts, metadata?.participants],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="right"
          className="w-full max-w-xl border-l border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          {loading && !metadata ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-[color:var(--color-primary)]" />
            </div>
          ) : metadata ? (
            <>
              <SheetHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-6 text-start">
                <div className="flex flex-col items-center gap-4 pt-6">
                  <Avatar className="size-28 shadow-[0_18px_40px_rgba(15,27,45,0.12)]">
                    <AvatarImage />
                    <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] text-2xl font-semibold text-[color:var(--color-primary)]">
                      {getInitials(metadata.subject)}
                    </AvatarFallback>
                  </Avatar>

                  {editingSubject ? (
                    <div className="flex w-full items-center gap-2">
                      <Input
                        value={newSubject}
                        onChange={(event) => setNewSubject(event.target.value)}
                        className="h-11 rounded-[18px] bg-white/75"
                      />
                      <Button onClick={handleUpdateSubject}>
                        <Save className="size-4" />
                      </Button>
                      <Button variant="outline" onClick={() => setEditingSubject(false)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-2xl text-[color:var(--color-foreground)]">
                        {metadata.subject}
                      </SheetTitle>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        onClick={() => setEditingSubject(true)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  )}

                  <SheetDescription>
                    تم الإنشاء بواسطة {getContactName(metadata.owner || "")}
                  </SheetDescription>
                </div>
              </SheetHeader>

              <div className="space-y-6 overflow-y-auto px-6 py-6">
                <section className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      الوصف
                    </p>
                    {!editingDesc ? (
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingDesc(true)}>
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  {editingDesc ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={4}
                        value={newDesc}
                        onChange={(event) => setNewDesc(event.target.value)}
                        className="rounded-[18px] border-[color:var(--shell-control-border)] bg-white/75"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateDesc}>
                          <Save className="size-4" />
                          حفظ
                        </Button>
                        <Button variant="outline" onClick={() => setEditingDesc(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-[18px] bg-white/75 px-3 py-3 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                      {metadata.desc || "لا يوجد وصف"}
                    </p>
                  )}
                </section>

                <section className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
                  <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    معرف المجموعة
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/75 px-3 py-3">
                    <code className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[color:var(--color-foreground)]">
                      {metadata.id}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(metadata.id);
                        toast.success("تم نسخ المعرف");
                      }}
                    >
                      <Copy className="size-4" />
                      نسخ
                    </Button>
                  </div>
                </section>

                <section className="space-y-4 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
                  <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    إعدادات المجموعة
                  </p>
                  <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white/75 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                        إرسال الرسائل
                      </p>
                      <p className="text-xs text-[color:var(--color-muted-foreground)]">
                        السماح للمشرفين فقط بإرسال الرسائل
                      </p>
                    </div>
                    <Switch
                      checked={metadata.announce || false}
                      onCheckedChange={(checked) =>
                        handleUpdateSetting("announce", Boolean(checked))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white/75 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                        تعديل معلومات المجموعة
                      </p>
                      <p className="text-xs text-[color:var(--color-muted-foreground)]">
                        السماح للمشرفين فقط بتعديل الاسم والوصف
                      </p>
                    </div>
                    <Switch
                      checked={metadata.restrict || false}
                      onCheckedChange={(checked) =>
                        handleUpdateSetting("restrict", Boolean(checked))
                      }
                    />
                  </div>
                </section>

                <section className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        المشاركون ({metadata.participants.length})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={fetchInviteCode}>
                        <Link className="size-4" />
                        رابط الدعوة
                      </Button>
                      <Button size="sm" onClick={() => setAddParticipantOpen(true)}>
                        <Plus className="size-4" />
                        إضافة
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {metadata.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-white/75 px-3 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="size-10">
                            <AvatarImage src={getContactPic(participant.id) || undefined} />
                            <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] font-semibold text-[color:var(--color-primary)]">
                              {getInitials(getContactName(participant.id))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                                {getContactName(participant.id)}
                              </p>
                              {participant.admin ? (
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                    participant.admin === "superadmin"
                                      ? "bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] text-[color:var(--color-primary)]"
                                      : "bg-amber-100 text-amber-700",
                                  )}
                                >
                                  {participant.admin === "superadmin" ? "منشئ" : "مشرف"}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {getContactDisplayPhone({ jid: participant.id })}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {participant.admin ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleParticipantAction(participant.id, "demote")}
                                >
                                  <ShieldOff className="size-4" />
                                  إزالة الإشراف
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleParticipantAction(participant.id, "promote")}
                                >
                                  <Shield className="size-4" />
                                  تعيين كمشرف
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleParticipantAction(participant.id, "remove")}
                              >
                                إزالة من المجموعة
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <Button
                  variant="destructive"
                  className="w-full justify-between rounded-[18px]"
                  onClick={handleLeaveGroup}
                >
                  <span>مغادرة المجموعة</span>
                  <LogOut className="size-4" />
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={addParticipantOpen}
        onOpenChange={(nextOpen) => {
          setAddParticipantOpen(nextOpen);
          if (!nextOpen) {
            setSelectedContactsToAdd([]);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <DialogTitle>إضافة مشاركين</DialogTitle>
            <DialogDescription>
              اختر جهات الاتصال التي تريد ضمها للمجموعة الحالية.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[24rem] space-y-2 overflow-y-auto px-6 py-6">
            {filteredContactsForAdd.length > 0 ? (
              filteredContactsForAdd.map((contact) => {
                const isSelected = selectedContactsToAdd.includes(contact.jid);
                const contactName = getContactName(contact.jid);

                return (
                  <button
                    key={contact.jid}
                    type="button"
                    onClick={() =>
                      setSelectedContactsToAdd((previous) =>
                        isSelected
                          ? previous.filter((item) => item !== contact.jid)
                          : [...previous, contact.jid],
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-start transition-all",
                      isSelected
                        ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)]"
                        : "border-[color:var(--shell-control-border)] bg-white/75 hover:bg-white",
                    )}
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={contact.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] font-semibold text-[color:var(--color-primary)]">
                        {getInitials(contactName)}
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
                    {isSelected ? <Check className="size-4 text-[color:var(--color-primary)]" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                لا توجد جهات اتصال متاحة للإضافة
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
            <Button variant="outline" onClick={() => setAddParticipantOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddParticipants} disabled={selectedContactsToAdd.length === 0}>
              إضافة ({selectedContactsToAdd.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
        >
          <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
            <DialogTitle>رابط الدعوة للمجموعة</DialogTitle>
            <DialogDescription>
              أرسل هذا الرابط لمن تريد ضمّه إلى المجموعة الحالية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-white/75 px-4 py-4 text-center">
              <code className="break-all text-sm text-[color:var(--color-foreground)]">
                {inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : "..." }
              </code>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (inviteCode) {
                    navigator.clipboard.writeText(`https://chat.whatsapp.com/${inviteCode}`);
                    toast.success("تم نسخ الرابط");
                  }
                }}
              >
                <Copy className="size-4" />
                نسخ الرابط
              </Button>
              <Button variant="destructive" onClick={revokeInviteCode}>
                إلغاء الرابط الحالي
              </Button>
            </div>
          </div>

          <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GroupInfoDrawer;
