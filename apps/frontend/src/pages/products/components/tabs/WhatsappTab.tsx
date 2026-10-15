import React from "react";
import {
  Megaphone,
  Users,
  ShoppingCart,
  UserPlus,
  Flame,
  Lightbulb,
} from "lucide-react";

interface WhatsappTabProps {
  whatsappNotify: {
    enabled: boolean;
    audience: "all" | "withOrders" | "newCustomers" | "activeCustomers";
    templateName: string;
    customMessage: string;
  };
  setWhatsappNotify: React.Dispatch<React.SetStateAction<{
    enabled: boolean;
    audience: "all" | "withOrders" | "newCustomers" | "activeCustomers";
    templateName: string;
    customMessage: string;
  }>>;
}

export const WhatsappTab: React.FC<WhatsappTabProps> = ({
  whatsappNotify,
  setWhatsappNotify,
}) => {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-xs text-right">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
        <div className="p-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">حملة واتساب ترويجية</h3>
          <p className="text-xs text-muted-foreground mt-0.5">أرسل هذا المنتج لعملائك فور اعتماده وحفظه</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 bg-muted/20 rounded-lg border border-border/60">
          <div>
            <h4 className="text-xs font-semibold text-foreground">تفعيل الإرسال التلقائي</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">سيتم بدء الحملة مباشرة بعد الضغط على "حفظ المنتج"</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappNotify.enabled}
              onChange={(e) => setWhatsappNotify({ ...whatsappNotify, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border/70" />
          </label>
        </div>

        {whatsappNotify.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">لمن تريد الإرسال؟</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "all", label: "كل العملاء", icon: Users },
                  { id: "withOrders", label: "أصحاب الطلبات", icon: ShoppingCart },
                  { id: "newCustomers", label: "العملاء الجدد", icon: UserPlus },
                  { id: "activeCustomers", label: "النشطون", icon: Flame },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = whatsappNotify.audience === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setWhatsappNotify({ ...whatsappNotify, audience: item.id as any })}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">رسالة ترويجية (اختياري)</label>
              <textarea
                value={whatsappNotify.customMessage}
                onChange={(e) => setWhatsappNotify({ ...whatsappNotify, customMessage: e.target.value })}
                placeholder="اكتب رسالة مخصصة تظهر مع صورة المنتج وسعره..."
                className="w-full h-28 p-2.5 border border-border/70 bg-background rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-xs text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                * سيتم إدراج اسم العميل، اسم المنتج، والسعر تلقائياً في الرسالة.
              </p>
            </div>
          </div>
        )}

        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            نصيحة: تأكد من أن جلسة الواتساب متصلة في صفحة الإشعارات قبل الحفظ لضمان بدء الحملة فوراً.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsappTab;
