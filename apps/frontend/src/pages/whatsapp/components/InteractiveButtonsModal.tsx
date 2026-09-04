import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  PhoneCall,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface InteractiveButtonInput {
  type: "copy" | "url" | "call" | "quick_reply";
  displayText: string;
  code?: string;
  url?: string;
  phoneNumber?: string;
}

interface InteractiveButtonsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: {
    title?: string;
    text: string;
    footer?: string;
    buttons: InteractiveButtonInput[];
  }) => Promise<void>;
}

export const InteractiveButtonsModal: React.FC<InteractiveButtonsModalProps> = ({
  open,
  onOpenChange,
  onSend,
}) => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<InteractiveButtonInput[]>([
    { type: "copy", displayText: "نسخ الكوبون", code: "SAVE20" },
  ]);
  const [sending, setSending] = useState(false);

  const handleAddButton = () => {
    if (buttons.length >= 3) {
      toast.warning("الحد الأقصى للأزرار هو 3 أزرار");
      return;
    }
    setButtons((prev) => [
      ...prev,
      { type: "quick_reply", displayText: `زر ${prev.length + 1}` },
    ]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateButton = (
    index: number,
    field: keyof InteractiveButtonInput,
    value: string,
  ) => {
    setButtons((prev) =>
      prev.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)),
    );
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error("يرجى كتابة نص الرسالة");
      return;
    }

    const validButtons = buttons.filter((b) => b.displayText.trim());
    if (validButtons.length === 0) {
      toast.error("يرجى إضافة زر واحد على الأقل");
      return;
    }

    try {
      setSending(true);
      await onSend({
        title: title.trim() || undefined,
        text: text.trim(),
        footer: footer.trim() || undefined,
        buttons: validButtons,
      });
      onOpenChange(false);
      setTitle("");
      setText("");
      setFooter("");
      setButtons([{ type: "copy", displayText: "نسخ الكوبون", code: "SAVE20" }]);
    } catch (err: any) {
      console.error("Failed to send interactive message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <Sparkles className="size-5 text-[color:var(--color-primary)]" />
            إرسال رسالة بأزرار تفاعلية (Native Flow)
          </DialogTitle>
          <DialogDescription>
            أرسل رسالة تحتوي على أزرار واتساب الأصلية (نسخ كوبون، رابط تتبع، اتصال هاتفي، أو رد سريع).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[color:var(--color-foreground)]">
              العنوان الرئيسي (اختياري)
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: خصم خاص لعملاء ماكس بي"
              className="h-10 rounded-xl bg-[var(--whatsapp-surface-strong)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[color:var(--color-foreground)]">
              نص الرسالة *
            </Label>
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب تفاصيل العرض أو الرسالة هنا..."
              className="rounded-xl bg-[var(--whatsapp-surface-strong)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[color:var(--color-foreground)]">
              نص التذييل (Footer - اختياري)
            </Label>
            <Input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="مثال: العرض ساري حتى نهاية الشهر"
              className="h-10 rounded-xl bg-[var(--whatsapp-surface-strong)]"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[color:var(--color-foreground)]">
                الأزرار التفاعلية ({buttons.length}/3)
              </Label>
              {buttons.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddButton}
                  className="h-8 gap-1.5 rounded-lg text-xs"
                >
                  <Plus className="size-3.5" />
                  إضافة زر
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {buttons.map((btn, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-muted)] p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary)]">
                      {btn.type === "copy" && <Copy className="size-3.5" />}
                      {btn.type === "url" && <ExternalLink className="size-3.5" />}
                      {btn.type === "call" && <PhoneCall className="size-3.5" />}
                      {btn.type === "quick_reply" && <MessageSquare className="size-3.5" />}
                      <span>الزر {index + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={btn.type}
                        onValueChange={(val: any) =>
                          handleUpdateButton(index, "type", val)
                        }
                      >
                        <SelectTrigger className="h-8 w-32 rounded-lg text-xs bg-[var(--whatsapp-surface-strong)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="copy">📋 نسخ كود</SelectItem>
                          <SelectItem value="url">🔗 رابط خارجي</SelectItem>
                          <SelectItem value="call">📞 اتصال هاتفي</SelectItem>
                          <SelectItem value="quick_reply">💬 رد سريع</SelectItem>
                        </SelectContent>
                      </Select>

                      {buttons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveButton(index)}
                          className="size-8 rounded-lg text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        نص الزر الظاهر للعميل
                      </span>
                      <Input
                        value={btn.displayText}
                        onChange={(e) =>
                          handleUpdateButton(index, "displayText", e.target.value)
                        }
                        placeholder="مثال: نسخ كود الخصم"
                        className="h-9 rounded-lg text-xs bg-[var(--whatsapp-surface-strong)]"
                      />
                    </div>

                    {btn.type === "copy" && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                          الكود الذي سيتم نسخه
                        </span>
                        <Input
                          value={btn.code || ""}
                          onChange={(e) =>
                            handleUpdateButton(index, "code", e.target.value)
                          }
                          placeholder="مثال: PROMO50"
                          className="h-9 rounded-lg text-xs bg-[var(--whatsapp-surface-strong)]"
                        />
                      </div>
                    )}

                    {btn.type === "url" && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                          الرابط (URL)
                        </span>
                        <Input
                          value={btn.url || ""}
                          onChange={(e) =>
                            handleUpdateButton(index, "url", e.target.value)
                          }
                          placeholder="https://example.com"
                          className="h-9 rounded-lg text-xs bg-[var(--whatsapp-surface-strong)]"
                        />
                      </div>
                    )}

                    {btn.type === "call" && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                          رقم الهاتف للاتصال
                        </span>
                        <Input
                          value={btn.phoneNumber || ""}
                          onChange={(e) =>
                            handleUpdateButton(index, "phoneNumber", e.target.value)
                          }
                          placeholder="+201012345678"
                          className="h-9 rounded-lg text-xs bg-[var(--whatsapp-surface-strong)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={sending || !text.trim()}
          >
            {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InteractiveButtonsModal;
