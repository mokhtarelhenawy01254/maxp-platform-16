import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { EventRow } from "../types";

export const CHANNEL_LABELS: Record<string, string> = {
  AUTO: "تلقائي",
  BAILEYS: "واتساب عادي",
  META_CLOUD: "ميتا (قالب معتمد)",
};

export const CHANNEL_COLORS: Record<string, string> = {
  AUTO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  BAILEYS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  META_CLOUD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export interface EditingScheduleState {
  row: EventRow;
  enabled: boolean;
  activeChannel: string;
  delayValue: number;
  delayUnit: "HOURS" | "DAYS";
}

export interface TemplateScheduleTabProps {
  statuses: EventRow[];
  editingSchedule: EditingScheduleState | null;
  savingSchedule: string;
  onSetEditingSchedule: React.Dispatch<React.SetStateAction<EditingScheduleState | null>>;
  onSaveScheduleRow: (row: EventRow) => void;
  onToggleScheduleNotify: (row: EventRow, next: boolean) => void;
}

export const TemplateScheduleTab: React.FC<TemplateScheduleTabProps> = ({
  statuses,
  editingSchedule,
  savingSchedule,
  onSetEditingSchedule,
  onSaveScheduleRow,
  onToggleScheduleNotify,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
        <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">جدول الإشعارات</h2>
        <p className="mb-4 text-xs text-slate-500">حدد لكل حدث: هل يُرسل، القناة النشطة، وموعد الإرسال (مدة التأخير)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-3 px-2 text-right font-medium">الحدث</th>
                <th scope="col" className="py-3 px-2 text-right font-medium">يُرسل عند</th>
                <th scope="col" className="py-3 px-2 text-right font-medium">بعد مدة</th>
                <th scope="col" className="py-3 px-2 text-right font-medium">القناة النشطة</th>
                <th scope="col" className="py-3 px-2 text-right font-medium">مفعّل</th>
                <th scope="col" className="py-3 px-2" aria-hidden="true"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody>
              {statuses.filter((row) => {
                const st = String((row as any).statusType || "").toLowerCase();
                const cat = String(row.category || "").toUpperCase();
                return st !== "occasion" && st !== "products" && cat !== "OCCASION" && cat !== "PRODUCTS";
              }).map((row) => {
                const isEditing = editingSchedule?.row.code === row.code;
                return (
                  <tr key={row.code} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2">
                      <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                      <p className="text-xs text-slate-400 font-mono" dir="ltr">{row.code}</p>
                    </td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{row.trigger || "—"}</td>
                    <td className="py-3 px-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            id="schedule-delay"
                            type="number"
                            min={0}
                            aria-label="مدة التأخير"
                            value={editingSchedule!.delayValue}
                            onChange={(e) => onSetEditingSchedule((d) => d ? { ...d, delayValue: Number(e.target.value) || 0 } : d)}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <select
                            id="schedule-delay-unit"
                            aria-label="وحدة التأخير"
                            value={editingSchedule!.delayUnit}
                            onChange={(e) => onSetEditingSchedule((d) => d ? { ...d, delayUnit: e.target.value as "HOURS" | "DAYS" } : d)}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="HOURS">ساعة</option>
                            <option value="DAYS">يوم</option>
                          </select>
                        </div>
                      ) : (row.delayValue ?? 0) > 0 ? (
                        <span className="text-slate-700 dark:text-slate-200 font-mono tabular-nums">{row.delayValue} {row.delayUnit === "DAYS" ? "يوم" : "ساعة"}</span>
                      ) : (
                        <span className="text-slate-400">فوري</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {isEditing ? (
                        <select
                          value={editingSchedule!.activeChannel}
                          onChange={(e) => onSetEditingSchedule((d) => d ? { ...d, activeChannel: e.target.value } : d)}
                          className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                        >
                          <option value="AUTO">تلقائي (ميتا ← عادي)</option>
                          <option value="BAILEYS">واتساب عادي</option>
                          <option value="META_CLOUD">ميتا فقط</option>
                        </select>
                      ) : (
                        <Badge className={CHANNEL_COLORS[row.channel || "AUTO"]}>{CHANNEL_LABELS[row.channel || "AUTO"]}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <Switch
                        checked={isEditing ? editingSchedule!.enabled : row.notifyCustomer}
                        aria-label={`تفعيل إشعار ${row.name}`}
                        onCheckedChange={(v) => {
                          if (isEditing) {
                            onSetEditingSchedule((d) => d ? { ...d, enabled: v } : d);
                          } else {
                            onToggleScheduleNotify(row, v);
                          }
                        }}
                      />
                    </td>
                    <td className="py-3 px-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSaveScheduleRow(row)}
                            disabled={savingSchedule === row.code}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <ArrowPathIcon className={`h-3.5 w-3.5 ${savingSchedule === row.code ? "animate-spin" : ""}`} />
                            حفظ
                          </button>
                          <button onClick={() => onSetEditingSchedule(null)} className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSetEditingSchedule({
                            row,
                            enabled: row.notifyCustomer,
                            activeChannel: row.channel || "AUTO",
                            delayValue: row.delayValue ?? 0,
                            delayUnit: row.delayUnit || "HOURS",
                          })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          تعديل
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TemplateScheduleTab;
