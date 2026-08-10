/**
 * @module FlowCanvas
 * @description Flow editor — drag-to-reorder step nodes with a live
 * WhatsApp message preview. Uses @dnd-kit. Styled with the platform's
 * unified design tokens (shadcn / Tailwind).
 */

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FlowStep {
  id?: string;
  delayDays: number;
  content: string;
  mediaUrl?: string;
  stepOrder: number;
}

interface FlowCanvasProps {
  steps: FlowStep[];
  isAdmin: boolean;
  onReorder: (next: FlowStep[]) => void;
  onEdit: (step: FlowStep) => void;
  onAdd: () => void;
  onDelete: (step: FlowStep) => void;
  showPreview?: boolean;
  onOpenCopilot?: () => void;
}

const variableReplacements: Record<string, string> = {
  "{firstName}": "أحمد",
  "{lastName}": "محمد",
  "{orderNumber}": "ORD-2024",
  "{totalPrice}": "1,250 ج.م",
};

function applyVariables(content: string): string {
  return Object.entries(variableReplacements).reduce(
    (acc, [token, value]) => acc.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value),
    content,
  );
}

function sortStepOrder(steps: FlowStep[]): FlowStep[] {
  return steps
    .slice()
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((step, index) => ({ ...step, stepOrder: index + 1 }));
}

// ─────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────

type ValidationSeverity = "error" | "warning";

interface FlowIssue {
  stepId?: string;
  severity: ValidationSeverity;
  message: string;
}

const MAX_DELAY_DAYS = 30;
const MAX_MESSAGE_LENGTH = 1024;

function validateFlow(steps: FlowStep[]): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const seenContent = new Map<string, number>();

  steps.forEach((step, index) => {
    if (!step.content || !step.content.trim()) {
      issues.push({
        stepId: step.id,
        severity: "error",
        message: `Step ${index + 1} has no message content`,
      });
    }

    if (step.content && step.content.length > MAX_MESSAGE_LENGTH) {
      issues.push({
        stepId: step.id,
        severity: "warning",
        message: `Step ${index + 1} is ${step.content.length} characters — risk of truncation`,
      });
    }

    if (step.delayDays > MAX_DELAY_DAYS) {
      issues.push({
        stepId: step.id,
        severity: "warning",
        message: `Step ${index + 1} has a ${step.delayDays}-day delay — consider splitting the flow`,
      });
    }

    if (step.content) {
      const normalized = step.content.trim().toLowerCase();
      const previous = seenContent.get(normalized) ?? -1;
      if (previous >= 0) {
        issues.push({
          stepId: step.id,
          severity: "warning",
          message: `Step ${index + 1} duplicates step ${previous + 1}`,
        });
      } else {
        seenContent.set(normalized, index);
      }
    }

    if (step.content) {
      const opens = (step.content.match(/\{/g) || []).length;
      const closes = (step.content.match(/\}/g) || []).length;
      if (opens !== closes) {
        issues.push({
          stepId: step.id,
          severity: "error",
          message: `Step ${index + 1} has unmatched variable braces`,
        });
      }
    }
  });

  return issues;
}

export function FlowCanvas({
  steps,
  isAdmin,
  onReorder,
  onEdit,
  onAdd,
  onDelete,
  showPreview: showPreviewProp = true,
  onOpenCopilot,
}: FlowCanvasProps) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(showPreviewProp);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const orderedSteps = useMemo(() => sortStepOrder(steps), [steps]);
  const issues = useMemo(() => validateFlow(orderedSteps), [orderedSteps]);
  const issueByStepId = useMemo(() => {
    const map = new Map<string, FlowIssue[]>();
    issues.forEach((issue) => {
      if (issue.stepId) {
        const list = map.get(issue.stepId) || [];
        list.push(issue);
        map.set(issue.stepId, list);
      }
    });
    return map;
  }, [issues]);
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedSteps.findIndex(
        (s) => (s.id || `idx-${s.stepOrder}`) === active.id,
      );
      const newIndex = orderedSteps.findIndex(
        (s) => (s.id || `idx-${s.stepOrder}`) === over.id,
      );
      if (oldIndex < 0 || newIndex < 0) return;

      const next = arrayMove(orderedSteps, oldIndex, newIndex);
      onReorder(sortStepOrder(next));
    },
    [orderedSteps, onReorder],
  );

  const activePreviewStep = useMemo((): FlowStep | null => {
    if (!orderedSteps.length) return null;
    if (hoveredStepId) {
      return (
        orderedSteps.find((s) => (s.id || `idx-${s.stepOrder}`) === hoveredStepId) ??
        orderedSteps[0] ??
        null
      );
    }
    return orderedSteps[0] ?? null;
  }, [orderedSteps, hoveredStepId]);

  return (
    <div
      className="grid gap-0 overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]"
      style={{
        gridTemplateColumns: previewOpen ? "minmax(0,1.4fr) minmax(0,1fr)" : "1fr",
      }}
    >
      {/* LEFT: Step nodes */}
      <div
        className="p-4 sm:p-5"
        style={{
          borderInlineEnd: previewOpen
            ? "1px solid color-mix(in srgb, var(--shell-control-border) 60%, transparent)"
            : "0",
        }}
      >
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              {t("whatsappJourney.steps.timelineCount", {
                count: orderedSteps.length,
              })}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-foreground)]">
              {t("whatsappJourney.steps.buildSequence")}
            </h3>
            <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
              {isAdmin
                ? t("whatsappJourney.steps.dragHint")
                : t("whatsappJourney.steps.readonlyHint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {orderedSteps.length > 0 && (
              <ValidationBadge
                errorCount={errorCount}
                warningCount={warningCount}
                issues={issues}
              />
            )}
            {onOpenCopilot && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCopilot}
                title={`${t("whatsappJourney.copilot.open")} (⌘K)`}
              >
                <Sparkles className="size-3.5" />
                {t("whatsappJourney.copilot.title")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              {previewOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {previewOpen
                ? t("whatsappJourney.steps.hidePreview")
                : t("whatsappJourney.steps.showPreview")}
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="size-3.5" />
                {t("whatsappJourney.steps.add")}
              </Button>
            )}
          </div>
        </div>

        {orderedSteps.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedSteps.map((s) => s.id || `idx-${s.stepOrder}`)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="m-0 flex list-none flex-col gap-0 p-0">
                {orderedSteps.map((step, index) => {
                  const stepKey = step.id || `idx-${step.stepOrder}`;
                  return (
                    <SortableStep
                      key={stepKey}
                      step={step}
                      index={index}
                      isLast={index === orderedSteps.length - 1}
                      isAdmin={isAdmin}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onHover={(id) => setHoveredStepId(id)}
                      onHoverEnd={() => setHoveredStepId(null)}
                      issues={issueByStepId.get(stepKey) || []}
                    />
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>
        ) : (
          <FlowEmptyState onAdd={onAdd} isAdmin={isAdmin} />
        )}
      </div>

      {/* RIGHT: Live WhatsApp preview */}
      {previewOpen && (
        <div className="bg-[color:color-mix(in_srgb,var(--color-muted)_50%,var(--color-background))] p-4 sm:p-5">
          <WhatsAppPreviewPane step={activePreviewStep} totalSteps={orderedSteps.length} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

interface SortableStepProps {
  step: FlowStep;
  index: number;
  isLast: boolean;
  isAdmin: boolean;
  onEdit: (step: FlowStep) => void;
  onDelete: (step: FlowStep) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
  issues: FlowIssue[];
}

function SortableStep({
  step,
  index,
  isLast,
  isAdmin,
  onEdit,
  onDelete,
  onHover,
  onHoverEnd,
  issues,
}: SortableStepProps) {
  const { t } = useTranslation();
  const id = step.id || `idx-${step.stepOrder}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isAdmin });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={onHoverEnd}
      className="relative list-none"
    >
      <div
        className={cn(
          "group relative flex items-stretch gap-3 rounded-xl border p-3.5 transition-colors",
          isDragging
            ? "border-[color:var(--color-primary)] bg-[color:var(--color-card)] shadow-md"
            : "border-transparent hover:border-[color:var(--shell-control-border)] hover:bg-[color:color-mix(in_srgb,var(--color-muted)_50%,transparent)]",
        )}
      >
        {/* Drag handle */}
        {isAdmin && (
          <button
            type="button"
            className="flex shrink-0 cursor-grab items-center justify-center self-stretch px-0.5 text-[color:var(--color-muted-foreground)] active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}

        {/* Number + step content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-xs font-semibold text-[color:var(--color-primary)]">
              {index + 1}
            </span>
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-muted-foreground)]"
            >
              <MessageSquare className="size-2.5" />
              {t("whatsappJourney.steps.send")}
            </Badge>
            {step.delayDays > 0 ? (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-muted-foreground)]"
              >
                {t("whatsappJourney.steps.waitDays", {
                  days: step.delayDays,
                  unit:
                    step.delayDays === 1
                      ? t("whatsappJourney.steps.dayUnit")
                      : t("whatsappJourney.steps.daysUnit"),
                })}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-[color:color-mix(in_srgb,var(--business-success)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--business-success)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[color:color-mix(in_srgb,var(--business-success)_80%,var(--color-foreground))]"
              >
                {t("whatsappJourney.steps.instant")}
              </Badge>
            )}
          </div>
          <p
            className="text-sm leading-5 text-[color:var(--color-foreground)]"
            style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
          >
            {step.content || (
              <span className="text-[color:var(--color-muted-foreground)]">
                {t("whatsappJourney.steps.emptyMessage")}
              </span>
            )}
          </p>
          {issues.length > 0 ? (
            <ul className="m-0 flex flex-col gap-1 p-0" style={{ listStyle: "none" }}>
              {issues.map((issue, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    issue.severity === "error"
                      ? "text-[color:var(--color-destructive)]"
                      : "text-[color:var(--color-muted-foreground)]",
                  )}
                >
                  {issue.severity === "error" ? (
                    <AlertCircle className="size-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3 shrink-0" />
                  )}
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex shrink-0 items-start gap-0.5">
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-lg text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              onClick={() => onEdit(step)}
              aria-label={t("common.edit") as string}
            >
              <Edit3 className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-lg text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-destructive)_12%,transparent)] hover:text-[color:var(--color-destructive)]"
              onClick={() => onDelete(step)}
              aria-label={t("common.delete") as string}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Connector between steps */}
      {!isLast && (
        <div
          className="mx-auto my-1 w-0.5"
          style={{
            height: 12,
            background:
              "color-mix(in srgb, var(--shell-control-border) 80%, transparent)",
          }}
          aria-hidden
        />
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────

function ValidationBadge({
  errorCount,
  warningCount,
  issues,
}: {
  errorCount: number;
  warningCount: number;
  issues: FlowIssue[];
}) {
  const { t } = useTranslation();

  if (errorCount === 0 && warningCount === 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 rounded-full border-[color:color-mix(in_srgb,var(--business-success)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--business-success)_10%,transparent)] px-2.5 py-1 text-[10px] font-medium text-[color:color-mix(in_srgb,var(--business-success)_80%,var(--color-foreground))]"
        title={t("whatsappJourney.steps.noIssues") as string}
      >
        <CheckCircle2 className="size-3" />
        {t("whatsappJourney.steps.validated")}
      </Badge>
    );
  }

  const isError = errorCount > 0;
  const Icon = isError ? AlertCircle : AlertTriangle;
  const label = isError
    ? t("whatsappJourney.steps.errorCount", { count: errorCount })
    : t("whatsappJourney.steps.warningCount", { count: warningCount });

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium",
        isError
          ? "border-[color:color-mix(in_srgb,var(--color-destructive)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-destructive)_10%,transparent)] text-[color:var(--color-destructive)]"
          : "border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]",
      )}
      title={issues.map((i) => i.message).join("\n")}
    >
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────

function FlowEmptyState({ onAdd, isAdmin }: { onAdd: () => void; isAdmin: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--color-card)_40%,transparent)] py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
        <MessageSquare className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-[color:var(--color-foreground)]">
          {t("whatsappJourney.steps.noStepsTitle")}
        </p>
        <p className="mx-auto max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
          {t("whatsappJourney.steps.noStepsDesc")}
        </p>
      </div>
      {isAdmin && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          {t("whatsappJourney.steps.addFirstStep")}
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

interface WhatsAppPreviewPaneProps {
  step: FlowStep | null;
  totalSteps: number;
}

function WhatsAppPreviewPane({ step, totalSteps }: WhatsAppPreviewPaneProps) {
  const { t } = useTranslation();

  const stepNumber = step
    ? [...Array(totalSteps).keys()].findIndex((_, i) => i + 1 === step.stepOrder) + 1
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
          {t("whatsappJourney.steps.livePreview")}
        </p>
        <span className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
          {step
            ? t("whatsappJourney.steps.stepOf", {
                current: stepNumber,
                total: totalSteps,
              })
            : "—"}
        </span>
      </div>

      {/* WhatsApp message preview */}
      <div
        className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] p-4"
        style={{
          background: "#ECE5DD",
          backgroundImage:
            'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
          minHeight: "14rem",
        }}
      >
        {step ? (
          <div
            className="ms-auto max-w-[80%]"
            style={{
              background: "#DCF8C6",
              borderRadius: "8px 8px 2px 8px",
              padding: "8px 12px",
              boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
            }}
          >
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.4,
                color: "#303030",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {applyVariables(step.content)}
            </p>
            <div
              className="mt-1 text-end"
              style={{ fontSize: 10, color: "#888" }}
            >
              12:05 PM ✓✓
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[12rem] items-center justify-center text-[color:color-mix(in_srgb,var(--color-foreground)_50%,transparent)]">
            <p className="text-xs">{t("whatsappJourney.flows.selectPrompt")}</p>
          </div>
        )}
      </div>

      {/* Variables legend */}
      <details className="text-xs text-[color:var(--color-muted-foreground)]">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.1em] text-[color:var(--color-muted-foreground)]">
          {t("whatsappJourney.steps.variables")}
        </summary>
        <ul className="mt-2 space-y-1" style={{ paddingInlineStart: 0, listStyle: "none" }}>
          {Object.entries(variableReplacements).map(([token, value]) => (
            <li
              key={token}
              className="flex items-center justify-between text-xs"
            >
              <code className="rounded bg-[color:var(--color-muted)] px-1.5 py-0.5 text-[color:var(--color-foreground)]">
                {token}
              </code>
              <span className="text-[color:var(--color-muted-foreground)]">→ {value}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
