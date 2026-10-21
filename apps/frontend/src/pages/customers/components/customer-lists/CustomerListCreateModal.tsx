import React from "react";
import { Users, Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CustomerList,
  CriteriaType,
  CRITERIA_TYPES,
  SMART_PRESETS,
} from "./types";
import { CustomerListCriteriaFields } from "./CustomerListCriteriaFields";

interface CustomerListCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingList: CustomerList | null;
  formName: string;
  onNameChange: (val: string) => void;
  formDescription: string;
  onDescriptionChange: (val: string) => void;
  formCriteriaType: CriteriaType;
  formCriteria: any;
  onCriteriaTypeChange: (val: string) => void;
  onPresetSelect: (preset: string) => void;
  onCriteriaFieldChange: (key: string, value: any) => void;
  previewCount: number | null;
  previewLoading: boolean;
  availableTags: string[] | undefined;
  saving: boolean;
  onSave: () => void;
}

export const CustomerListCreateModal: React.FC<CustomerListCreateModalProps> = ({
  open,
  onOpenChange,
  editingList,
  formName,
  onNameChange,
  formDescription,
  onDescriptionChange,
  formCriteriaType,
  formCriteria,
  onCriteriaTypeChange,
  onPresetSelect,
  onCriteriaFieldChange,
  previewCount,
  previewLoading,
  availableTags = [],
  saving,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingList ? "تعديل قائمة العملاء" : "إنشاء قائمة عملاء جديدة"}</DialogTitle>
          <DialogDescription>
            حدد معايير ذكية لاستهداف عملاء محددين، ثم أرسل الحملة عبر واتساب.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="list-name">اسم القائمة *</Label>
              <Input
                id="list-name"
                value={formName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="مثال: عملاء VIP"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="list-description">وصف القائمة</Label>
              <Input
                id="list-description"
                value={formDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="وصف اختياري"
              />
            </div>
          </div>

          <Separator />

          {/* Smart RFM presets */}
          <div className="space-y-1.5">
            <Label>ابدأ من قالب جاهز</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SMART_PRESETS.map((p) => {
                const active = formCriteria.type === "preset" && formCriteria.preset === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onPresetSelect(p.value)}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border p-3 text-start transition-all",
                      active
                        ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] ring-1 ring-[color:var(--color-primary)]/30"
                        : "border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:border-[color:var(--color-primary)]/40",
                    )}
                  >
                    <p.icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        active ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-muted-foreground)]",
                      )}
                    />
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
            <Label>أو حدد معياراً يدوياً</Label>
            <Select
              value={formCriteriaType}
              onValueChange={(v) => onCriteriaTypeChange(v ?? "all")}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="اختر المعيار" />
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

          {/* Criteria specific fields & Exclusion window */}
          <CustomerListCriteriaFields
            formCriteriaType={formCriteriaType}
            formCriteria={formCriteria}
            onCriteriaFieldChange={onCriteriaFieldChange}
            availableTags={availableTags}
          />

          {/* Live count preview */}
          <div className="flex items-center justify-between rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))] px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[color:var(--color-primary)]" />
              <span className="text-sm font-medium text-[color:var(--color-foreground)]">عدد العملاء المتوقع</span>
            </div>
            {previewLoading ? (
              <Loader2 className="size-4 animate-spin text-[color:var(--color-primary)]" />
            ) : previewCount !== null ? (
              <span className="text-lg font-bold tabular-nums font-mono text-[color:var(--color-primary)]">
                {previewCount.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-normal text-[color:var(--color-muted-foreground)]">عميل</span>
              </span>
            ) : (
              <span className="text-sm text-[color:var(--color-muted-foreground)]">غير متاح</span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button className="rounded-full" onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : editingList ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {editingList ? "حفظ التعديلات" : "إنشاء القائمة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
