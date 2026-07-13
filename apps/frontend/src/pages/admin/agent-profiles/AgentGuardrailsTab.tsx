import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, AlertTriangle, ShieldCheck, Loader2, Bot, Plus, Trash2, Edit2,
  RefreshCw, X, ShieldAlert, Check, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";
import { useTranslation } from "react-i18next";

interface GuardrailRule {
  id: string;
  agentId: string;
  companyId: string;
  excuse: string;
  rebuttal: string;
  action: string;
  source: "template_default" | "merchant_manual" | "correction_auto";
  isActive: boolean;
}

interface AgentGuardrailsTabProps {
  agentId: string;
  companyId: string;
  agentModel?: string;
  agentProvider?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  appliedGuardrails?: string[];
}

export default function AgentGuardrailsTab({
  agentId,
  companyId,
  agentModel = "gemini-2.5-flash",
  agentProvider = "GOOGLE"
}: AgentGuardrailsTabProps) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [feedbackText, setFeedbackText] = useState("");
  const [editingRule, setEditingRule] = useState<GuardrailRule | null>(null);
  
  // Conflict warning state
  const [conflictWarning, setConflictWarning] = useState<{
    newExcuse: string;
    conflictingRule: { excuse: string; rebuttal: string; action: string };
  } | null>(null);

  // Playground Chat State (Removed sandbox test area)

  // 1. Fetch rules list
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`ai-admin/agents/${agentId}/guardrails`), {
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setRules(data || []);
    } catch (err: any) {
      console.error("Failed to fetch guardrail rules", err);
      setError(err.message || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);



  // 2. Add / Save rule (with conflict check)
  const handleSaveRule = async (bypassConflict = false) => {
    if (!feedbackText.trim()) return;
    setSavingRule(true);

    try {
      // Step A: Run conflict check unless bypassed
      if (!bypassConflict && !editingRule) {
        const checkRes = await fetch(buildApiUrl(`ai-admin/agents/${agentId}/guardrails/conflict-check`), {
          method: "POST",
          headers: {
            ...tokenManager.createAuthHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ feedbackText, companyId })
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.conflictDetected && checkData.conflictingRule) {
            setConflictWarning({
              newExcuse: feedbackText,
              conflictingRule: checkData.conflictingRule
            });
            setSavingRule(false);
            return;
          }
        }
      }

      // Step B: Submit rule creation
      const res = await fetch(buildApiUrl(`ai-admin/agents/${agentId}/guardrails`), {
        method: "POST",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ feedbackText, companyId, source: "merchant_manual" })
      });

      if (!res.ok) throw new Error("Failed to create rule");

      toast.success("تم توليد قاعدة العمل وتفعيلها بنجاح 🛡️");
      setFeedbackText("");
      setConflictWarning(null);
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || "فشلت عملية إنشاء القاعدة");
    } finally {
      setSavingRule(false);
    }
  };

  // 3. Edit structured fields directly
  const handleUpdateRuleFields = async () => {
    if (!editingRule) return;
    setSavingRule(true);

    try {
      const res = await fetch(buildApiUrl(`ai-admin/agents/${agentId}/guardrails/${editingRule.id}`), {
        method: "PUT",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          excuse: editingRule.excuse,
          rebuttal: editingRule.rebuttal,
          action: editingRule.action,
          isActive: editingRule.isActive
        })
      });

      if (!res.ok) throw new Error("Failed to update rule");

      toast.success("تم تحديث تفاصيل قاعدة العمل");
      setEditingRule(null);
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || "فشلت عملية تحديث القاعدة");
    } finally {
      setSavingRule(false);
    }
  };

  // 4. Toggle active status
  const handleToggleRule = async (rule: GuardrailRule) => {
    try {
      const newStatus = !rule.isActive;
      // Optimistic UI update
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newStatus } : r));

      const res = await fetch(buildApiUrl(`ai-admin/agents/${agentId}/guardrails/${rule.id}`), {
        method: "PUT",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (!res.ok) throw new Error();
      toast.success(newStatus ? "تم تفعيل القاعدة" : "تم إلغاء تفعيل القاعدة");
    } catch {
      toast.error("فشل تعديل حالة القاعدة");
      // Rollback
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: rule.isActive } : r));
    }
  };

  // 5. Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف قاعدة العمل هذه نهائياً؟")) return;
    try {
      const res = await fetch(buildApiUrl(`ai-admin/agents/${agentId}/guardrails/${ruleId}`), {
        method: "DELETE",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error();
      toast.success("تم حذف القاعدة");
      fetchRules();
    } catch {
      toast.error("فشل حذف القاعدة");
    }
  };



  return (
    <div className="w-full flex flex-col gap-6 lg:h-[calc(100dvh-280px)] lg:overflow-hidden text-right" dir="rtl">
      
      {/* Rules Management */}
      <div className="w-full flex-1 flex flex-col gap-4 lg:overflow-y-auto pr-1 min-h-0 min-w-0">
        
        {/* Sub-header card */}
        <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              قواعد السلوك والتحكيم الديناميكي
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              قم بضبط محددات عمل الوكيل البشري ومنعه من خرق سياسات المحل كـ (أوقات التسجيل، الأسعار، الحجوزات) من خلال كتابة التوجيهات ببساطة.
            </p>
          </div>
          
          <Button variant="outline" size="sm" onClick={fetchRules} className="shrink-0 flex items-center gap-1.5">
            <RefreshCw className="size-3.5" />
            تحديث القائمة
          </Button>
        </div>

        {/* Add Rule Form */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <Plus className="size-4 text-green-500" />
            إضافة قاعدة جديدة بالعامية أو الفصحى
          </h4>
          
          <div className="flex gap-2">
            <Textarea
              placeholder="مثال: 'ممنوع ندي خصم أكتر من 10% يوم الجمعة' أو 'السبت صالون سيدات فقط فماتحجزش لرجالة'"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="resize-none h-16 text-sm text-right"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  handleSaveRule();
                }
              }}
            />
            <Button
              onClick={() => handleSaveRule(false)}
              disabled={savingRule || !feedbackText.trim()}
              className="h-16 shrink-0 flex flex-col items-center justify-center gap-1 px-4"
            >
              {savingRule ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bot className="size-4" />
              )}
              <span>حفظ وتوليد</span>
            </Button>
          </div>
        </div>

        {/* Rules Table */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="text-sm">جاري تحميل قواعد العمل...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <ShieldAlert className="size-10 text-muted-foreground/60" />
              <div className="text-center">
                <p className="font-semibold text-sm">لا توجد قواعد سلوك مضافة حالياً</p>
                <p className="text-xs mt-1 text-muted-foreground/80">اكتب أول توجيه في الحقل أعلاه لتأمين وتعديل سلوك الوكيل.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 w-1/4">الموقف المحظور (Excuse)</th>
                    <th className="p-3 w-1/4">الرد المنطقي والمانع (Rebuttal)</th>
                    <th className="p-3 w-1/4">التصرف المطلوب (Action)</th>
                    <th className="p-3 text-center">المصدر</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-semibold text-foreground align-top whitespace-pre-wrap">{rule.excuse}</td>
                      <td className="p-3 text-muted-foreground align-top whitespace-pre-wrap">{rule.rebuttal}</td>
                      <td className="p-3 text-muted-foreground align-top whitespace-pre-wrap">{rule.action}</td>
                      <td className="p-3 text-center align-top whitespace-nowrap">
                        {rule.source === "template_default" && (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none">قالب</Badge>
                        )}
                        {rule.source === "merchant_manual" && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-none">يدوي</Badge>
                        )}
                        {rule.source === "correction_auto" && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-none">تعلم</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center align-top">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleRule(rule)}
                        />
                      </td>
                      <td className="p-3 text-center align-top whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:bg-muted"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:bg-red-500/10"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Edit Rule Details */}
      <Dialog open={editingRule !== null} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="max-w-lg text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit2 className="size-5 text-primary" />
              تعديل تفاصيل قاعدة السلوك
            </DialogTitle>
          </DialogHeader>
          
          {editingRule && (
            <div className="flex flex-col gap-4 py-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">الموقف المحظور (Excuse)</label>
                <Textarea
                  value={editingRule.excuse}
                  onChange={(e) => setEditingRule({ ...editingRule, excuse: e.target.value })}
                  className="h-16 text-xs resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">الرد المنطقي والمانع (Rebuttal)</label>
                <Textarea
                  value={editingRule.rebuttal}
                  onChange={(e) => setEditingRule({ ...editingRule, rebuttal: e.target.value })}
                  className="h-20 text-xs resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">التصرف المطلوب (Action)</label>
                <Textarea
                  value={editingRule.action}
                  onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value })}
                  className="h-16 text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingRule(null)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={handleUpdateRuleFields} disabled={savingRule}>
              {savingRule && <Loader2 className="size-3 animate-spin mr-1.5" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Conflict Warning Modal */}
      <Dialog open={conflictWarning !== null} onOpenChange={(open) => !open && setConflictWarning(null)}>
        <DialogContent className="max-w-md text-right border-amber-500/30" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-600 flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              تنبيه تضارب القواعد!
            </DialogTitle>
          </DialogHeader>

          {conflictWarning && (
            <div className="py-3 text-xs leading-relaxed flex flex-col gap-3">
              <p className="font-semibold text-foreground/90">
                لقد وجدنا تشابهاً دلالياً مع قاعدة مسجلة مسبقاً، يرجى مراجعة التضارب أدناه لتفادي ارتباك الذكاء الاصطناعي:
              </p>
              
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-amber-600 dark:text-amber-500">القاعدة القديمة المشابهة:</span>
                  <span className="text-muted-foreground whitespace-pre-wrap">{conflictWarning.conflictingRule.excuse}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-t border-amber-500/10 pt-1.5">
                  <span className="font-bold text-amber-600 dark:text-amber-500">الرد القديم:</span>
                  <span className="text-muted-foreground whitespace-pre-wrap">{conflictWarning.conflictingRule.rebuttal}</span>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg flex flex-col gap-1">
                <span className="font-semibold">توجيهك الجديد المقترح:</span>
                <span className="text-foreground whitespace-pre-wrap">"{conflictWarning.newExcuse}"</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConflictWarning(null)}>
              تعديل المدخل الجديد
            </Button>
            <Button
              variant="destructive"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
              onClick={() => handleSaveRule(true)}
              disabled={savingRule}
            >
              {savingRule && <Loader2 className="size-3 animate-spin mr-1.5" />}
              تجاهل وحفظ القاعدة على أي حال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
