import React from "react";
import { Users, X } from "lucide-react";

interface MemberItem {
  id?: string;
  telegramId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
}

interface TelegramGroupMembersModalProps {
  open: boolean;
  groupTitle?: string;
  members: MemberItem[];
  loading: boolean;
  onClose: () => void;
}

export const TelegramGroupMembersModal: React.FC<TelegramGroupMembersModalProps> = ({
  open,
  groupTitle,
  members,
  loading,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border/80 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
        <div className="border-b border-border/70 pb-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              أعضاء {groupTitle || "المجموعة"}
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
              إجمالي {members.length} عضو مسجل
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            إغلاق
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border/60 text-xs">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground font-mono">
              جاري فحص ومزامنة قائمة الأعضاء...
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              لم يتم العثور على أعضاء مسجلين
            </div>
          ) : (
            members.map((m, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {m.firstName || ""} {m.lastName || ""}
                  </p>
                  {m.username && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      @{m.username}
                    </p>
                  )}
                </div>
                {m.telegramId && (
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/60">
                    ID: {m.telegramId}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-border/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
export default TelegramGroupMembersModal;
