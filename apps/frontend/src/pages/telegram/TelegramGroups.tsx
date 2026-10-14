import React, { useState, useEffect } from "react";
import {
  Users2,
  Megaphone,
  Plus,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import TelegramGroupMembersModal from "./TelegramGroupMembersModal";
import TelegramGroupCreateDialog from "./TelegramGroupCreateDialog";

interface TelegramGroupItem {
  id: string;
  telegramId: string;
  userbotConfigId: string;
  title: string;
  username?: string;
  type: "CHANNEL" | "GROUP" | "SUPERGROUP";
  managedByUs?: boolean;
  isPublic?: boolean;
  memberCount?: number;
}

interface UserbotConfig {
  id: string;
  label: string;
}

interface ContactItem {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
}

export default function TelegramGroups() {
  const [groups, setGroups] = useState<TelegramGroupItem[]>([]);
  const [userbots, setUserbots] = useState<UserbotConfig[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openMembersDialog, setOpenMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TelegramGroupItem | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<{
    userbotConfigId: string;
    title: string;
    about: string;
    isPublic: boolean;
    type: "CHANNEL" | "GROUP";
    users: string[];
  }>({
    userbotConfigId: "",
    title: "",
    about: "",
    isPublic: false,
    type: "CHANNEL",
    users: [],
  });

  useEffect(() => {
    fetchUserbots();
    fetchGroups();
    fetchContacts();
  }, []);

  const fetchUserbots = async () => {
    try {
      const r = await apiClient.get("/api/v1/telegram/userbots");
      setUserbots(r.data.data || []);
    } catch {
      /* ignore */
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get("/api/v1/telegram-advanced/groups");
      setGroups(r.data.data || []);
    } catch {
      setError("فشل تحميل المجموعات والقنوات");
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const r = await apiClient.get("/api/v1/telegram-advanced/contacts");
      setContacts(r.data.data || []);
    } catch {
      /* ignore */
    }
  };

  const getTypeLabel = (t: string) =>
    ({ CHANNEL: "قناة", GROUP: "مجموعة", SUPERGROUP: "مجموعة خارقة" }[t] || t);

  const handleViewMembers = async (group: TelegramGroupItem) => {
    setSelectedGroup(group);
    setMembersLoading(true);
    setOpenMembersDialog(true);
    try {
      const r = await apiClient.get(
        `/api/v1/telegram-advanced/groups/${group.userbotConfigId}/${group.telegramId}/members?saveToDb=true`
      );
      setMembers(r.data.members || []);
    } catch {
      setError("فشل تحميل قائمة الأعضاء");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.userbotConfigId || !formData.title.trim()) {
      setError("يرجى اختيار الحساب وتحديد الاسم");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/api/v1/telegram-advanced/groups", formData);
      fetchGroups();
      setOpenDialog(false);
    } catch {
      setError("فشل إنشاء القناة / المجموعة");
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (tabValue === 0) return g.type === "CHANNEL";
    if (tabValue === 1) return g.type === "GROUP" || g.type === "SUPERGROUP";
    return true;
  });

  const channelsCount = groups.filter((g) => g.type === "CHANNEL").length;
  const groupsCount = groups.filter((g) => g.type !== "CHANNEL").length;
  const totalMembers = groups.reduce((a, g) => a + (g.memberCount || 0), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              سجل مجتمعات Telegram
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              TOTAL: {groups.length}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>القنوات: <strong className="text-foreground">{channelsCount}</strong></span>
            <span className="text-border">|</span>
            <span>المجموعات: <strong className="text-foreground">{groupsCount}</strong></span>
            <span className="text-border">|</span>
            <span>إجمالي الأعضاء: <strong className="text-emerald-500">{totalMembers}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Users2 className="w-3.5 h-3.5 text-muted-foreground" />
                المجتمعات والقنوات
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                telegram.groups.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              المجموعات وقنوات Telegram
            </h1>
            <p className="text-xs text-muted-foreground">
              إدارة وتتبع القنوات والمجموعات وفحص سجل الأعضاء ومزامنتهم آلياً
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormData({
                  userbotConfigId: userbots[0]?.id || "",
                  title: "",
                  about: "",
                  isPublic: false,
                  type: "CHANNEL",
                  users: [],
                });
                setOpenDialog(true);
              }}
              disabled={userbots.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              قناة جديدة
            </button>
            <button
              onClick={() => {
                setFormData({
                  userbotConfigId: userbots[0]?.id || "",
                  title: "",
                  about: "",
                  isPublic: false,
                  type: "GROUP",
                  users: [],
                });
                setOpenDialog(true);
              }}
              disabled={userbots.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              مجموعة جديدة
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex gap-2 border-b border-border/70 pb-px text-xs">
          {[
            { v: 0, l: "القنوات", count: channelsCount },
            { v: 1, l: "المجموعات", count: groupsCount },
            { v: 2, l: "الكل", count: groups.length },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTabValue(t.v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium border-b-2 transition-colors ${
                tabValue === t.v
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.l}</span>
              <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-muted/40 text-muted-foreground">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Groups Grid / List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">
              جاري فحص وتحديث قائمة المجموعات والقنوات...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-lg bg-muted/5">
              <Users2 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                لا توجد قنوات أو مجموعات مسجلة في هذا التبويب
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-border/70 bg-card p-4 hover:border-border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {group.title}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-border/70 bg-muted/30 text-muted-foreground">
                      {getTypeLabel(group.type)}
                    </span>
                    {group.managedByUs && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                        مُدار بواسطتنا
                      </span>
                    )}
                    {group.isPublic && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-border/70 bg-muted/20 text-muted-foreground">
                        عام
                      </span>
                    )}
                  </div>
                  {group.username && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      @{group.username}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    الأعضاء: <strong className="text-foreground">{group.memberCount || 0}</strong> عضو
                  </p>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleViewMembers(group)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    عرض الأعضاء
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Dialog for Create Channel / Group */}
        <TelegramGroupCreateDialog
          open={openDialog}
          formData={formData}
          setFormData={setFormData}
          userbots={userbots}
          contacts={contacts}
          loading={loading}
          onClose={() => setOpenDialog(false)}
          onCreate={handleCreate}
        />

        {/* Members Viewer Modal */}
        <TelegramGroupMembersModal
          open={openMembersDialog}
          groupTitle={selectedGroup?.title}
          members={members}
          loading={membersLoading}
          onClose={() => setOpenMembersDialog(false)}
        />
      </div>
    </div>
  );
}