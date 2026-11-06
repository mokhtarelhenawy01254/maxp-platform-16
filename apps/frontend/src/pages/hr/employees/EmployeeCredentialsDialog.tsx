import React, { useState } from "react";
import { Check, Copy, KeyRound, ExternalLink, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CredentialsModalState } from "./types";

interface EmployeeCredentialsDialogProps {
  state: CredentialsModalState;
  onOpenChange: (open: boolean) => void;
}

export const EmployeeCredentialsDialog: React.FC<EmployeeCredentialsDialogProps> = ({
  state,
  onOpenChange,
}) => {
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyToClipboard = async (text: string, type: "pass" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "pass") {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast.success("تم النسخ إلى الحافظة بنجاح");
    } catch (err) {
      toast.error("فشل النسخ");
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <KeyRound className="h-5 w-5" />
            <DialogTitle>بيانات حساب الموظف</DialogTitle>
          </div>
          <DialogDescription>
            بيانات الدخول للنظام الخاصة بالموظف{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {state.employeeName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">البريد الإلكتروني لتسجيل الدخول</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={state.email}
                className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(state.email, "pass")}
                title="نسخ الإيميل"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Temporary Password */}
          {state.temporaryPassword && (
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">كلمة المرور المؤقتة</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={state.temporaryPassword}
                  className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(state.temporaryPassword!, "pass")}
                  className={copiedPass ? "text-green-600 border-green-600" : ""}
                  title="نسخ كلمة المرور"
                >
                  {copiedPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                سيُطلب من الموظف تغيير كلمة المرور عند أول تسجيل دخول.
              </p>
            </div>
          )}

          {/* Reset/Setup Link */}
          {state.resetLink && (
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">رابط تفعيل الحساب وتعيين كلمة المرور</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={state.resetLink}
                  className="font-mono text-xs text-gray-600 bg-gray-50 dark:bg-gray-800 truncate"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(state.resetLink!, "link")}
                  className={copiedLink ? "text-green-600 border-green-600" : ""}
                  title="نسخ الرابط"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                يمكنك إرسال هذا الرابط للموظف مباشرة عبر واتساب لتعيين كلمة مروره.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
            <span>
              تم ربط حساب المستخدم بالسجل الوظيفي تلقائياً، وأصبح بإمكانه استخدام تطبيق الحضور والانصراف والصلاحيات الممنوحة له فوراً.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            تم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
