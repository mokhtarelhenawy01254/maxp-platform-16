import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  Key,
  Settings,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MetaCloudManualSection } from "./MetaCloudManualSection";
import { MetaCloudAdvancedSection } from "./MetaCloudAdvancedSection";

interface SessionMetaCloudStepProps {
  newSessionName: string;
  newMetaPhoneNumberId: string;
  setNewMetaPhoneNumberId: (val: string) => void;
  newMetaWabaId: string;
  setNewMetaWabaId: (val: string) => void;
  newMetaBusinessId: string;
  setNewMetaBusinessId: (val: string) => void;
  newMetaAccessToken: string;
  setNewMetaAccessToken: (val: string) => void;
  newMetaApiVersion: string;
  setNewMetaApiVersion: (val: string) => void;
  newMetaWebhookVerifyToken: string;
  setNewMetaWebhookVerifyToken: (val: string) => void;
  newMetaWebhookSecret: string;
  setNewMetaWebhookSecret: (val: string) => void;
  newMetaDisplayPhoneNumber: string;
  setNewMetaDisplayPhoneNumber: (val: string) => void;
  showManualMeta: boolean;
  setShowManualMeta: (val: boolean | ((prev: boolean) => boolean)) => void;
  showAdvancedMeta: boolean;
  setShowAdvancedMeta: (val: boolean | ((prev: boolean) => boolean)) => void;
  generateRandomVerifyToken: () => string;
  getMetaWebhookUrl: () => string;
}

export const SessionMetaCloudStep: React.FC<SessionMetaCloudStepProps> = ({
  newSessionName,
  newMetaPhoneNumberId,
  setNewMetaPhoneNumberId,
  newMetaWabaId,
  setNewMetaWabaId,
  newMetaBusinessId,
  setNewMetaBusinessId,
  newMetaAccessToken,
  setNewMetaAccessToken,
  newMetaApiVersion,
  setNewMetaApiVersion,
  newMetaWebhookVerifyToken,
  setNewMetaWebhookVerifyToken,
  newMetaWebhookSecret,
  setNewMetaWebhookSecret,
  newMetaDisplayPhoneNumber,
  setNewMetaDisplayPhoneNumber,
  showManualMeta,
  setShowManualMeta,
  showAdvancedMeta,
  setShowAdvancedMeta,
  generateRandomVerifyToken,
  getMetaWebhookUrl,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1-Click Embedded Sign-up Hero */}
      <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
              <Globe className="size-6" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-[color:var(--color-foreground)]">
                الربط التلقائي السريع مع فيسبوك
              </h4>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                ربط مباشر لحسابك التجاري ورقمك بضغطة زر واحدة (Embedded Sign-up)
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-300 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200 text-[10px] shrink-0 font-medium"
          >
            موصى به
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--color-muted-foreground)] py-0.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>توثيق رسمي ومعتمد</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>يعمل 24/7 دون هاتف</span>
          </div>
        </div>

        <Button
          type="button"
          className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10 sm:h-11 shadow-sm gap-2 text-xs sm:text-sm"
          onClick={() =>
            navigate(
              `/whatsapp/cloud-connect?sessionName=${encodeURIComponent(
                newSessionName,
              )}`,
            )
          }
        >
          <Zap className="size-4" />
          بدء الربط التلقائي الآن
          <ExternalLink className="size-3.5 ms-1" />
        </Button>
      </div>

      {/* Collapsible Manual Setup */}
      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowManualMeta((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-start font-medium text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs sm:text-sm text-[color:var(--color-muted-foreground)]">
            <Key className="size-4 text-[color:var(--color-primary)]" />
            إدخال المفاتيح والرموز يدوياً (للمطورين)
          </span>
          <ChevronRight
            className={cn(
              "size-4 transition-transform duration-200",
              showManualMeta ? "-rotate-90" : "",
            )}
          />
        </button>

        {showManualMeta && (
          <MetaCloudManualSection
            newMetaPhoneNumberId={newMetaPhoneNumberId}
            setNewMetaPhoneNumberId={setNewMetaPhoneNumberId}
            newMetaAccessToken={newMetaAccessToken}
            setNewMetaAccessToken={setNewMetaAccessToken}
            newMetaWabaId={newMetaWabaId}
            setNewMetaWabaId={setNewMetaWabaId}
            newMetaBusinessId={newMetaBusinessId}
            setNewMetaBusinessId={setNewMetaBusinessId}
            newMetaWebhookVerifyToken={newMetaWebhookVerifyToken}
            setNewMetaWebhookVerifyToken={setNewMetaWebhookVerifyToken}
            generateRandomVerifyToken={generateRandomVerifyToken}
            getMetaWebhookUrl={getMetaWebhookUrl}
          />
        )}
      </div>

      {/* Collapsible Advanced Settings */}
      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedMeta((prev) => !prev)}
          className="flex w-full items-center justify-between px-5 py-4 text-start font-medium text-[color:var(--color-foreground)] cursor-pointer"
        >
          <span className="flex items-center gap-2 text-sm">
            <Settings className="size-4 text-[color:var(--color-muted-foreground)]" />
            إعدادات متقدمة
          </span>
          <ChevronRight
            className={cn(
              "size-4 transition-transform duration-200",
              showAdvancedMeta ? "-rotate-90" : "",
            )}
          />
        </button>

        {showAdvancedMeta && (
          <MetaCloudAdvancedSection
            newMetaApiVersion={newMetaApiVersion}
            setNewMetaApiVersion={setNewMetaApiVersion}
            newMetaDisplayPhoneNumber={newMetaDisplayPhoneNumber}
            setNewMetaDisplayPhoneNumber={setNewMetaDisplayPhoneNumber}
            newMetaWebhookSecret={newMetaWebhookSecret}
            setNewMetaWebhookSecret={setNewMetaWebhookSecret}
          />
        )}
      </div>
    </div>
  );
};
