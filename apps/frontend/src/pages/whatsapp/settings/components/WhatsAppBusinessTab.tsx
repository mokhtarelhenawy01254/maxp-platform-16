import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import type {
  BusinessProfileState,
  Session,
} from "../types/whatsAppSettingsTypes";
import { businessCategoryKeys } from "../types/whatsAppSettingsTypes";
import {
  EmptyScopedSessionAlert,
  SessionScopeSelector,
} from "../utils/whatsAppSettingsUtils";

interface WhatsAppBusinessTabProps {
  connectedSessions: Session[];
  scopedSessionId: string;
  onScopedSessionChange: (id: string) => void;
  currentScopedSession: Session | null;
  businessProfile: BusinessProfileState | null;
  setBusinessProfile: React.Dispatch<
    React.SetStateAction<BusinessProfileState | null>
  >;
  loadingBusiness: boolean;
  saving: boolean;
  onSaveBusinessProfile: () => void;
}

export const WhatsAppBusinessTab: React.FC<WhatsAppBusinessTabProps> = ({
  connectedSessions,
  scopedSessionId,
  onScopedSessionChange,
  currentScopedSession,
  businessProfile,
  setBusinessProfile,
  loadingBusiness,
  saving,
  onSaveBusinessProfile,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <div className="space-y-4">
      <WhatsAppSurfaceCard
        title={ts("whatsappSettings.businessProfile")}
        description={ts("whatsappSettings.businessProfileAlert")}
        action={
          <SessionScopeSelector
            label={t("whatsappSettings.selectSession")}
            sessions={connectedSessions}
            value={scopedSessionId}
            onValueChange={onScopedSessionChange}
          />
        }
      >
        {connectedSessions.length === 0 ? (
          <EmptyScopedSessionAlert
            title={t("whatsappSettings.selectSession")}
            message={t("whatsappSettings.businessProfileAlert")}
          />
        ) : loadingBusiness ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        ) : businessProfile ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] bg-[color:var(--color-card)]/70 p-4 sm:p-5 space-y-4 shadow-none">
                <div className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] pb-3">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                    {ts("whatsappSettings.businessInfo")}
                  </h3>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {currentScopedSession?.name ||
                      ts("whatsappSettings.businessProfile")}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-description">
                      {t("whatsappSettings.businessDescription")}
                    </Label>
                    <Textarea
                      id="business-description"
                      value={businessProfile.description || ""}
                      onChange={(event) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, description: event.target.value }
                            : previous,
                        )
                      }
                      className="min-h-[7rem] bg-[color:var(--color-card)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-email">
                      {t("whatsappSettings.email")}
                    </Label>
                    <Input
                      id="business-email"
                      value={businessProfile.email || ""}
                      onChange={(event) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, email: event.target.value }
                            : previous,
                        )
                      }
                      className="h-11 bg-[color:var(--color-card)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-address">
                      {t("whatsappSettings.address")}
                    </Label>
                    <Input
                      id="business-address"
                      value={businessProfile.address || ""}
                      onChange={(event) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, address: event.target.value }
                            : previous,
                        )
                      }
                      className="h-11 bg-[color:var(--color-card)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("whatsappSettings.category")}</Label>
                    <Select
                      value={businessProfile.category || "OTHER"}
                      onValueChange={(value) =>
                        setBusinessProfile((previous) =>
                          previous
                            ? { ...previous, category: value ?? "" }
                            : previous,
                        )
                      }
                    >
                      <SelectTrigger className="h-11 bg-[color:var(--color-card)]">
                        <SelectValue
                          placeholder={ts("whatsappSettings.category")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {businessCategoryKeys.map((categoryKey) => (
                          <SelectItem key={categoryKey} value={categoryKey}>
                            {t(
                              `whatsappSettings.businessCategories.${categoryKey}`,
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] bg-[color:var(--color-card)]/70 p-4 sm:p-5 space-y-4 shadow-none">
                <div className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] pb-3">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                    {ts("whatsappSettings.websites")}
                  </h3>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {ts("whatsappSettings.addWebsite")}
                  </p>
                </div>
                <div className="space-y-3">
                  {(businessProfile.websites || []).length > 0 ? (
                    businessProfile.websites.map((website, index) => (
                      <div key={`${website}-${index}`} className="flex gap-2">
                        <Input
                          value={website}
                          onChange={(event) => {
                            setBusinessProfile((previous) => {
                              if (!previous) {
                                return previous;
                              }
                              const nextWebsites = [
                                ...(previous.websites || []),
                              ];
                              nextWebsites[index] = event.target.value;
                              return { ...previous, websites: nextWebsites };
                            });
                          }}
                          className="h-11 bg-[color:var(--color-card)]"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                          onClick={() =>
                            setBusinessProfile((previous) => {
                              if (!previous) {
                                return previous;
                              }
                              return {
                                ...previous,
                                websites: previous.websites.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              };
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                      <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
                      <AlertTitle>{t("whatsappSettings.websites")}</AlertTitle>
                      <AlertDescription>
                        {t("whatsappSettings.addWebsite")}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
                    onClick={() =>
                      setBusinessProfile((previous) =>
                        previous
                          ? {
                              ...previous,
                              websites: [...(previous.websites || []), ""],
                            }
                          : previous,
                      )
                    }
                  >
                    <Plus className="size-4" />
                    {t("whatsappSettings.addWebsite")}
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={onSaveBusinessProfile}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.saveBusinessProfile")}
            </Button>
          </div>
        ) : (
          <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
            <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
            <AlertTitle>{t("whatsappSettings.businessProfile")}</AlertTitle>
            <AlertDescription>
              {t("whatsappSettings.noBusinessProfile")}
            </AlertDescription>
          </Alert>
        )}
      </WhatsAppSurfaceCard>
    </div>
  );
};
