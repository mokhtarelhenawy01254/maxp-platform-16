import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { apiClient } from "../../services/apiClient";
import { useCompanyConfig } from "../../hooks/useCompanyConfig";
import { WhatsAppPageShell } from "./components/WhatsAppPageShell";

const WhatsAppLeadFollowUp: React.FC = () => {
  const { t } = useTranslation();
  const { withCompanyConfig } = useCompanyConfig();

  const [settings, setSettings] = useState<{
    isEnabled: boolean;
    delayHours: number;
    message: string;
    mediaUrl?: string | null;
  } | null>(null);
  const [stats, setStats] = useState<{
    active: number;
    completed: number;
    cancelled: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        apiClient.get("/whatsapp/lead-followup/settings", withCompanyConfig()),
        apiClient.get("/whatsapp/lead-followup/stats", withCompanyConfig()),
      ]);
      setSettings(settingsRes.data.data || null);
      setStats(statsRes.data.data || null);
    } catch {
      toast.error("Failed to load lead follow-up settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiClient.put(
        "/whatsapp/lead-followup/settings",
        settings,
        withCompanyConfig(),
      );
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const statsRes = await apiClient.get(
        "/whatsapp/lead-followup/stats",
        withCompanyConfig(),
      );
      setStats(statsRes.data.data || null);
    } catch {
      toast.error("Failed to refresh stats");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <WhatsAppPageShell
      title="Lead Follow-up"
      subtitle="Automatically follow up with leads who message you on WhatsApp"
      icon={Zap}
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <Users className="size-4" />
                  <span className="text-xs font-medium">Active</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="size-4" />
                  <span className="text-xs font-medium">Completed</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{stats.completed}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="size-4" />
                  <span className="text-xs font-medium">Cancelled</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{stats.cancelled}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Clock className="size-4" />
                  <span className="text-xs font-medium">Total</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          )}

          {/* Settings card */}
          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Zap className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Follow-up Settings</p>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    Configure automatic lead follow-up message
                  </p>
                </div>
              </div>
              {settings && (
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) =>
                      prev ? { ...prev, isEnabled: checked } : prev,
                    )
                  }
                />
              )}
            </div>

            {settings && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Delay after first message</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      className="w-24"
                      value={settings.delayHours}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? { ...prev, delayHours: Number(e.target.value) }
                            : prev,
                        )
                      }
                    />
                    <span className="text-sm text-[color:var(--color-muted-foreground)]">
                      hours
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    Variables: {"{firstName}"}, {"{lastName}"},{" "}
                    {"{customerName}"}
                  </p>
                  <Textarea
                    value={settings.message}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev ? { ...prev, message: e.target.value } : prev,
                      )
                    }
                    rows={4}
                    placeholder="Hi {firstName}, thanks for reaching out! How can I help you today?"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw
                      className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh Stats
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </WhatsAppPageShell>
  );
};

export default WhatsAppLeadFollowUp;
