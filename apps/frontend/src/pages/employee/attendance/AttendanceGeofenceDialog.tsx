import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, MapPinOff, Navigation, Radio, Send } from "lucide-react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import api from "../../../services/api";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { GeofenceModalData } from "./types";

interface AttendanceGeofenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: GeofenceModalData | null;
  t: TFunction;
}

export const AttendanceGeofenceDialog: React.FC<AttendanceGeofenceDialogProps> = ({
  open,
  onOpenChange,
  data,
  t,
}) => {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setShowReasonInput(false);
      setReason("");
      setSubmitting(false);
      setSubmitted(false);
      setErrorMessage(null);
    }
  }, [open, data]);

  if (!data) return null;

  // Determine which of the 3 states to show:
  // State 3: Location is missing / required OR client weak accuracy with requiresLocation
  const isState3LocationRequired = Boolean(
    data.requiresLocation ||
    data.failure === "LOCATION_MISSING" ||
    (!data.failure && (data.accuracy ?? 0) > 500)
  );

  // State 2: Weak accuracy from device
  const isState2WeakAccuracy = !isState3LocationRequired && data.failure === "WEAK_ACCURACY";

  // State 1: Out of range (default)
  const isState1OutOfRange = !isState3LocationRequired && !isState2WeakAccuracy;

  const handleOpenExceptionForm = () => {
    if (!data.attemptId) {
      toast.error(
        t(
          "employee.attendance.geofenceMissingAttempt",
          "تعذر تقديم طلب الاستثناء لعدم توفر رقم المحاولة، يرجى إعادة المحاولة."
        )
      );
      return;
    }
    setShowReasonInput(true);
    setErrorMessage(null);
  };

  const handleSubmitException = async () => {
    if (!data.attemptId) {
      toast.error(
        t(
          "employee.attendance.geofenceMissingAttempt",
          "تعذر تقديم طلب الاستثناء لعدم توفر رقم المحاولة، يرجى إعادة المحاولة."
        )
      );
      return;
    }

    if (!reason.trim()) {
      setErrorMessage(
        t("employee.attendance.geofenceReasonPlaceholder", "اكتب سبب طلب الاستثناء بالتفصيل...")
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await api.post("/hr/attendance/exception-requests", {
        attemptId: data.attemptId,
        reason: reason.trim(),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number; data?: { error?: string } } };
      if (errorObj?.response?.status === 409) {
        setErrorMessage(
          t(
            "employee.attendance.geofenceAlreadyRequested",
            "عندك طلب مقدم بالفعل لهذا اليوم"
          )
        );
      } else {
        setErrorMessage(
          errorObj?.response?.data?.error ||
          t("employee.attendance.unexpectedError", "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveDistance = Math.round(data.distance ?? data.rawDistance ?? 0);
  const allowedRadius = data.allowedRadius ?? 200;
  const distanceDiff = Math.max(0, effectiveDistance - allowedRadius);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            {isState3LocationRequired && (
              <>
                <MapPinOff className="h-5 w-5 text-amber-500" />
                <span>
                  {t(
                    "employee.attendance.geofenceModalTitleLocationRequired",
                    "مطلوب تفعيل تحديد الموقع"
                  )}
                </span>
              </>
            )}
            {isState2WeakAccuracy && (
              <>
                <Radio className="h-5 w-5 text-amber-500" />
                <span>
                  {t(
                    "employee.attendance.geofenceModalTitleWeakAccuracy",
                    "موقع جهازك تقريبي جدًا"
                  )}
                </span>
              </>
            )}
            {isState1OutOfRange && (
              <>
                <Navigation className="h-5 w-5 text-red-500" />
                <span>
                  {t(
                    "employee.attendance.geofenceModalTitleOutOfRange",
                    "أنت خارج نطاق البصمة المسموح"
                  )}
                </span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          /* Confirmation body after successful submission */
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 animate-bounce" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t(
                "employee.attendance.geofenceExceptionSuccess",
                "تم إرسال الطلب للمدير — هيظهر في طلبات استثناء البصمة"
              )}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              سيقوم المدير أو مسؤول الموارد البشرية بمراجعة طلبك واعتماد البصمة إذا تمت الموافقة.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* STATE 3: LOCATION REQUIRED */}
            {isState3LocationRequired && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-sm leading-relaxed">
                  <p className="font-semibold mb-1">
                    {t(
                      "employee.attendance.locationRequired",
                      "📍 مطلوب تفعيل تحديد الموقع"
                    )}
                  </p>
                  <p>
                    {t(
                      "employee.attendance.locationRequiredDesc",
                      "للبصمة من المكتب، يجب السماح بالوصول إلى موقعك. فعّل تحديد الموقع ثم أعد المحاولة."
                    )}
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">الخطوات المقترحة:</p>
                  <p>
                    {t(
                      "employee.attendance.geofenceLocationRequiredSteps",
                      "يرجى السماح بالوصول للموقع في إعدادات المتصفح وإعادة المحاولة."
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* STATE 2: WEAK ACCURACY */}
            {isState2WeakAccuracy && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-sm">
                  <p className="font-semibold mb-1">
                    دقة الموقع المسجلة للجهاز تقريبية (±{data.accuracy || 500} متر)
                  </p>
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    {t(
                      "employee.attendance.geofenceWeakAccuracyReason",
                      "قد يكون الجهاز مكتبيًا بدون GPS أو خدمة الموقع مقفولة أو غير دقيقة."
                    )}
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">الخطوات المقترحة:</p>
                  <p>
                    {t(
                      "employee.attendance.geofenceWeakAccuracySteps",
                      "الخطوات المقترحة: شغّل الواي فاي لتحسين الدقة، اسمح للمتصفح بالوصول للموقع بدقة، أو استخدم تطبيق الموبايل."
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* STATE 1: OUT OF RANGE */}
            {isState1OutOfRange && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl border bg-muted/30">
                    <span className="block text-xs text-muted-foreground">
                      {t("employee.attendance.geofenceCurrentDistance", "المسافة الحالية")}
                    </span>
                    <span className="text-lg font-bold font-mono text-red-600 dark:text-red-400">
                      {effectiveDistance} م
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/30">
                    <span className="block text-xs text-muted-foreground">
                      {t("employee.attendance.geofenceAllowedRadius", "النطاق المسموح")}
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {allowedRadius} م
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/30">
                    <span className="block text-xs text-muted-foreground">
                      {t("employee.attendance.geofenceDifference", "فرق المسافة المطلوب الاقتراب به")}
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                      {distanceDiff} م
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                  <p>
                    {t(
                      "employee.attendance.geofenceOutOfRangeSteps",
                      "يرجى الاقتراب من مقر الشركة ثم إعادة المحاولة."
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Inline Reason Input for Exception Request (States 1 & 2 only) */}
            {(isState1OutOfRange || isState2WeakAccuracy) && showReasonInput && (
              <div className="space-y-2 pt-2 border-t">
                <label className="block text-xs font-semibold text-foreground">
                  {t("employee.attendance.geofenceReasonLabel", "سبب طلب الاستثناء")}
                </label>
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={t(
                    "employee.attendance.geofenceReasonPlaceholder",
                    "اكتب سبب طلب الاستثناء بالتفصيل..."
                  )}
                  className="text-sm"
                  disabled={submitting}
                />
                {errorMessage && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          {submitted ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("employee.attendance.close", "إغلاق")}
            </Button>
          ) : (
            <>
              {(isState1OutOfRange || isState2WeakAccuracy) && !showReasonInput && (
                <Button
                  onClick={handleOpenExceptionForm}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold"
                >
                  <Send className="h-4 w-4 ml-1.5" />
                  {t("employee.attendance.geofenceRequestException", "طلب استثناء")}
                </Button>
              )}

              {(isState1OutOfRange || isState2WeakAccuracy) && showReasonInput && (
                <Button
                  onClick={handleSubmitException}
                  disabled={submitting || !reason.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold"
                >
                  {submitting ? (
                    t("employee.attendance.geofenceSending", "جاري الإرسال...")
                  ) : (
                    <>
                      <Send className="h-4 w-4 ml-1.5" />
                      {t("employee.attendance.geofenceSubmitException", "إرسال طلب الاستثناء")}
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t("employee.attendance.close", "إغلاق")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
