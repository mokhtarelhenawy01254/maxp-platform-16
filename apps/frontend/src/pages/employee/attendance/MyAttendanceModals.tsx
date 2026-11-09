import React from "react";
import { MapPin, Target } from "lucide-react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { envConfig } from "../../../config/environment";
import { SelectedMapLocation, TodayGoal, GeofenceModalData } from "./types";
import { AttendanceGeofenceDialog } from "./AttendanceGeofenceDialog";
import { AttendanceRegularizationDialog } from "./AttendanceRegularizationDialog";

interface MyAttendanceModalsProps {
  t: TFunction;
  showGoalsReviewDialog: boolean;
  onGoalsDialogChange: (open: boolean) => void;
  checkingOut: boolean;
  todayGoals: TodayGoal[];
  goalProgressDrafts: Record<string, string>;
  onGoalDraftChange: (goalId: string, val: string) => void;
  onSubmitGoalsAndCheckout: () => void;
  showMapModal: boolean;
  onMapModalChange: (open: boolean) => void;
  selectedLocation: SelectedMapLocation | null;
  showGeofenceModal: boolean;
  onGeofenceModalChange: (open: boolean) => void;
  geofenceModalData: GeofenceModalData | null;
  showRegularizationModal?: boolean;
  onRegularizationModalChange?: (open: boolean) => void;
  regularizeInitialTime?: string;
  onRegularizationSuccess?: () => void;
}

export const MyAttendanceModals: React.FC<MyAttendanceModalsProps> = ({
  t,
  showGoalsReviewDialog,
  onGoalsDialogChange,
  checkingOut,
  todayGoals,
  goalProgressDrafts,
  onGoalDraftChange,
  onSubmitGoalsAndCheckout,
  showMapModal,
  onMapModalChange,
  selectedLocation,
  showGeofenceModal,
  onGeofenceModalChange,
  geofenceModalData,
  showRegularizationModal = false,
  onRegularizationModalChange,
  regularizeInitialTime,
  onRegularizationSuccess,
}) => {
  return (
    <>
      <AttendanceGeofenceDialog
        open={showGeofenceModal}
        onOpenChange={onGeofenceModalChange}
        data={geofenceModalData}
        t={t}
      />
      {onRegularizationModalChange && (
        <AttendanceRegularizationDialog
          open={showRegularizationModal}
          onOpenChange={onRegularizationModalChange}
          initialTime={regularizeInitialTime}
          onSuccess={onRegularizationSuccess}
        />
      )}
      <Dialog
        open={showGoalsReviewDialog}
        onOpenChange={(open) => {
          if (!checkingOut) {
            onGoalsDialogChange(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              {t("employee.attendance.updateGoalsBeforeCheckout")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("employee.attendance.updateGoalsDesc")}
            </p>

            {todayGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-border/70 bg-muted/15 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium">{goal.title}</div>
                    <div className="text-xs font-mono tabular-nums text-muted-foreground">
                      {Number(goal.currentValue || 0).toLocaleString("ar-EG")} /{" "}
                      {Number(goal.targetValue || 0).toLocaleString("ar-EG")}{" "}
                      {goal.unit || ""}
                    </div>
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      {t("employee.attendance.currentProgress")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={goalProgressDrafts[goal.id] || ""}
                      onChange={(event) =>
                        onGoalDraftChange(goal.id, event.target.value)
                      }
                      className="font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onGoalsDialogChange(false)}
              disabled={checkingOut}
            >
              {t("employee.attendance.back")}
            </Button>
            <Button
              data-testid="attendance-goals-review-submit"
              onClick={onSubmitGoalsAndCheckout}
              disabled={checkingOut}
            >
              {checkingOut
                ? t("employee.attendance.savingAndCheckout")
                : t("employee.attendance.saveAndCheckout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMapModal} onOpenChange={onMapModalChange}>
        <DialogContent className="sm:max-w-4xl sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("employee.attendance.location", {
                type: selectedLocation?.type,
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedLocation && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono tabular-nums">
                    <strong>{t("employee.attendance.coordinates")}</strong>{" "}
                    {selectedLocation.latitude.toFixed(6)},{" "}
                    {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>

                <div className="w-full h-96 rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=${envConfig.googleMapsApiKey || ""}&q=${selectedLocation.latitude},${selectedLocation.longitude}&zoom=16`}
                    allowFullScreen
                    title={t("employee.attendance.location", {
                      type: selectedLocation.type,
                    })}
                  />
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`;
                      window.open(url, "_blank");
                    }}
                  >
                    {t("employee.attendance.openInGoogleMaps")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${selectedLocation.latitude}, ${selectedLocation.longitude}`,
                      );
                      toast.success(
                        t("employee.attendance.coordinatesCopied"),
                      );
                    }}
                  >
                    {t("employee.attendance.copyCoordinates")}
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onMapModalChange(false)}>
              {t("employee.attendance.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
