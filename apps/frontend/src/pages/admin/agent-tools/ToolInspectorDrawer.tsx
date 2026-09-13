import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Zap,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  DownloadCloud,
  Pencil,
  Save,
  X,
  UserPlus,
  ExternalLink,
  Code2,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ToolDefinition,
  AgentDefinition,
  AgentToolInfo,
  getToolGroupMeta,
} from "./types";

interface ToolInspectorDrawerProps {
  tool: ToolDefinition | null;
  open: boolean;
  onClose: () => void;
  equippedAgents: AgentToolInfo[];
  onSaveDescription: (toolName: string, newDesc: string) => Promise<void>;
  onAssignAgents: (tool: ToolDefinition) => void;
  onTestSandbox: (tool: ToolDefinition) => void;
}

export const ToolInspectorDrawer: React.FC<ToolInspectorDrawerProps> = ({
  tool,
  open,
  onClose,
  equippedAgents,
  onSaveDescription,
  onAssignAgents,
  onTestSandbox,
}) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tool) {
      setDesc(tool.description || "");
      setEditing(false);
    }
  }, [tool]);

  if (!tool) return null;

  const groupMeta = getToolGroupMeta(tool.group);
  const isWrite = tool.sideEffects === "write";
  const isEquipped = equippedAgents.length > 0;
  const isSupervised = tool.requiresApproval;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveDescription(tool.name, desc.trim());
      setEditing(false);
      toast.success("تم حفظ وصف الأداة بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل حفظ الوصف");
    } finally {
      setSaving(false);
    }
  };

  // Parse parameters/schema into normalized rows
  const rawParams = tool.schema || tool.parameters || {};
  const properties = rawParams.properties || (typeof rawParams === "object" && !rawParams.type ? rawParams : {});
  const requiredList: string[] = Array.isArray(rawParams.required) ? rawParams.required : [];

  const parameterRows = Object.entries(properties).map(([name, schema]: [string, any]) => {
    const isRequired = requiredList.includes(name) || (typeof schema === "object" && schema?.required === true);
    const type = typeof schema === "object" ? schema?.type || "any" : String(schema || "any");
    const description = typeof schema === "object" ? schema?.description || "-" : "-";
    return { name, type, isRequired, description };
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-r border-border text-foreground"
        dir="rtl"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border text-lg shadow-xs",
                  isEquipped
                    ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                    : isWrite
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                    : "border-border/60 bg-muted/50 text-muted-foreground"
                )}
              >
                <span>{groupMeta.icon}</span>
              </div>

              <div>
                <SheetTitle className="text-left font-mono text-base sm:text-lg font-black tracking-tight" dir="ltr">
                  {tool.name}
                </SheetTitle>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {/* Equipped Status */}
                  {isEquipped ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="size-3" />
                      <span>مجهزة للوكلاء ({equippedAgents.length})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground border border-border">
                      <DownloadCloud className="size-3" />
                      <span>غير مجهزة بعد</span>
                    </span>
                  )}

                  {/* Side-Effect */}
                  {isWrite ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Lock className="size-3" />
                      <span>كتابة وتنفيذ</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      <Unlock className="size-3" />
                      <span>استعلام وقراءة</span>
                    </span>
                  )}

                  {/* Domain Tag */}
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                    {groupMeta.labelAr}
                  </span>

                  {/* Source runtime */}
                  <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[0.65rem] font-mono text-muted-foreground">
                    {tool.source === "mcp" ? "MCP Protocol" : "Python Engine"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Section 1: Tool Description with Inline Edit */}
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-primary" />
                <span>الغرض والوظيفة البرمجية</span>
              </span>

              {!editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="h-6 px-2 text-[0.7rem] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Pencil className="size-3" />
                  <span>تعديل</span>
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2 pt-1">
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="اكتب وصفاً دقيقاً لوظيفة الأداة لتوجيه نموذج الذكاء الاصطناعي بدقة..."
                  rows={3}
                  className="text-xs resize-none"
                  dir="auto"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDesc(tool.description || "");
                      setEditing(false);
                    }}
                    disabled={saving}
                    className="h-7 text-xs"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-7 text-xs gap-1 font-bold"
                  >
                    {saving ? <LoadingSpinner size="sm" /> : <Save className="size-3" />}
                    <span>حفظ التعديل</span>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tool.description || "لا يوجد وصف مسجل لهذه الأداة بعد."}
              </p>
            )}
          </div>

          {/* Section 2: Input Parameters / Schema (Image 1 Style) */}
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Code2 className="size-3.5 text-primary" />
                <span>مخطط المعطيات والمدخلات (Parameters Schema)</span>
              </span>
              <span className="text-[0.7rem] font-mono text-muted-foreground">
                {parameterRows.length} {parameterRows.length === 1 ? "معامل" : "معاملات"}
              </span>
            </div>

            {parameterRows.length > 0 ? (
              <div className="border border-border/60 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/60 text-[0.7rem] font-bold text-muted-foreground">
                      <th className="py-2 px-2.5">المعامل</th>
                      <th className="py-2 px-2.5">النوع</th>
                      <th className="py-2 px-2.5">الإلزام</th>
                      <th className="py-2 px-2.5">الوصف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {parameterRows.map((row) => (
                      <tr key={row.name} className="hover:bg-muted/20 transition-colors text-[0.75rem]">
                        <td className="py-2 px-2.5 font-bold text-foreground" dir="ltr">
                          {row.name}
                        </td>
                        <td className="py-2 px-2.5 text-primary" dir="ltr">
                          {row.type}
                        </td>
                        <td className="py-2 px-2.5">
                          {row.isRequired ? (
                            <span className="rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 text-[0.65rem] font-sans font-bold border border-rose-500/20">
                              إلزامي
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[0.65rem] font-sans">
                              اختياري
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-sans text-muted-foreground text-xs leading-tight">
                          {row.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                هذه الأداة لا تتطلب معاملات إدخال إضافية (Zero-parameter Execution).
              </div>
            )}
          </div>

          {/* Section 3: Equipped Agents & Autonomy Mode */}
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  الوكلاء المجهزون بالأداة ({equippedAgents.length})
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssignAgents(tool)}
                className="h-6 px-2 text-[0.7rem] gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                <UserPlus className="size-3" />
                <span>إدارة التعيين</span>
              </Button>
            </div>

            {equippedAgents.length > 0 ? (
              <div className="space-y-1.5">
                {equippedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => navigate(`/admin/agent-profiles?agent=${agent.id}`)}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 hover:border-border hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{agent.icon || "🤖"}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {agent.name}
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground truncate">
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {agent.autonomy === "blocked" ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-rose-600 border border-rose-500/20">
                          <Lock className="size-2.5" />
                          <span>معطلة</span>
                        </span>
                      ) : agent.autonomy === "approval" ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-amber-600 border border-amber-500/20">
                          <ShieldAlert className="size-2.5" />
                          <span>إشراف بشري</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-emerald-600 border border-emerald-500/20">
                          <Zap className="size-2.5" />
                          <span>ذاتي بالكامل</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                لم يتم تعيين هذه الأداة لأي وكيل حالياً. انقر على &quot;إدارة التعيين&quot; لتفعيلها.
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs h-8 cursor-pointer"
          >
            إغلاق
          </Button>

          <Button
            type="button"
            onClick={() => onTestSandbox(tool)}
            className="text-xs h-8 gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
          >
            <Play className="size-3.5" />
            <span>تشغيل تجريبي في Sandbox</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
