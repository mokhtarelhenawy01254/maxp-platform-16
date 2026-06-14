import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Search, Shield } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

interface PrivacySettingsDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  contacts: Contact[];
}

interface PrivacySettings {
  readReceipts: boolean;
  lastSeen: "all" | "contacts" | "contact_blacklist" | "none";
  profilePic: "all" | "contacts" | "contact_blacklist" | "none";
  status: "all" | "contacts" | "contact_blacklist" | "none";
  online: "all" | "match_last_seen";
  groupAdd: "all" | "contacts" | "contact_blacklist";
}

const privacyOptions = [
  { value: "all", label: "الكل" },
  { value: "contacts", label: "جهات اتصالي" },
  { value: "contact_blacklist", label: "جهات اتصالي باستثناء..." },
  { value: "none", label: "لا أحد" },
] as const;

const groupOptions = [
  { value: "all", label: "الكل" },
  { value: "contacts", label: "جهات اتصالي" },
  { value: "contact_blacklist", label: "جهات اتصالي باستثناء..." },
] as const;

const PrivacySettingsDialog: React.FC<PrivacySettingsDialogProps> = ({
  open,
  onClose,
  sessionId,
  contacts,
}) => {
  const [tabValue, setTabValue] = useState("blocked");
  const [loading, setLoading] = useState(false);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [settings, setSettings] = useState<PrivacySettings>({
    readReceipts: true,
    lastSeen: "all",
    profilePic: "all",
    status: "all",
    online: "all",
    groupAdd: "all",
  });
  const [blockSearchQuery, setBlockSearchQuery] = useState("");

  const fetchBlocklist = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/whatsapp/privacy/blocklist", {
        params: { sessionId },
      });
      setBlocklist(response.data.blocklist || []);
    } catch (error) {
      console.error("Error fetching blocklist:", error);
      toast.error("فشل جلب قائمة المحظورين");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchPrivacySettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/whatsapp/privacy/settings", {
        params: { sessionId },
      });
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error("Error fetching privacy settings:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      if (tabValue === "blocked") {
        void fetchBlocklist();
      } else {
        void fetchPrivacySettings();
      }
    }
  }, [fetchBlocklist, fetchPrivacySettings, open, sessionId, tabValue]);

  const handleUnblock = async (jid: string) => {
    try {
      await api.post("/whatsapp/contacts/unblock", { sessionId, jid });
      toast.success("تم إلغاء الحظر بنجاح");
      await fetchBlocklist();
    } catch {
      toast.error("فشل إلغاء الحظر");
    }
  };

  const handleBlock = async (jid: string) => {
    try {
      await api.post("/whatsapp/contacts/block", { sessionId, jid });
      toast.success("تم الحظر بنجاح");
      setBlockSearchQuery("");
      await fetchBlocklist();
    } catch {
      toast.error("فشل الحظر");
    }
  };

  const handleUpdateSetting = async (
    key: keyof PrivacySettings,
    value: PrivacySettings[keyof PrivacySettings],
  ) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    try {
      await api.post("/whatsapp/privacy/settings", {
        sessionId,
        setting: key,
        value,
      });
      toast.success("تم تحديث الإعدادات");
    } catch {
      toast.error("فشل تحديث الإعدادات");
      await fetchPrivacySettings();
    }
  };

  const blockedContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !blocklist.includes(contact.jid) &&
          (contact.name?.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
            contact.pushName?.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
            contact.phoneNumber?.includes(blockSearchQuery)),
      ),
    [blockSearchQuery, blocklist, contacts],
  );

  const getBlockedContactLabel = (jid: string) => {
    const contact = contacts.find(
      (item) => item.jid === jid || item.jid === `${jid.split("@")[0]}@s.whatsapp.net`,
    );
    return contact
      ? getBestContactDisplayName(contact)
      : getContactDisplayPhone({ jid });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <Shield className="size-5 text-[color:var(--color-primary)]" />
            الخصوصية والأمان
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList variant="line" className="mb-4 w-full justify-start rounded-none p-0">
              <TabsTrigger value="blocked">قائمة المحظورين</TabsTrigger>
              <TabsTrigger value="settings">إعدادات الخصوصية</TabsTrigger>
            </TabsList>

            <TabsContent value="blocked" className="space-y-4">
              <div className="rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
                <p className="mb-3 text-sm font-semibold text-[color:var(--color-foreground)]">
                  حظر جهة اتصال جديدة
                </p>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                  <Input
                    value={blockSearchQuery}
                    onChange={(event) => setBlockSearchQuery(event.target.value)}
                    placeholder="بحث عن جهة اتصال لحظرها..."
                    className="h-10 rounded-[18px] bg-white/80 ps-10"
                  />
                </div>

                {blockSearchQuery ? (
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                    {blockedContacts.map((contact) => (
                      <button
                        key={contact.jid}
                        type="button"
                        onClick={() => handleBlock(contact.jid)}
                        className="flex w-full items-center gap-3 rounded-[18px] border border-[color:var(--shell-control-border)] bg-white px-3 py-2 text-start transition-colors hover:bg-[color:var(--shell-control-hover)]"
                      >
                        <Avatar className="size-9">
                          <AvatarImage src={contact.profilePicUrl || undefined} />
                          <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] font-semibold text-[color:var(--color-primary)]">
                            {getBestContactDisplayName(contact).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                            {getBestContactDisplayName(contact)}
                          </p>
                          <p className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                            {getContactDisplayPhone(contact)}
                          </p>
                        </div>
                        <Ban className="size-4 text-rose-600" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="max-h-[22rem] space-y-2 overflow-y-auto rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/65 p-3">
                {loading ? (
                  <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                    جاري تحميل قائمة المحظورين...
                  </div>
                ) : blocklist.length > 0 ? (
                  blocklist.map((jid) => (
                    <div
                      key={jid}
                      className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--shell-control-border)] bg-white/75 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                          {getBlockedContactLabel(jid)}
                        </p>
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          {getContactDisplayPhone({ jid })}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => handleUnblock(jid)}>
                        إلغاء الحظر
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                    لا توجد جهات اتصال محظورة
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["lastSeen", "آخر ظهور", privacyOptions],
                    ["profilePic", "الصورة الشخصية", privacyOptions],
                    ["status", "الأخبار", privacyOptions],
                    ["groupAdd", "المجموعات", groupOptions],
                  ] as const
                ).map(([key, label, options]) => (
                  <div
                    key={key}
                    className="space-y-2 rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4"
                  >
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                      {label}
                    </label>
                    <Select
                      value={settings[key]}
                      onValueChange={(value) =>
                        handleUpdateSetting(
                          key,
                          value as PrivacySettings[typeof key],
                        )
                      }
                    >
                      <SelectTrigger className="bg-white/75">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      مؤشرات قراءة الرسائل
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      فعّل أو عطّل إيصالات القراءة للمحادثات الفردية.
                    </p>
                  </div>
                  <Switch
                    checked={settings.readReceipts}
                    onCheckedChange={(checked) =>
                      handleUpdateSetting("readReceipts", Boolean(checked))
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacySettingsDialog;
