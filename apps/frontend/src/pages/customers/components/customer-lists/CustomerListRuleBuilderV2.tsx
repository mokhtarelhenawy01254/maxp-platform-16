import React from "react";
import { Plus, Trash2, Layers, AlertCircle, ShoppingBag, ShieldCheck, Tag, MapPin, Calendar, Star, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CriteriaV2,
  GroupV2,
  RuleV2,
  RuleFieldV2,
  RuleOpV2,
  CustomerList,
  ORDER_STATUSES,
  STATUS_LABELS,
  RATINGS,
} from "./types";
import { buildEmptyGroup, buildEmptyRule } from "./criteriaUtils";
import { DateInput } from '../../../../components/ui/DateInput';

interface CustomerListRuleBuilderV2Props {
  criteria: CriteriaV2;
  onChange: (updated: CriteriaV2) => void;
  availableTags?: string[];
  existingLists?: CustomerList[];
}

const RULE_FIELDS: { value: RuleFieldV2; label: string; icon: any }[] = [
  { value: "receivedProduct", label: "استلم منتج محدد (SKU)", icon: ShoppingBag },
  { value: "orderedInPeriod", label: "طلب خلال فترة زمنية", icon: Calendar },
  { value: "ordersCount", label: "عدد الطلبات المكتملة", icon: ShoppingBag },
  { value: "totalSpent", label: "إجمالي الإنفاق (ج.م)", icon: DollarSign },
  { value: "lastOrderBefore", label: "آخر طلب قبل تاريخ", icon: Calendar },
  { value: "lastOrderAfter", label: "آخر طلب بعد تاريخ", icon: Calendar },
  { value: "deliveryRate", label: "نسبة الاستلام (%0-100)", icon: ShieldCheck },
  { value: "tags", label: "الوسم (Tag)", icon: Tag },
  { value: "customerStatus", label: "حالة العميل", icon: ShieldCheck },
  { value: "city", label: "المدينة", icon: MapPin },
  { value: "governorate", label: "المحافظة", icon: MapPin },
  { value: "customerRating", label: "تقييم العميل", icon: Star },
];

const NUMERIC_OPS: { value: RuleOpV2; label: string }[] = [
  { value: "gte", label: "أكبر من أو يساوي (≥)" },
  { value: "gt", label: "أكبر من (>)" },
  { value: "lte", label: "أقل من أو يساوي (≤)" },
  { value: "lt", label: "أقل من (<)" },
  { value: "between", label: "بين قيمتين" },
  { value: "eq", label: "يساوي (=)" },
];

export const CustomerListRuleBuilderV2: React.FC<CustomerListRuleBuilderV2Props> = ({
  criteria,
  onChange,
  availableTags = [],
  existingLists = [],
}) => {
  // Update include top-level operator
  const handleTopOperatorChange = (op: "AND" | "OR") => {
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        operator: op,
      },
    });
  };

  // Add group to include
  const handleAddGroup = () => {
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        groups: [...(criteria.include.groups || []), buildEmptyGroup("AND")],
      },
    });
  };

  // Remove group from include
  const handleRemoveGroup = (gIdx: number) => {
    const updated = criteria.include.groups.filter((_, i) => i !== gIdx);
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        groups: updated.length > 0 ? updated : [buildEmptyGroup("AND")],
      },
    });
  };

  // Update group operator
  const handleGroupOperatorChange = (gIdx: number, op: "AND" | "OR") => {
    const updatedGroups = [...criteria.include.groups];
    updatedGroups[gIdx] = { ...updatedGroups[gIdx], operator: op };
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        groups: updatedGroups,
      },
    });
  };

  // Add rule to group
  const handleAddRule = (gIdx: number) => {
    const updatedGroups = [...criteria.include.groups];
    updatedGroups[gIdx] = {
      ...updatedGroups[gIdx],
      rules: [...updatedGroups[gIdx].rules, buildEmptyRule("ordersCount")],
    };
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        groups: updatedGroups,
      },
    });
  };

  // Remove rule from group
  const handleRemoveRule = (gIdx: number, rIdx: number) => {
    const updatedGroups = [...criteria.include.groups];
    const updatedRules = updatedGroups[gIdx].rules.filter((_, i) => i !== rIdx);
    updatedGroups[gIdx] = {
      ...updatedGroups[gIdx],
      rules: updatedRules.length > 0 ? updatedRules : [buildEmptyRule("ordersCount")],
    };
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        groups: updatedGroups,
      },
    });
  };

  // Update rule field/values
  const handleUpdateRule = (gIdx: number, rIdx: number, patch: Partial<RuleV2>) => {
    const updatedGroups = [...criteria.include.groups];
    const currentRule = updatedGroups[gIdx].rules[rIdx];
    const isFieldChanging = patch.field && patch.field !== currentRule.field;
    const nextRule = isFieldChanging
      ? { ...buildEmptyRule(patch.field!), ...patch }
      : { ...currentRule, ...patch };

    updatedGroups[gIdx].rules[rIdx] = nextRule;
    onChange({
      ...criteria,
      include: {
        ...criteria.include,
        groups: updatedGroups,
      },
    });
  };

  // Exclude contacted in days
  const handleContactExclusionChange = (days: number) => {
    onChange({
      ...criteria,
      excludeContactedInDays: days,
    });
  };

  // Exclude list IDs
  const handleToggleExcludeList = (listId: string) => {
    const current = criteria.excludeListIds || [];
    const next = current.includes(listId)
      ? current.filter((id) => id !== listId)
      : [...current, listId];
    onChange({
      ...criteria,
      excludeListIds: next,
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Include Rules Section ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--shell-control-border)] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[color:var(--color-primary)]" />
            <span className="font-semibold text-sm text-[color:var(--color-foreground)]">
              شروط الاستهداف (Include)
            </span>
          </div>

          {criteria.include.groups.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[color:var(--color-muted-foreground)]">العلاقة بين المجموعات:</span>
              <div className="inline-flex rounded-lg border border-[color:var(--shell-control-border)] p-0.5 bg-[color:var(--color-muted)]/40">
                <button
                  type="button"
                  onClick={() => handleTopOperatorChange("AND")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    criteria.include.operator === "AND"
                      ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                      : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  مطابقة الكل (AND)
                </button>
                <button
                  type="button"
                  onClick={() => handleTopOperatorChange("OR")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    criteria.include.operator === "OR"
                      ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                      : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  مطابقة أي منها (OR)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Groups */}
        <div className="space-y-3">
          {criteria.include.groups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-3.5 space-y-3 shadow-xs"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[color:var(--shell-control-border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-xs font-bold font-mono">
                    {gIdx + 1}
                  </span>
                  <span className="text-xs font-medium text-[color:var(--color-foreground)]">
                    المجموعة {gIdx + 1}
                  </span>

                  {group.rules.length > 1 && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <button
                        type="button"
                        onClick={() => handleGroupOperatorChange(gIdx, "AND")}
                        className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                          group.operator === "AND"
                            ? "bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] font-semibold"
                            : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
                        }`}
                      >
                        كل الشروط (AND)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGroupOperatorChange(gIdx, "OR")}
                        className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                          group.operator === "OR"
                            ? "bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] font-semibold"
                            : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
                        }`}
                      >
                        أي شرط (OR)
                      </button>
                    </div>
                  )}
                </div>

                {criteria.include.groups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-[color:var(--color-destructive)] hover:bg-[color:var(--color-destructive)]/10"
                    onClick={() => handleRemoveGroup(gIdx)}
                    title="حذف المجموعة"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* Rules List */}
              <div className="space-y-2.5">
                {group.rules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex flex-wrap items-start gap-2 rounded-lg border border-[color:var(--shell-control-border)]/50 bg-[color:var(--color-muted)]/20 p-2.5"
                  >
                    {/* Field Select */}
                    <div className="w-full sm:w-52 shrink-0">
                      <Select
                        value={rule.field}
                        onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { field: val as RuleFieldV2 })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="اختر المعيار" />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_FIELDS.map((rf) => (
                            <SelectItem key={rf.value} value={rf.value} className="text-xs">
                              <span className="flex items-center gap-1.5">
                                <rf.icon className="size-3.5 text-[color:var(--color-muted-foreground)]" />
                                {rf.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic Inputs according to field */}
                    <div className="flex-1 min-w-[200px] flex flex-wrap items-center gap-2">
                      {/* 1. receivedProduct */}
                      {rule.field === "receivedProduct" && (
                        <>
                          <div className="flex-1 min-w-[120px]">
                            <Input
                              className="h-9 text-xs"
                              placeholder="كود المنتج SKU (مثال: sw 84)"
                              value={rule.sku || ""}
                              onChange={(e) => handleUpdateRule(gIdx, rIdx, { sku: e.target.value })}
                            />
                          </div>
                          <div className="w-28 shrink-0">
                            <Select
                              value={rule.statuses?.[0] || "DELIVERED"}
                              onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { statuses: [val] })}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="حالة الطلب" />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((st) => (
                                  <SelectItem key={st} value={st} className="text-xs">
                                    {STATUS_LABELS[st] || st}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-1">
                            <DateInput
                              
                              className="h-9 text-xs w-32"
                              value={rule.dateFrom ? rule.dateFrom.slice(0, 10) : ""}
                              onChange={(e) => handleUpdateRule(gIdx, rIdx, { dateFrom: e.target.value })}
                              title="من تاريخ"
                            />
                            <span className="text-xs text-[color:var(--color-muted-foreground)]">-</span>
                            <DateInput
                              
                              className="h-9 text-xs w-32"
                              value={rule.dateTo ? rule.dateTo.slice(0, 10) : ""}
                              onChange={(e) => handleUpdateRule(gIdx, rIdx, { dateTo: e.target.value })}
                              title="إلى تاريخ"
                            />
                          </div>
                        </>
                      )}

                      {/* 2. orderedInPeriod */}
                      {rule.field === "orderedInPeriod" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[color:var(--color-muted-foreground)]">من:</span>
                          <DateInput
                            
                            className="h-9 text-xs w-36"
                            value={rule.dateFrom ? rule.dateFrom.slice(0, 10) : ""}
                            onChange={(e) => handleUpdateRule(gIdx, rIdx, { dateFrom: e.target.value })}
                          />
                          <span className="text-xs text-[color:var(--color-muted-foreground)]">إلى:</span>
                          <DateInput
                            
                            className="h-9 text-xs w-36"
                            value={rule.dateTo ? rule.dateTo.slice(0, 10) : ""}
                            onChange={(e) => handleUpdateRule(gIdx, rIdx, { dateTo: e.target.value })}
                          />
                        </div>
                      )}

                      {/* 3. ordersCount / totalSpent / deliveryRate (Numeric Ops) */}
                      {(rule.field === "ordersCount" || rule.field === "totalSpent" || rule.field === "deliveryRate") && (
                        <>
                          <div className="w-40 shrink-0">
                            <Select
                              value={rule.op || "gte"}
                              onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { op: val as RuleOpV2 })}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NUMERIC_OPS.map((op) => (
                                  <SelectItem key={op.value} value={op.value} className="text-xs">
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24 shrink-0">
                            <Input
                              type="number"
                              min={0}
                              className="h-9 text-xs"
                              placeholder="القيمة"
                              value={rule.value ?? ""}
                              onChange={(e) => handleUpdateRule(gIdx, rIdx, { value: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          {rule.op === "between" && (
                            <>
                              <span className="text-xs text-[color:var(--color-muted-foreground)]">و</span>
                              <div className="w-24 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9 text-xs"
                                  placeholder="القيمة 2"
                                  value={rule.value2 ?? ""}
                                  onChange={(e) => handleUpdateRule(gIdx, rIdx, { value2: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* 4. lastOrderBefore / lastOrderAfter */}
                      {(rule.field === "lastOrderBefore" || rule.field === "lastOrderAfter") && (
                        <div className="w-44">
                          <DateInput
                            
                            className="h-9 text-xs"
                            value={rule.value ? String(rule.value).slice(0, 10) : ""}
                            onChange={(e) => handleUpdateRule(gIdx, rIdx, { value: e.target.value })}
                          />
                        </div>
                      )}

                      {/* 5. tags */}
                      {rule.field === "tags" && (
                        <>
                          <div className="w-32 shrink-0">
                            <Select
                              value={rule.op || "contains"}
                              onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { op: val as RuleOpV2 })}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contains" className="text-xs">يحتوي على</SelectItem>
                                <SelectItem value="notContains" className="text-xs">لا يحتوي على</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            {availableTags.length > 0 ? (
                              <Select
                                value={rule.value || ""}
                                onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { value: val })}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="اختر الوسم" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTags.map((t) => (
                                    <SelectItem key={t} value={t} className="text-xs">
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                className="h-9 text-xs"
                                placeholder="اسم الوسم"
                                value={rule.value || ""}
                                onChange={(e) => handleUpdateRule(gIdx, rIdx, { value: e.target.value })}
                              />
                            )}
                          </div>
                        </>
                      )}

                      {/* 6. customerStatus */}
                      {rule.field === "customerStatus" && (
                        <div className="w-40 shrink-0">
                          <Select
                            value={Array.isArray(rule.value) ? rule.value[0] : (rule.value || "ACTIVE")}
                            onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { value: [val], op: "in" })}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE" className="text-xs">نشط (ACTIVE)</SelectItem>
                              <SelectItem value="LEAD" className="text-xs">عميل محتمل (LEAD)</SelectItem>
                              <SelectItem value="INACTIVE" className="text-xs">غير نشط (INACTIVE)</SelectItem>
                              <SelectItem value="BLOCKED" className="text-xs">محظور (BLOCKED)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* 7. city / governorate */}
                      {(rule.field === "city" || rule.field === "governorate") && (
                        <div className="flex-1 min-w-[140px]">
                          <Input
                            className="h-9 text-xs"
                            placeholder={rule.field === "city" ? "اسم المدينة (مثال: القاهرة)" : "اسم المحافظة (مثال: الجيزة)"}
                            value={rule.value || ""}
                            onChange={(e) => handleUpdateRule(gIdx, rIdx, { value: e.target.value })}
                          />
                        </div>
                      )}

                      {/* 8. customerRating */}
                      {rule.field === "customerRating" && (
                        <div className="w-40 shrink-0">
                          <Select
                            value={Array.isArray(rule.value) ? rule.value[0] : (rule.value || "EXCELLENT")}
                            onValueChange={(val) => handleUpdateRule(gIdx, rIdx, { value: [val], op: "in" })}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RATINGS.map((rat) => (
                                <SelectItem key={rat} value={rat} className="text-xs">
                                  {STATUS_LABELS[rat] || rat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Delete Rule */}
                    {group.rules.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-destructive)]"
                        onClick={() => handleRemoveRule(gIdx, rIdx)}
                        title="حذف هذا الشرط"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Rule Button inside Group */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs border-dashed gap-1 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
                onClick={() => handleAddRule(gIdx)}
              >
                <Plus className="size-3.5" />
                إضافة شرط إلى المجموعة
              </Button>
            </div>
          ))}
        </div>

        {/* Add Group Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 w-full border-dashed"
          onClick={handleAddGroup}
        >
          <Plus className="size-4" />
          إضافة مجموعة شروط جديدة (OR/AND)
        </Button>
      </div>

      {/* ── Exclusions Section ── */}
      <div className="space-y-4 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/20 p-4">
        <div className="flex items-center gap-2 border-b border-[color:var(--shell-control-border)]/60 pb-2">
          <AlertCircle className="size-4 text-amber-500" />
          <span className="font-semibold text-sm text-[color:var(--color-foreground)]">
            شروط وقواعد الاستبعاد (Exclusions)
          </span>
        </div>

        {/* 1. Exclude Contacted in N days */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="text-xs font-medium">استبعاد المراسَلين حديثاً</Label>
            <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
              استبعاد العملاء الذين لديهم أي رسالة (واردة أو صادرة) خلال الفترة لتجنب التكرار.
            </p>
          </div>
          <div className="w-36 shrink-0">
            <Select
              value={String(criteria.excludeContactedInDays || 0)}
              onValueChange={(val) => handleContactExclusionChange(parseInt(val, 10) || 0)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="بدون استثناء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" className="text-xs">بدون استثناء</SelectItem>
                <SelectItem value="1" className="text-xs">آخر 24 ساعة</SelectItem>
                <SelectItem value="3" className="text-xs">آخر 3 أيام</SelectItem>
                <SelectItem value="7" className="text-xs">آخر 7 أيام</SelectItem>
                <SelectItem value="14" className="text-xs">آخر 14 يوم</SelectItem>
                <SelectItem value="30" className="text-xs">آخر 30 يوم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 2. Exclude Existing Customer Lists */}
        {existingLists.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[color:var(--shell-control-border)]/50">
            <Label className="text-xs font-medium">استبعاد أعضاء قوائم أخرى</Label>
            <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
              استبعاد أي عميل متطابق مع أي من هذه القوائم:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
              {existingLists.map((l) => {
                const selected = (criteria.excludeListIds || []).includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleToggleExcludeList(l.id)}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs text-start transition-all ${
                      selected
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-foreground)] font-medium"
                        : "border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[color:var(--color-muted-foreground)] hover:border-[color:var(--color-primary)]/40"
                    }`}
                  >
                    <span className="truncate">{l.name}</span>
                    <span className="text-[10px] font-mono shrink-0">
                      {(l.count || 0).toLocaleString("ar-EG")} عميل
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
