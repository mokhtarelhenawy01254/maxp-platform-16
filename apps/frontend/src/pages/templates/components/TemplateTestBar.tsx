import React from "react";
import { Label } from "@/components/ui/label";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { StatusWithTemplate } from "../types";

export interface TemplateTestBarProps {
  testPhone: string;
  setTestPhone: (phone: string) => void;
  testEvent: string;
  setTestEvent: (event: string) => void;
  testing: boolean;
  onSendTest: () => void;
  statuses: StatusWithTemplate[];
}

export default function TemplateTestBar({
  testPhone,
  setTestPhone,
  testEvent,
  setTestEvent,
  testing,
  onSendTest,
  statuses,
}: TemplateTestBarProps) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-slate-900/50">
      <h2 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">
        إرسال تجريبي
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="test-phone" className="text-xs text-slate-500">
            رقم الهاتف
          </Label>
          <input
            id="test-phone"
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="01000000000"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <Label htmlFor="test-event" className="text-xs text-slate-500">
            الحدث
          </Label>
          <select
            id="test-event"
            value={testEvent}
            onChange={(e) => setTestEvent(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">اختر الحدث...</option>
            {statuses.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onSendTest}
          disabled={testing}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {testing ? "جارٍ الإرسال..." : "إرسال تجريبي"}
        </button>
      </div>
    </div>
  );
}
