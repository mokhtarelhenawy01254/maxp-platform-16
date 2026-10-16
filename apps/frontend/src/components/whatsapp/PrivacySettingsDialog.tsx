import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Search, Shield, X } from "lucide-react";
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
      setBlocklist(response.data?.blocklist || []);
    } catch (error) {
      console.error("Error fetching blocklist:", error);
      tToast.error("PrivacySettingsDialog.failed_fetch_6cd1");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchPrivacySettings = useCallback(async () => {
    try {
      const response = await api.get("/whatsapp/privacy/settings", {
        params: { sessionId },
      });
      if (response.data?.settings) {
        setSettings((prev) => ({
          ...prev,
          ...response.data.settings,
        }));
      }
    } catch (error) {
      console.error("Error fetching privacy settings:", error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      void fetchBlocklist();
      void fetchPrivacySettings();
    }
  }, [fetchBlocklist, fetchPrivacySettings, open, sessionId]);

  const handleBlock = async (jid: string) => {
    try {
      await api.post("/whatsapp/privacy/block", {
        sessionId,
        jid,
        action: "block",
      });
      toast.success("تم حظر جهة الاتصال بنجاح");
      setBlocklist((prev) => [...prev, jid]);
      setBlockSearchQuery("");
    } catch (error) {
      console.error("Error blocking contact:", error);
      toast.error("فشل حظر جهة الاتصال");
    }
  };

  const handleUnblock = async (jid: string) => {
    try {
      await api.post("/whatsapp/privacy/block", {
        sessionId,
        jid,
        action: "unblock",
      });
      toast.success("تم إلغاء الحظر بنجاح");
      setBlocklist((prev) => prev.filter((item) => item !== jid));
    } catch (error) {
      console.error("Error unblocking contact:", error);
      toast.error("فشل إلغاء الحظر");
    }
  };

  const handleUpdateSetting = async (
    key: keyof PrivacySettings,
    value: PrivacySettings[keyof PrivacySettings],
  ) => {
    try {
      await api.post("/whatsapp/privacy/settings", {
        sessionId,
        setting: key,
        value,
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success("تم تحديث إعدادات الخصوصية");
    } catch (error) {
      console.error("Error updating privacy setting:", error);
      toast.error("فشل تحديث الإعداد");
    }
  };

  const blockedContacts = useMemo(
    () =>
      contacts
        .filter((c) => !blocklist.includes(c.jid))
        .filter(
          (c) =>
            c.name?.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
            c.pushName?.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
            c.phoneNumber?.includes(blockSearchQuery) ||
            c.jid.includes(blockSearchQuery),
        ),
    [contacts, blocklist, blockSearchQuery],
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
        className="max-w-2xl gap-0 rounded-2xl border border-border/70 bg-card p-0 text-foreground shadow-2xl overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Shield className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                الخصوصية والأمان لواتساب
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                إدارة قائمة الحظر وإعدادات الظهور ومؤشرات القراءة
              </p>
            </div>
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

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="mb-4 h-9 rounded-xl border border-border/70 bg-muted/30 p-1">
              <TabsTrigger
                value="blocked"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                قائمة المحظورين ({blocklist.length})
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                خيارات الظهور والخصوصية
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blocked" className="space-y-3.5">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-foreground">
                  حظر جهة اتصال جديدة
                </p>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={blockSearchQuery}
                    onChange={(event) => setBlockSearchQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو الرقم لحظر جهة اتصال..."
                    className="h-9.5 rounded-xl border-border/70 bg-background ps-9 text-xs placeholder:text-muted-foreground/60"
                  />
                </div>

                {blockSearchQuery ? (
                  <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pt-1">
                    {blockedContacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">لا توجد جهات اتصال مطابقة</p>
                    ) : (
                      blockedContacts.map((contact) => (
                        <button
                          key={contact.jid}
                          type="button"
                          onClick={() => handleBlock(contact.jid)}
                          className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card p-2 text-start transition-colors hover:bg-muted/40"
                        >
                          <Avatar className="size-8 rounded-lg">
                            <AvatarImage src={contact.profilePicUrl || undefined} />
                            <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                              {getBestContactDisplayName(contact).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">
                              {getBestContactDisplayName(contact)}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                              {getContactDisplayPhone(contact)}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                            <Ban className="size-3.5" />
                            <span>حظر</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="max-h-[18rem] space-y-1.5 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-2">
                {loading ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    جاري تحميل قائمة المحظورين...
                  </div>
                ) : blocklist.length > 0 ? (
                  blocklist.map((jid) => (
                    <div
                      key={jid}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-2.5 transition-colors hover:border-border"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {getBlockedContactLabel(jid)}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {getContactDisplayPhone({ jid })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblock(jid)}
                        className="h-8 rounded-lg border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
                      >
                        إلغاء الحظر
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    لا توجد جهات اتصال محظورة حالياً
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["lastSeen", "آخر ظهور", privacyOptions],
                    ["profilePic", "الصورة الشخصية", privacyOptions],
                    ["status", "الأخبار / الحالة", privacyOptions],
                    ["groupAdd", "إضافة للمجموعات", groupOptions],
                  ] as const
                ).map(([key, label, options]) => (
                  <div
                    key={key}
                    className="space-y-1.5 rounded-xl border border-border/70 bg-card p-3.5"
                  >
                    <label className="text-xs font-semibold text-foreground">
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
                      <SelectTrigger className="h-9 rounded-xl border-border/70 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/70 bg-card">
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      مؤشرات قراءة الرسائل (Read Receipts)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      إظهار علامة الصح الزرقاء المزدوجة عند قراءة الرسائل
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

        <DialogFooter className="flex items-center justify-end border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-border/70 bg-card px-4 text-xs font-medium text-foreground transition-all hover:bg-muted/60 active:scale-[0.98]"
          >
            إغلاق
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacySettingsDialog;
