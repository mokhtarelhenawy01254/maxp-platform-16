import React, { useCallback, useEffect, useState } from "react";
import {
  Users, Sparkles, Clock, ShoppingBag, FileText, Wallet, Landmark,
  Star, ArrowDownUp, Tag, Crown, Heart, AlertTriangle, Loader2, Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { broadcastService } from "../../services/broadcastService";
import { customerService } from "../../services/customerService";
import { cn } from "@/lib/utils";

interface CustomerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
  'CANCELLED', 'REFUNDED', 'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED',
  'PARTIALLY_REFUNDED', 'READY_TO_SHIP', 'ON_HOLD', 'OUT_FOR_DELIVERY',
  'LOST', 'PREPARING', 'QUALITY_CHECK', 'PACKAGED', 'PARTIALLY_DELIVERED',
  'STOCK_SHORTAGE', 'PENDING_CANCELLATION',
];

const RETURN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'];
const RATINGS = ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'UNKNOWN'];

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à",
  PENDING: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒",
  CONFIRMED: "┘à╪ñ┘â╪»",
  SCHEDULED: "┘à╪¼╪»┘ê┘ä",
  PROCESSING: "┘é┘è╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓",
  SHIPPED: "╪¬┘à ╪º┘ä╪┤╪¡┘å",
  CANCELLED: "┘à┘ä╪║┘è",
  REFUNDED: "┘à╪│╪¬╪▒╪¼╪╣",
  RETURNED: "┘à╪▒╪¬╪¼╪╣",
  PARTIALLY_RETURNED: "┘à╪▒╪¬╪¼╪╣ ╪¼╪▓╪ª┘è╪º┘ï",
  EXCHANGED: "┘à╪│╪¬╪¿╪»┘ä",
  PARTIALLY_REFUNDED: "┘à╪│╪¬╪▒╪¼╪╣ ╪¼╪▓╪ª┘è╪º┘ï",
  READY_TO_SHIP: "╪¼╪º┘ç╪▓ ┘ä┘ä╪┤╪¡┘å",
  ON_HOLD: "┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒",
  OUT_FOR_DELIVERY: "╪«╪º╪▒╪¼ ┘ä┘ä╪¬┘ê╪╡┘è┘ä",
  LOST: "╪╢╪º╪ª╪╣",
  PREPARING: "┘è╪¬┘à ╪¬╪¼┘ç┘è╪▓┘ç",
  QUALITY_CHECK: "┘ü╪¡╪╡ ╪º┘ä╪¼┘ê╪»╪⌐",
  PACKAGED: "╪¬┘à ╪º┘ä╪¬╪║┘ä┘è┘ü",
  PARTIALLY_DELIVERED: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è╪º┘ï",
  STOCK_SHORTAGE: "┘å┘é╪╡ ┘ü┘è ╪º┘ä┘à╪«╪▓┘ê┘å",
  PENDING_CANCELLATION: "╪Ñ┘ä╪║╪º╪í ┘à╪╣┘ä┘é",
  APPROVED: "┘à┘ê╪º┘ü┘é╪⌐",
  REJECTED: "┘à╪▒┘ü┘ê╪╢",
  COMPLETED: "┘à┘â╪¬┘à┘ä",
  PARTIALLY_PAID: "┘à╪»┘ü┘ê╪╣ ╪¼╪▓╪ª┘è╪º┘ï",
  FAILED: "┘ü╪┤┘ä",
  EXCELLENT: "┘à┘à╪¬╪º╪▓",
  GOOD: "╪¼┘è╪»",
  AVERAGE: "┘à╪¬┘ê╪│╪╖",
  POOR: "╪╢╪╣┘è┘ü",
  UNKNOWN: "╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü",
};

const CRITERIA_TYPES = [
  { value: "all", label: "╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å", icon: Users, hint: "┘â┘ä ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å" },
  { value: "active", label: "┘å╪┤╪╖ ╪«┘ä╪º┘ä ┘ü╪¬╪▒╪⌐", icon: Clock, hint: "╪╣┘à┘ä╪º╪í ╪¬┘ê╪º╪╡┘ä┘ê╪º ╪«┘ä╪º┘ä ╪ó╪«╪▒ X ╪│╪º╪╣╪⌐" },
  { value: "inactive", label: "╪║┘è╪▒ ┘å╪┤╪╖ ┘à┘å╪░ ┘ü╪¬╪▒╪⌐", icon: Clock, hint: "╪╣┘à┘ä╪º╪í ┘ä┘à ┘è╪¬┘ê╪º╪╡┘ä┘ê╪º ┘à┘å╪░ X ┘è┘ê┘à" },
  { value: "tag", label: "┘è╪¡┘à┘ä ┘ê╪│┘à (Tag)", icon: Tag, hint: "╪╣┘à┘ä╪º╪í ┘ä╪»┘è┘ç┘à ┘ê╪│┘à ┘à╪¡╪»╪»" },
  { value: "orderStatus", label: "╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿ ╪«┘ä╪º┘ä ┘ü╪¬╪▒╪⌐", icon: ShoppingBag, hint: "╪╣┘à┘ä╪º╪í ╪╣┘å╪»┘ç┘à ╪╖┘ä╪¿ ╪¿╪¡╪º┘ä╪⌐ ┘à╪╣┘è┘å╪⌐" },
  { value: "returnRequest", label: "╪╖┘ä╪¿╪º╪¬ ┘à╪▒╪¬╪¼╪╣", icon: FileText, hint: "╪╣┘à┘ä╪º╪í ┘é╪º┘à┘ê╪º ╪¿╪╖┘ä╪¿ ┘à╪▒╪¬╪¼╪╣" },
  { value: "paymentStatus", label: "╪¡╪º┘ä╪⌐ ╪º┘ä╪»┘ü╪╣", icon: Wallet, hint: "╪╣┘à┘ä╪º╪í ╪¿╪¡╪º┘ä╪⌐ ╪»┘ü╪╣ ┘ä╪╖┘ä╪¿╪º╪¬┘ç┘à" },
  { value: "city", label: "╪º┘ä┘à╪»┘è┘å╪⌐", icon: Landmark, hint: "╪╣┘à┘ä╪º╪í ┘à┘å ┘à╪»┘è┘å╪⌐ ┘à╪╣┘è┘å╪⌐" },
  { value: "customerRating", label: "╪º┘ä╪¬┘é┘è┘è┘à", icon: Star, hint: "╪╣┘à┘ä╪º╪í ╪¿╪¬┘é┘è┘è┘à ┘à╪¡╪»╪»" },
  { value: "latest", label: "╪º┘ä╪ú╪¡╪»╪½", icon: ArrowDownUp, hint: "╪ú╪¡╪»╪½ N ╪╣┘à┘ä╪º╪í" },
  { value: "oldest", label: "╪º┘ä╪ú┘é╪»┘à", icon: ArrowDownUp, hint: "╪ú┘é╪»┘à N ╪╣┘à┘ä╪º╪í" },
  { value: "minTotalSpent", label: "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ┘å┘ü╪º┘é", icon: Wallet, hint: "╪╣┘à┘ä╪º╪í ╪ú┘å┘ü┘é┘ê╪º ╪ú┘â╪½╪▒ ┘à┘å ┘à╪¿┘ä╪║" },
  { value: "minOrdersCount", label: "╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬", icon: ShoppingBag, hint: "╪╣┘à┘ä╪º╪í ┘ä╪»┘è┘ç┘à N ╪╖┘ä╪¿ ╪ú┘ê ╪ú┘â╪½╪▒" },
] as const;

type CriteriaType = (typeof CRITERIA_TYPES)[number]["value"];

const SMART_PRESETS = [
  {
    value: "champions",
    label: "╪ú┘ü╪╢┘ä ╪º┘ä╪╣┘à┘ä╪º╪í",
    icon: Crown,
    hint: "┘å╪┤╪╖┘ê┘å + ┘â╪½┘è╪▒┘ê ╪º┘ä╪╖┘ä╪¿╪º╪¬ + ╪Ñ┘å┘ü╪º┘é ┘à╪▒╪¬┘ü╪╣ ΓÇö ╪╣╪▒╪╢ ┘ê┘ä╪º╪í",
  },
  {
    value: "loyal",
    label: "╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪ú┘ê┘ü┘è╪º╪í",
    icon: Heart,
    hint: "5 ╪╖┘ä╪¿╪º╪¬ ╪ú┘ê ╪ú┘â╪½╪▒ ΓÇö ╪▒╪┤┘æ╪¡┘ç┘à ┘ä╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í",
  },
  {
    value: "atRisk",
    label: "┘à╪╣╪▒╪╢┘ê┘å ┘ä┘ä┘ü┘é╪»╪º┘å",
    icon: AlertTriangle,
    hint: "┘â╪º┘å┘ê╪º ┘à╪┤╪¬╪▒┘è┘å ┘ä┘â┘å ╪║┘è╪▒ ┘å╪┤╪╖┘è┘å 30 ┘è┘ê┘à ΓÇö ╪ú╪╣╪» ╪º┘ä╪¬┘å╪┤┘è╪╖",
  },
  {
    value: "new",
    label: "╪╣┘à┘ä╪º╪í ╪¼╪»╪»",
    icon: Sparkles,
    hint: "╪ú╪¡╪»╪½ 100 ╪╣┘à┘è┘ä ΓÇö ╪▒╪¡┘æ╪¿ ╪¿┘ç┘à",
  },
] as const;

function buildEmptyCriteria(type: CriteriaType): Record<string, any> {
  switch (type) {
    case "active": return { type, hours: 24 };
    case "inactive": return { type, days: 7 };
    case "orderStatus": return { type, status: "DELIVERED", days: 30 };
    case "returnRequest": return { type, status: "APPROVED", days: 30 };
    case "paymentStatus": return { type, status: "COMPLETED", days: 30 };
    case "city": return { type, city: "" };
    case "customerRating": return { type, rating: "EXCELLENT" };
    case "latest": return { type, limit: 100 };
    case "oldest": return { type, limit: 100 };
    case "minTotalSpent": return { type, amount: 1000 };
    case "minOrdersCount": return { type, count: 2 };
    case "tag": return { type, tag: "" };
    default: return { type };
  }
}

function buildPresetCriteria(preset: string): Record<string, any> {
  return { type: "preset", preset };
}

const CustomerListDialog: React.FC<CustomerListDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCriteriaType, setFormCriteriaType] = useState<CriteriaType>("all");
  const [formCriteria, setFormCriteria] = useState<any>({ type: "all" });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const reset = useCallback(() => {
    setFormName("");
    setFormDescription("");
    setFormCriteriaType("all");
    setFormCriteria({ type: "all" });
    setPreviewCount(null);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const loadTags = useCallback(async () => {
    try {
      const res = await customerService.getDistinctTags();
      const tags = Array.isArray(res) ? res.map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean) : [];
      setAvailableTags(tags);
    } catch { /* ╪¬╪¼╪º┘ç┘ä */ }
  }, []);

  useEffect(() => { void loadTags(); }, [loadTags]);

  const changeCriteriaType = (type: string) => {
    const t = type as CriteriaType;
    const exclude = formCriteria.excludeContactedInDays;
    setFormCriteriaType(t);
    setFormCriteria({ ...buildEmptyCriteria(t), ...(exclude ? { excludeContactedInDays: exclude } : {}) });
    setPreviewCount(null);
  };

  const updateCriteriaField = (key: string, value: any) => {
    setFormCriteria((prev: any) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!open) return;
      setPreviewLoading(true);
      try {
        const res = await broadcastService.previewCustomerListCount(formCriteria);
        if (!cancelled) setPreviewCount(res?.data?.count ?? null);
      } catch {
        if (!cancelled) setPreviewCount(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [formCriteria, open]);

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("╪º╪│┘à ╪º┘ä┘é╪º╪ª┘à╪⌐ ┘à╪╖┘ä┘ê╪¿"); return; }
    setSaving(true);
    try {
      await broadcastService.createCustomerList({
        name: formName.trim(),
        description: formDescription.trim(),
        criteria: formCriteria,
      });
      toast.success("╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º╪ª┘à╪⌐ ╪¿┘å╪¼╪º╪¡");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "┘ü╪┤┘ä ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º╪ª┘à╪⌐");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>╪Ñ┘å╪┤╪º╪í ┘é╪º╪ª┘à╪⌐ ╪╣┘à┘ä╪º╪í ╪¼╪»┘è╪»╪⌐</DialogTitle>
          <DialogDescription>
            ╪¡╪»╪» ┘à╪╣╪º┘è┘è╪▒ ╪░┘â┘è╪⌐ ┘ä╪º╪│╪¬┘ç╪»╪º┘ü ╪╣┘à┘ä╪º╪í ┘à╪¡╪»╪»┘è┘å╪î ╪½┘à ╪ú╪▒╪│┘ä ╪º┘ä╪¡┘à┘ä╪⌐ ╪╣╪¿╪▒ ┘ê╪º╪¬╪│╪º╪¿.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="list-name">╪º╪│┘à ╪º┘ä┘é╪º╪ª┘à╪⌐ *</Label>
              <Input id="list-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="┘à╪½╪º┘ä: ╪╣┘à┘ä╪º╪í VIP" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="list-description">┘ê╪╡┘ü ╪º┘ä┘é╪º╪ª┘à╪⌐</Label>
              <Input id="list-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="┘ê╪╡┘ü ╪º╪«╪¬┘è╪º╪▒┘è" />
            </div>
          </div>

          <Separator />

          {/* Smart RFM presets */}
          <div className="space-y-1.5">
            <Label>╪º╪¿╪»╪ú ┘à┘å ┘é╪º┘ä╪¿ ╪¼╪º┘ç╪▓</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SMART_PRESETS.map((p) => {
                const active = formCriteria.type === "preset" && formCriteria.preset === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setFormCriteriaType("all");
                      setFormCriteria(buildPresetCriteria(p.value));
                      setPreviewCount(null);
                    }}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border p-3 text-start transition-all",
                      active
                        ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] ring-1 ring-[color:var(--color-primary)]/30"
                        : "border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:border-[color:var(--color-primary)]/40",
                    )}
                  >
                    <p.icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-muted-foreground)]")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[color:var(--color-foreground)]">{p.label}</span>
                      <span className="block text-[11px] leading-4 text-[color:var(--color-muted-foreground)]">{p.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>╪ú┘ê ╪¡╪»╪» ┘à╪╣┘è╪º╪▒╪º┘ï ┘è╪»┘ê┘è╪º┘ï</Label>
            <Select value={formCriteriaType} onValueChange={(v) => changeCriteriaType((v ?? "all") as string)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="╪º╪«╪¬╪▒ ╪º┘ä┘à╪╣┘è╪º╪▒" />
              </SelectTrigger>
              <SelectContent>
                {CRITERIA_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    <span className="flex items-center gap-2">
                      <ct.icon className="size-4" />
                      {ct.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              {CRITERIA_TYPES.find((ct) => ct.value === formCriteriaType)?.hint}
            </p>
          </div>

          {/* Criteria specific fields */}
          {formCriteria.type !== "preset" ? (
            <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/30 p-4">
              {formCriteriaType === "active" && (
                <div className="space-y-1.5">
                  <Label>╪«┘ä╪º┘ä ╪ó╪«╪▒ (╪│╪º╪╣╪⌐)</Label>
                  <Input type="number" min={1} value={formCriteria.hours ?? 24} onChange={(e) => updateCriteriaField("hours", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "inactive" && (
                <div className="space-y-1.5">
                  <Label>╪║┘è╪▒ ┘å╪┤╪╖ ┘à┘å╪░ (┘è┘ê┘à)</Label>
                  <Input type="number" min={1} value={formCriteria.days ?? 7} onChange={(e) => updateCriteriaField("days", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "tag" && (
                <div className="space-y-1.5">
                  <Label>╪º┘ä┘ê╪│┘à (Tag)</Label>
                  {availableTags.length > 0 ? (
                    <Select value={formCriteria.tag || ""} onValueChange={(v) => updateCriteriaField("tag", v ?? "")}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="╪º╪«╪¬╪▒ ┘ê╪│┘à╪º┘ï" /></SelectTrigger>
                      <SelectContent>
                        {availableTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>≡ƒÅ╖∩╕Å {tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={formCriteria.tag || ""} onChange={(e) => updateCriteriaField("tag", e.target.value)} placeholder="╪º╪│┘à ╪º┘ä┘ê╪│┘à" />
                  )}
                </div>
              )}
              {(formCriteriaType === "orderStatus" || formCriteriaType === "returnRequest" || formCriteriaType === "paymentStatus") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{formCriteriaType === "returnRequest" ? "╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪▒╪¬╪¼╪╣" : formCriteriaType === "paymentStatus" ? "╪¡╪º┘ä╪⌐ ╪º┘ä╪»┘ü╪╣" : "╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿"}</Label>
                    <Select value={formCriteria.status || ""} onValueChange={(v) => updateCriteriaField("status", v ?? "")}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="╪º╪«╪¬╪▒ ╪º┘ä╪¡╪º┘ä╪⌐" /></SelectTrigger>
                      <SelectContent>
                        {(formCriteriaType === "returnRequest" ? RETURN_STATUSES : formCriteriaType === "paymentStatus" ? PAYMENT_STATUSES : ORDER_STATUSES).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>╪«┘ä╪º┘ä ╪ó╪«╪▒ (┘è┘ê┘à)</Label>
                    <Input type="number" min={1} value={formCriteria.days ?? 30} onChange={(e) => updateCriteriaField("days", parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              )}
              {formCriteriaType === "city" && (
                <div className="space-y-1.5">
                  <Label>╪º┘ä┘à╪»┘è┘å╪⌐ / ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐</Label>
                  <Input value={formCriteria.city || ""} onChange={(e) => updateCriteriaField("city", e.target.value)} placeholder="┘à╪½╪º┘ä: ╪º┘ä┘é╪º┘ç╪▒╪⌐" />
                </div>
              )}
              {formCriteriaType === "customerRating" && (
                <div className="space-y-1.5">
                  <Label>╪º┘ä╪¬┘é┘è┘è┘à</Label>
                  <Select value={formCriteria.rating || "EXCELLENT"} onValueChange={(v) => updateCriteriaField("rating", v ?? "EXCELLENT")}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATINGS.map((r) => (
                        <SelectItem key={r} value={r}>{STATUS_LABELS[r] || r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(formCriteriaType === "latest" || formCriteriaType === "oldest") && (
                <div className="space-y-1.5">
                  <Label>╪╣╪»╪» ╪º┘ä╪╣┘à┘ä╪º╪í</Label>
                  <Input type="number" min={1} value={formCriteria.limit ?? 100} onChange={(e) => updateCriteriaField("limit", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "minTotalSpent" && (
                <div className="space-y-1.5">
                  <Label>╪Ñ╪¼┘à╪º┘ä┘è ╪Ñ┘å┘ü╪º┘é ΓëÑ (╪¼┘å┘è┘ç / ┘ê╪¡╪»╪⌐ ╪º┘ä╪╣┘à┘ä╪⌐)</Label>
                  <Input type="number" min={0} value={formCriteria.amount ?? 1000} onChange={(e) => updateCriteriaField("amount", parseFloat(e.target.value) || 0)} />
                </div>
              )}
              {formCriteriaType === "minOrdersCount" && (
                <div className="space-y-1.5">
                  <Label>╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬ ΓëÑ</Label>
                  <Input type="number" min={1} value={formCriteria.count ?? 2} onChange={(e) => updateCriteriaField("count", parseInt(e.target.value) || 1)} />
                </div>
              )}
              {formCriteriaType === "all" && (
                <p className="text-sm text-[color:var(--color-muted-foreground)]">╪│╪¬╪┤┘à┘ä ┘ç╪░┘ç ╪º┘ä┘é╪º╪ª┘à╪⌐ ╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å.</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-4 py-3">
              {(() => {
                const preset = SMART_PRESETS.find((p) => p.value === formCriteria.preset);
                return (
                  <>
                    {preset ? <preset.icon className="size-4 text-[color:var(--color-primary)]" /> : <Sparkles className="size-4 text-[color:var(--color-primary)]" />}
                    <span className="text-sm font-medium text-[color:var(--color-foreground)]">
                      {preset ? preset.label : "┘é╪º┘ä╪¿ ╪¼╪º┘ç╪▓"} ΓÇö {preset ? preset.hint : "╪│┘è╪¬┘à ╪¬╪╖╪¿┘è┘é ╪º┘ä┘à╪╣╪º┘è┘è╪▒ ╪º┘ä╪░┘â┘è╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï"}
                    </span>
                  </>
                );
              })()}
            </div>
          )}

          {/* Exclusion window */}
          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label>╪º╪│╪¬╪½┘å╪º╪í ╪º┘ä┘à╪▒╪º╪│┘Ä┘ä┘è┘å ╪¡╪»┘è╪½╪º┘ï</Label>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  ╪º╪│╪¬╪¿╪╣╪» ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪░┘è┘å ╪ú╪▒╪│┘ä┘ê╪º ╪Ñ┘ä┘è┘â ╪ú┘ê ╪ú┘Å╪▒╪│┘ä ╪Ñ┘ä┘è┘ç┘à ╪«┘ä╪º┘ä ╪ó╪«╪▒ (┘è┘ê┘à). ┘è┘à┘å╪╣ ╪Ñ╪▓╪╣╪º╪¼ ╪╣┘à┘ä╪º╪í ╪¬┘ê╪º╪╡┘ä┘ê╪º ┘à╪ñ╪«╪▒╪º┘ï.
                </p>
              </div>
              <div className="w-32 shrink-0">
                <Select
                  value={formCriteria.excludeContactedInDays ? String(formCriteria.excludeContactedInDays) : "0"}
                  onValueChange={(v) => updateCriteriaField("excludeContactedInDays", v === "0" ? undefined : parseInt(v || "0", 10))}
                >
                  <SelectTrigger className="h-11"><SelectValue placeholder="╪¿╪»┘ê┘å ╪º╪│╪¬╪½┘å╪º╪í" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">╪¿╪»┘ê┘å ╪º╪│╪¬╪½┘å╪º╪í</SelectItem>
                    <SelectItem value="1">┘è┘ê┘à ┘ê╪º╪¡╪»</SelectItem>
                    <SelectItem value="3">3 ╪ú┘è╪º┘à</SelectItem>
                    <SelectItem value="7">7 ╪ú┘è╪º┘à</SelectItem>
                    <SelectItem value="14">14 ┘è┘ê┘à</SelectItem>
                    <SelectItem value="30">30 ┘è┘ê┘à</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Live count preview */}
          <div className="flex items-center justify-between rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[color:var(--color-primary)]" />
              <span className="text-sm font-medium text-[color:var(--color-foreground)]">╪╣╪»╪» ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘à╪¬┘ê┘é╪╣</span>
            </div>
            {previewLoading ? (
              <Loader2 className="size-4 animate-spin text-[color:var(--color-primary)]" />
            ) : previewCount !== null ? (
              <span className="text-lg font-bold text-[color:var(--color-primary)]">
                {previewCount.toLocaleString("ar-EG")} <span className="text-xs font-normal text-[color:var(--color-muted-foreground)]">╪╣┘à┘è┘ä</span>
              </span>
            ) : (
              <span className="text-sm text-[color:var(--color-muted-foreground)]">╪║┘è╪▒ ┘à╪¬╪º╪¡</span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>╪Ñ┘ä╪║╪º╪í</Button>
          <Button className="rounded-full" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º╪ª┘à╪⌐
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerListDialog;
