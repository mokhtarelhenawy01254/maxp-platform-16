import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import {
  AlertTriangle,
  FileText,
  Calendar,
  CheckCircle2,
  Info,
  ArrowRight,
  User,
} from "lucide-react";
import { Warning } from "./types";
import { getTypeColor, getTypeLabel, getSeverityBadge } from "./helpers";

interface WarningPreviewModalProps {
  selectedWarning: Warning | null;
  onClose: () => void;
  onOpenFullFile: (id: string) => void;
}

export const WarningPreviewModal: React.FC<WarningPreviewModalProps> = ({
  selectedWarning,
  onClose,
  onOpenFullFile,
}) => {
  return (
    <Dialog
      open={!!selectedWarning}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className="max-w-2xl bg-card text-card-foreground border border-border/70 shadow-2xl rounded-2xl p-0 overflow-hidden"
        dir="rtl"
      >
        {selectedWarning && (
          <>
            <DialogHeader className="px-6 py-5 border-b border-border/70 bg-muted/20 relative">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-4 border-white dark:border-gray-800 shadow-xl ring-2 ring-primary/10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-foreground text-white text-xl font-black">
                        {selectedWarning.employee?.firstName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white break-words max-w-[400px]">
                      {selectedWarning.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <User className="h-3.5 w-3.5" />
                      <span>
                        {selectedWarning.employee?.firstName}{" "}
                        {selectedWarning.employee?.lastName}
                      </span>
                      {selectedWarning.employee?.employeeNumber && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="font-mono tabular-nums">
                            {selectedWarning.employee.employeeNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="px-8 pb-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar relative">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="group p-4 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl border border-muted/50 space-y-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                    <AlertTriangle className="h-3 w-3" /> درجة الشدة
                  </p>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(selectedWarning.severity)}
                  </div>
                </div>
                <div className="group p-4 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl border border-muted/50 space-y-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                    <FileText className="h-3 w-3" /> تصنيف المخالفة
                  </p>
                  <Badge
                    variant="secondary"
                    className={`${getTypeColor(selectedWarning.type)} border-0 text-xs px-3 py-1`}
                  >
                    {getTypeLabel(selectedWarning.type)}
                  </Badge>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    تفاصيل الواقعة
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    ID: #{selectedWarning.id.slice(-6)}
                  </span>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-transparent rounded-[1.25rem] blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="relative bg-white dark:bg-gray-900/50 p-6 rounded-[1.25rem] border border-gray-100 dark:border-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200 text-lg">
                    {selectedWarning.description}
                  </div>
                </div>
              </div>

              {/* Footnote Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-dashed border-muted">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-full text-xs font-semibold text-muted-foreground font-mono tabular-nums">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span>
                    حدثت في:{" "}
                    {new Date(selectedWarning.incidentDate).toLocaleDateString(
                      "ar-EG",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>
                {selectedWarning.acknowledgedAt ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-xs font-bold ring-1 ring-green-500/20 font-mono tabular-nums">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>
                      تم الإقرار:{" "}
                      {new Date(
                        selectedWarning.acknowledgedAt,
                      ).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold ring-1 ring-amber-500/20">
                    <Info className="h-3 w-3" />
                    <span>في انتظار إقرار الموظف</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-6 bg-muted/20 border-t border-muted/30 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl px-6 font-bold hover:bg-background"
              >
                إغلاق النافذة
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => onOpenFullFile(selectedWarning.id)}
                  className="rounded-xl shadow-lg shadow-primary/20 px-8 font-black gap-2 h-12"
                >
                  فتح الملف الكامل
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
