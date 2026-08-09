/**
 * @module FlowCanvas
 * @description Editorial flow editor — drag-to-reorder step nodes with
 * a live WhatsApp message preview. Uses @dnd-kit (no extra deps).
 *
 * Replaces the static horizontal stepper with a real interactive surface.
 */

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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
  /** Whether to show the live preview pane (side-by-side on desktop) */
  showPreview?: boolean;
  /** Optional callback to open the AI co-pilot */
  onOpenCopilot?: () => void;
}

const variableReplacements: Record<string, string> = {
  "{firstName}": "Ahmed",
  "{lastName}": "Mohamed",
  "{orderNumber}": "ORD-2024",
  "{totalPrice}": "1,250 EGP",
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
    // Empty message
    if (!step.content || !step.content.trim()) {
      issues.push({
        stepId: step.id,
        severity: "error",
        message: `Step ${index + 1} has no message content`,
      });
    }

    // Oversized message (WhatsApp limit is 4096, but 1024 is more practical)
    if (step.content && step.content.length > MAX_MESSAGE_LENGTH) {
      issues.push({
        stepId: step.id,
        severity: "warning",
        message: `Step ${index + 1} is ${step.content.length} characters — risk of truncation`,
      });
    }

    // Long delay
    if (step.delayDays > MAX_DELAY_DAYS) {
      issues.push({
        stepId: step.id,
        severity: "warning",
        message: `Step ${index + 1} has a ${step.delayDays}-day delay — consider splitting the flow`,
      });
    }

    // Duplicate content
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

    // Missing variable close brace
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

  // The "active" step for preview = currently hovered or first
  const activePreviewStep = useMemo(() => {
    if (!orderedSteps.length) return null;
    if (hoveredStepId) {
      return orderedSteps.find((s) => (s.id || `idx-${s.stepOrder}`) === hoveredStepId) || orderedSteps[0];
    }
    return orderedSteps[0];
  }, [orderedSteps, hoveredStepId]);

  return (
    <div
      className="grid gap-0 border"
      style={{
        border: "1.5px solid var(--editorial-border)",
        borderRadius: "var(--editorial-radius-md, 6px)",
        background: "var(--editorial-surface-raised)",
        gridTemplateColumns: previewOpen ? "minmax(0, 1.4fr) minmax(0, 1fr)" : "1fr",
      }}
    >
      {/* LEFT: Step nodes */}
      <div
        className="p-6"
        style={{ borderRight: previewOpen ? "1.5px solid var(--editorial-border-subtle)" : "0" }}
      >
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="ed-eyebrow"
              style={{ color: "var(--editorial-ink-soft)" }}
            >
              flow timeline · {orderedSteps.length} step{orderedSteps.length === 1 ? "" : "s"}
            </p>
            <h3
              className="ed-display"
              style={{
                fontSize: 20,
                color: "var(--editorial-ink)",
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              Build the sequence
            </h3>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--editorial-ink-soft)" }}
            >
              {isAdmin
                ? "Drag to reorder · Click to edit · Add delays between messages"
                : "Read-only view"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Validation status pill */}
            {orderedSteps.length > 0 && (
              <ValidationBadge
                errorCount={errorCount}
                warningCount={warningCount}
                issues={issues}
              />
            )}
            {onOpenCopilot && (
              <button
                type="button"
                className="ed-btn"
                style={{
                  height: 32,
                  padding: "0 12px",
                  fontSize: 11,
                  background: "var(--editorial-ink)",
                  color: "var(--editorial-accent)",
                  borderColor: "var(--editorial-accent)",
                }}
                onClick={onOpenCopilot}
                title="Open AI co-pilot (⌘K)"
              >
                <Sparkles className="size-3" />
                ask co-pilot
              </button>
            )}
            <button
              type="button"
              className="ed-btn ed-btn-ghost"
              style={{ height: 32, padding: "0 12px", fontSize: 11 }}
              onClick={() => setPreviewOpen((v) => !v)}
              title={previewOpen ? "Hide preview" : "Show preview"}
            >
              {previewOpen ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              {previewOpen ? "hide preview" : "show preview"}
            </button>
            {isAdmin && (
              <button
                type="button"
                className="ed-btn ed-btn-accent"
                onClick={onAdd}
              >
                <Plus className="size-3.5" />
                add step
              </button>
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
        <div
          className="p-6"
          style={{
            background: "var(--editorial-surface-sunken)",
          }}
        >
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
      className="relative"
    >
      <div
        className={cn(
          "group relative flex items-stretch gap-3 p-4 transition-colors",
          !isDragging && "hover:bg-[color:var(--editorial-surface-sunken)]",
        )}
        style={{
          background: isDragging
            ? "var(--editorial-surface-raised)"
            : "transparent",
          border: isDragging
            ? "1.5px solid var(--editorial-ink)"
            : "1.5px solid transparent",
          borderRadius: "var(--editorial-radius-md, 6px)",
          boxShadow: isDragging
            ? "var(--editorial-shadow-pop)"
            : "none",
        }}
      >
        {/* Drag handle */}
        {isAdmin && (
          <button
            type="button"
            className="flex shrink-0 cursor-grab items-center justify-center self-stretch px-1 text-[color:var(--editorial-ink-soft)] active:cursor-grabbing"
            style={{
              background: "transparent",
              border: 0,
            }}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        )}

        {/* Number + step content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="ed-mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--editorial-ink-soft)",
                letterSpacing: "0.06em",
                minWidth: 28,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className="ed-badge ed-badge-soft"
              style={{ fontSize: 9 }}
            >
              <MessageSquare className="size-2.5" />
              send
            </span>
            {step.delayDays > 0 ? (
              <span
                className="ed-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--editorial-ink-soft)",
                }}
              >
                ◇ wait {step.delayDays} {step.delayDays === 1 ? "day" : "days"}
              </span>
            ) : (
              <span
                className="ed-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--editorial-accent-ink)",
                  background: "var(--editorial-accent-soft)",
                  padding: "2px 6px",
                  borderRadius: "3px",
                }}
              >
                ◇ instant
              </span>
            )}
          </div>
          <p
            className="text-sm leading-5"
            style={{
              color: "var(--editorial-ink)",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {step.content || (
              <span style={{ color: "var(--editorial-ink-soft)" }}>
                (empty message)
              </span>
            )}
          </p>
          {issues.length > 0 ? (
            <ul
              className="m-0 flex flex-col gap-1 p-0"
              style={{ listStyle: "none" }}
            >
              {issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1.5 ed-mono"
                  style={{
                    fontSize: 10,
                    color:
                      issue.severity === "error"
                        ? "oklch(0.55 0.21 25)"
                        : "var(--editorial-ink-soft)",
                    letterSpacing: "0.04em",
                  }}
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
          <div className="flex shrink-0 items-start gap-1">
            <button
              type="button"
              className="ed-btn ed-btn-ghost"
              style={{ height: 28, width: 28, padding: 0 }}
              onClick={() => onEdit(step)}
              aria-label="Edit step"
            >
              <Edit3 className="size-3" />
            </button>
            <button
              type="button"
              className="ed-btn ed-btn-ghost"
              style={{
                height: 28,
                width: 28,
                padding: 0,
                color: "oklch(0.55 0.21 25)",
              }}
              onClick={() => onDelete(step)}
              aria-label="Delete step"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Connector between steps */}
      {!isLast && (
        <div
          className="ml-7"
          style={{
            width: "1.5px",
            height: 16,
            background: "var(--editorial-border)",
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
  if (errorCount === 0 && warningCount === 0) {
    return (
      <span
        className="ed-badge"
        style={{
          fontSize: 10,
          color: "var(--editorial-ink-muted)",
          borderColor: "var(--editorial-border-subtle)",
          background: "var(--editorial-surface-sunken)",
        }}
        title="No issues"
      >
        <CheckCircle2 className="size-3" />
        validated
      </span>
    );
  }

  const tone =
    errorCount > 0
      ? {
          color: "oklch(0.55 0.21 25)",
          border: "oklch(0.55 0.21 25)",
          bg: "transparent",
        }
      : {
          color: "var(--editorial-ink)",
          border: "var(--editorial-border)",
          bg: "transparent",
        };
  const Icon = errorCount > 0 ? AlertCircle : AlertTriangle;
  const label =
    errorCount > 0
      ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
      : `${warningCount} warning${warningCount === 1 ? "" : "s"}`;

  return (
    <span
      className="ed-badge"
      style={{
        fontSize: 10,
        color: tone.color,
        borderColor: tone.border,
        background: tone.bg,
        cursor: "help",
      }}
      title={issues.map((i) => i.message).join("\n")}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────

function FlowEmptyState({ onAdd, isAdmin }: { onAdd: () => void; isAdmin: boolean }) {
  return (
    <div
      className="flex min-h-[18rem] flex-col items-center justify-center gap-4 border-2 border-dashed py-10 text-center"
      style={{
        borderColor: "var(--editorial-border-subtle)",
        borderRadius: "var(--editorial-radius-md, 6px)",
        background: "var(--editorial-surface-sunken)",
      }}
    >
      <div
        className="flex size-14 items-center justify-center"
        style={{
          background: "var(--editorial-ink)",
          color: "var(--editorial-surface-raised)",
          borderRadius: "var(--editorial-radius-sm, 4px)",
        }}
      >
        <MessageSquare className="size-7" />
      </div>
      <div className="space-y-1.5">
        <p
          className="ed-eyebrow"
          style={{ color: "var(--editorial-ink-soft)" }}
        >
          — empty —
        </p>
        <p
          className="ed-display"
          style={{
            color: "var(--editorial-ink)",
            fontSize: 24,
            lineHeight: 1.1,
          }}
        >
          No steps yet
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--editorial-ink-muted)" }}
        >
          Start by adding the first message in this flow
        </p>
      </div>
      {isAdmin && (
        <button
          type="button"
          className="ed-btn ed-btn-accent"
          onClick={onAdd}
        >
          <Plus className="size-4" />
          add first step
        </button>
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p
          className="ed-eyebrow"
          style={{ color: "var(--editorial-ink-soft)" }}
        >
          live preview
        </p>
        <span
          className="ed-mono"
          style={{
            fontSize: 10,
            color: "var(--editorial-ink-soft)",
            letterSpacing: "0.1em",
          }}
        >
          {step
            ? `STEP ${String(
                [...Array(totalSteps).keys()].findIndex(
                  (_, i) => i + 1 === step.stepOrder,
                ) + 1,
              ).padStart(2, "0")} / ${String(totalSteps).padStart(2, "0")}`
            : "—"}
        </span>
      </div>

      {/* WhatsApp message preview — same shape as production */}
      <div
        className="overflow-hidden"
        style={{
          border: "1.5px solid var(--editorial-border)",
          borderRadius: "var(--editorial-radius-md, 6px)",
          background: "#ECE5DD", // WhatsApp chat background
          backgroundImage:
            'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
          minHeight: "16rem",
          padding: 16,
        }}
      >
        {step ? (
          <div
            className="ml-auto max-w-[80%]"
            style={{
              background: "#DCF8C6", // WhatsApp outgoing bubble
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
          <div
            className="flex h-full min-h-[14rem] items-center justify-center"
            style={{ color: "rgba(0,0,0,0.5)" }}
          >
            <p className="ed-mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
              ◇ SELECT A STEP
            </p>
          </div>
        )}
      </div>

      {/* Variables legend */}
      <details
        className="text-xs"
        style={{ color: "var(--editorial-ink-soft)" }}
      >
        <summary
          className="ed-mono cursor-pointer"
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            listStyle: "none",
          }}
        >
          ◇ Variables
        </summary>
        <ul className="mt-2 space-y-1" style={{ paddingInlineStart: 0, listStyle: "none" }}>
          {Object.entries(variableReplacements).map(([token, value]) => (
            <li
              key={token}
              className="flex items-center justify-between"
              style={{
                fontFamily: "var(--editorial-mono)",
                fontSize: 11,
              }}
            >
              <code
                style={{
                  background: "var(--editorial-surface-sunken)",
                  padding: "1px 6px",
                  borderRadius: 3,
                  color: "var(--editorial-ink)",
                }}
              >
                {token}
              </code>
              <span style={{ color: "var(--editorial-ink-soft)" }}>→ {value}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
