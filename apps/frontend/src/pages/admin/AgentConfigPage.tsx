import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Scale,
  Puzzle,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Lock,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Skill {
  name: string;
  description: string;
  params: Record<string, string>;
  readOnly: boolean;
  enabled: boolean;
}

interface AgentConfig {
  soul: string;
  rules: string[];
  skills: Skill[];
}

const DEFAULT_SOUL = `أنت CEO Agent — مساعد ذكي متخصص في إدارة الأعمال التجارية.
دورك هو مساعدة صاحب الشركة والمدير في اتخاذ قرارات مبنية على البيانات الفعلية.

شخصيتك:
- تتكلم العربية دائماً بأسلوب مهني وودود ومختصر
- تستخدم الأرقام والإحصائيات عند توفر البيانات
- تقدم توصيات عملية وقابلة للتنفيذ
- تكون صادقاً إذا كانت البيانات غير متاحة`;

const SKILL_GROUPS: Record<string, string> = {
  "order": "الطلبات",
  "product": "المنتجات",
  "customer": "العملاء",
  "inventory": "المخزون",
  "sales": "المبيعات",
  "company": "الشركة",
};

function getGroup(name: string) {
  return SKILL_GROUPS[name.split(".")[0]] || "أخرى";
}

interface SkillCardProps {
  skill: Skill;
  onToggle: (name: string) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onToggle }) => {
  const paramCount = Object.keys(skill.params || {}).length;

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border-[1.5px] p-4 transition-all hover:border-primary hover:opacity-100",
        skill.enabled
          ? "border-primary bg-primary/5"
          : "border-border bg-card opacity-65",
      )}
      onClick={() => onToggle(skill.name)}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mb-1 block font-mono text-[0.72rem] font-semibold",
              skill.enabled ? "text-primary" : "text-muted-foreground/50",
            )}
          >
            {skill.name}
          </span>

          <p className="text-[0.82rem] leading-relaxed">
            {skill.description}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className="h-5 text-[0.65rem]"
            >
              {skill.readOnly ? <Lock className="mr-0.5 size-3" /> : <Pencil className="mr-0.5 size-3" />}
              {skill.readOnly ? "قراءة فقط" : "يعدّل بيانات"}
            </Badge>
            {paramCount > 0 && (
              <Badge
                variant="outline"
                className="h-5 text-[0.65rem]"
              >
                {`${paramCount} معامل`}
              </Badge>
            )}
          </div>
        </div>

        <Switch
          size="sm"
          checked={skill.enabled}
          onCheckedChange={() => onToggle(skill.name)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

import { cn } from "@/lib/utils";

const AgentConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>({ soul: "", rules: [], skills: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl("/ai/agent-config"), {
          headers: tokenManager.createAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setConfig({
            soul: data.soul || "",
            rules: Array.isArray(data.rules) ? data.rules : [],
            skills: Array.isArray(data.skills) ? data.skills : [],
          });
        }
      } catch {
        setError("فشل تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const enabledSkills = config.skills
        .filter((s) => s.enabled)
        .map((s) => s.name);

      const res = await fetch(buildApiUrl("/ai/agent-config"), {
        method: "PUT",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          soul: config.soul,
          rules: config.rules,
          enabledSkills,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "فشل الحفظ");
      toast.success(data.message || "تم الحفظ بنجاح ✅");
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }, [config]);

  const toggleSkill = useCallback((name: string) => {
    setConfig((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.name === name ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  }, []);

  const enabledCount = config.skills.filter((s) => s.enabled).length;
  const totalCount = config.skills.length;

  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setConfig((prev) => ({ ...prev, rules: [...prev.rules, trimmed] }));
    setNewRule("");
  };

  const deleteRule = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx),
    }));
  };

  const groupedSkills = config.skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const g = getGroup(skill.name);
    if (!acc[g]) acc[g] = [];
    acc[g].push(skill);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 md:px-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">إعدادات CEO Agent</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            خصّص شخصية الوكيل، قواعده، والمهارات المسموح له باستخدامها
          </p>
        </div>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-6"
        >
          {saving ? (
            <LoadingSpinner size="sm" color="white" className="mr-2" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>

      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setError(null)}>
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">

        {/* Card 1 — Soul */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-9 bg-primary">
                <AvatarFallback>
                  <Brain className="size-5 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>الشخصية (Soul)</CardTitle>
                <CardDescription>
                  حدّد أسلوب الوكيل وشخصيته ودوره — يُدرج في بداية كل محادثة
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setConfig((p) => ({ ...p, soul: DEFAULT_SOUL }))}
                className="shrink-0"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <Textarea
              rows={6}
              value={config.soul}
              onChange={(e) => setConfig((p) => ({ ...p, soul: e.target.value }))}
              placeholder={DEFAULT_SOUL}
              className="min-h-[144px] leading-relaxed"
              dir="rtl"
            />
            <p className="mt-1 text-xs text-muted-foreground/50">
              {config.soul.length} حرف
            </p>
          </CardContent>
        </Card>

        {/* Card 2 — Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-9 bg-warning">
                <AvatarFallback>
                  <Scale className="size-5 text-warning-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>القواعد (Rules)</CardTitle>
                <CardDescription>
                  قواعد لا يخالفها الوكيل — مثل: لا تشارك بيانات العملاء، أجب بالعربية دائماً
                </CardDescription>
              </div>
              <Badge
                variant={config.rules.length > 0 ? "outline" : "secondary"}
                className="shrink-0"
              >
                {config.rules.length} قاعدة
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {/* Existing rules */}
            <div className="space-y-2">
              {config.rules.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground/50">
                  لا توجد قواعد مخصصة — سيتم استخدام القواعد الافتراضية
                </p>
              ) : (
                config.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border bg-background p-3"
                  >
                    <span className="min-w-6 text-sm font-bold text-warning">
                      {idx + 1}.
                    </span>
                    <span className="flex-1 text-sm leading-relaxed">
                      {rule}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteRule(idx)}
                      className="opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add rule */}
            <div className="flex gap-2">
              <Input
                placeholder="اكتب قاعدة جديدة..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
                dir="rtl"
              />
              <Button
                variant="outline"
                onClick={addRule}
                disabled={!newRule.trim()}
                className="whitespace-nowrap"
              >
                <Plus className="mr-1 size-4" />
                إضافة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-9 bg-success">
                <AvatarFallback>
                  <Puzzle className="size-5 text-success-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>المهارات (Skills)</CardTitle>
                <CardDescription>
                  الأدوات التي يستخدمها الوكيل للوصول إلى بيانات الشركة الحقيقية
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={enabledCount > 0 ? "outline" : "secondary"}
                  className="shrink-0"
                >
                  <CheckCircle2 className="mr-1 size-3.5" />
                  {`${enabledCount} / ${totalCount} مفعّل`}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      skills: p.skills.map((s) => ({ ...s, enabled: true })),
                    }))
                  }
                >
                  تفعيل الكل
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {Object.entries(groupedSkills).map(([group, skills]) => (
              <div key={group} className="mb-6">
                <span className="mb-3 block text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
                  {group}
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {skills.map((skill) => (
                    <SkillCard key={skill.name} skill={skill} onToggle={toggleSkill} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* Bottom save bar */}
      <div className="flex justify-end border-t pt-4">
        <Button
          variant="default"
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-8"
        >
          {saving ? (
            <LoadingSpinner size="sm" color="white" className="mr-2" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saving ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
        </Button>
      </div>
    </div>
  );
};

export default AgentConfigPage;
