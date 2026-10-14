import React, { useState, useEffect } from "react";
import {
  MessageSquareCode,
  Plus,
  Edit2,
  Trash2,
  Play,
  Square,
  AlertTriangle,
  Bot,
  Sliders,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import TelegramAutoReplyDialog from "./TelegramAutoReplyDialog";

interface AutoReplyRule {
  id: string;
  triggerText: string;
  responseText: string;
  isActive: boolean;
  matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX";
}

interface UserbotConfig {
  id: string;
  label: string;
  clientPhone?: string;
}

export default function TelegramAutoReply() {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [userbots, setUserbots] = useState<UserbotConfig[]>([]);
  const [selectedUserbot, setSelectedUserbot] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<{
    triggerText: string;
    responseText: string;
    isActive: boolean;
    matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX";
  }>({
    triggerText: "",
    responseText: "",
    isActive: true,
    matchType: "EXACT",
  });

  useEffect(() => {
    fetchUserbots();
  }, []);

  useEffect(() => {
    if (selectedUserbot) {
      fetchRules();
    }
  }, [selectedUserbot]);

  const fetchUserbots = async () => {
    try {
      const r = await apiClient.get("/api/v1/telegram/userbots");
      const list = r.data.data || [];
      setUserbots(list);
      if (list.length > 0 && !selectedUserbot) {
        setSelectedUserbot(list[0].id);
      }
    } catch {
      /* ignore */
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiClient.get(
        `/api/v1/telegram-advanced/auto-reply?userbotConfigId=${selectedUserbot}`
      );
      setRules(r.data.data || []);
    } catch {
      setError("فشل تحميل قواعد الرد التلقائي");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.triggerText.trim() || !formData.responseText.trim()) {
      toast.error("يرجى إدخال كلمة التفعيل ونص الرد");
      return;
    }
    setLoading(true);
    try {
      if (editingRule) {
        await apiClient.put(
          `/api/v1/telegram-advanced/auto-reply/${editingRule.id}`,
          formData
        );
      } else {
        await apiClient.post("/api/v1/telegram-advanced/auto-reply", {
          ...formData,
          userbotConfigId: selectedUserbot,
        });
      }
      fetchRules();
      setOpenDialog(false);
      toast.success(editingRule ? "تم تحديث القاعدة بنجاح" : "تم إنشاء القاعدة بنجاح");
    } catch {
      setError("فشل حفظ القاعدة");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;
    try {
      await apiClient.delete(`/api/v1/telegram-advanced/auto-reply/${id}`);
      fetchRules();
      tToast.success("TelegramAutoReply.success_delete_b17d");
    } catch {
      setError("فشل حذف القاعدة");
    }
  };

  const handleToggleActive = async (rule: AutoReplyRule) => {
    try {
      await apiClient.put(`/api/v1/telegram-advanced/auto-reply/${rule.id}`, {
        isActive: !rule.isActive,
      });
      fetchRules();
    } catch {
      setError("فشل تغيير حالة تفعيل القاعدة");
    }
  };

  const getMatchTypeLabel = (m: string) =>
    ({
      EXACT: "تطابق تام",
      CONTAINS: "يحتوي على",
      STARTS_WITH: "يبدأ بـ",
      REGEX: "تعبير منتظم (Regex)",
    }[m] || m);

  const activeRulesCount = rules.filter((r) => r.isActive).length;

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${activeRulesCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              محرك الرد التلقائي: {activeRulesCount > 0 ? "نشط" : "معطل"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              USERBOT: {userbots.find((b) => b.id === selectedUserbot)?.label || "UNSELECTED"}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>إجمالي القواعد: <strong className="text-foreground">{rules.length}</strong></span>
            <span className="text-border">|</span>
            <span>القواعد النشطة: <strong className="text-emerald-500">{activeRulesCount}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                استجابة فورية ذكية
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                telegram.autoreply.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              قواعد الرد التلقائي على Telegram
            </h1>
            <p className="text-xs text-muted-foreground">
              تحديد محفزات الاستجابة الفورية والردود المبرمجة للمحادثات الفردية والجماعية
            </p>
          </div>

          <button
            onClick={() => {
              setEditingRule(null);
              setFormData({
                triggerText: "",
                responseText: "",
                isActive: true,
                matchType: "EXACT",
              });
              setOpenDialog(true);
            }}
            disabled={userbots.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة قاعدة جديدة
          </button>
        </div>

        {/* Userbot Switcher Pill */}
        <div className="bg-muted/10 border border-border/70 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Sliders className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">حساب الـ Userbot المشغّل:</span>
          </div>
          <div className="w-full sm:w-72">
            <select
              value={selectedUserbot}
              onChange={(e) => setSelectedUserbot(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {userbots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} {b.clientPhone ? `(${b.clientPhone})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Rules List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">
              جاري فحص وتحديث قواعد الرد التلقائي...
            </div>
          ) : rules.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-lg bg-muted/5">
              <MessageSquareCode className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                لم يتم إعداد أي قواعد رد تلقائي بعد لهذا الحساب. اضغط "إضافة قاعدة جديدة" للبدء.
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-border/70 bg-card p-4 hover:border-border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground font-mono px-2 py-0.5 rounded bg-muted/40 border border-border/70">
                      "{rule.triggerText}"
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-border/70 bg-muted/20 text-muted-foreground">
                      {getMatchTypeLabel(rule.matchType)}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        rule.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-border/70 bg-muted text-muted-foreground"
                      }`}
                    >
                      {rule.isActive ? "نشط ومفعل" : "معطل"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/10 p-2 rounded border border-border/40 font-mono">
                    {rule.responseText}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors"
                    title={rule.isActive ? "تعطيل القاعدة" : "تفعيل القاعدة"}
                  >
                    {rule.isActive ? <Square className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setFormData({
                        triggerText: rule.triggerText,
                        responseText: rule.responseText,
                        isActive: rule.isActive,
                        matchType: rule.matchType,
                      });
                      setOpenDialog(true);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors"
                    title="تعديل القاعدة"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted/40 rounded transition-colors"
                    title="حذف القاعدة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Dialog for Add/Edit */}
        <TelegramAutoReplyDialog
          open={openDialog}
          editingRule={editingRule}
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          onClose={() => setOpenDialog(false)}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}