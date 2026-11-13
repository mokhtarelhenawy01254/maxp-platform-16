import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import { PortalInviteAndPushCard } from "../../../admin/education-management/PortalInviteAndPushCard";
import { MODAL_INPUT_CLS } from "../../shared";
import { sectionCardCls, labelCls } from "../types/settingsTypes";

interface WhatsappSettingsSectionProps {
  readyTemplate: string;
  setReadyTemplate: (val: string) => void;
  receivedTemplate: string;
  setReceivedTemplate: (val: string) => void;
  overdueTemplate: string;
  setOverdueTemplate: (val: string) => void;
}

export function WhatsappSettingsSection({
  readyTemplate,
  setReadyTemplate,
  receivedTemplate,
  setReceivedTemplate,
  overdueTemplate,
  setOverdueTemplate,
}: WhatsappSettingsSectionProps) {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n?.language === "en");
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  const [pushFirstSaveWhatsApp, setPushFirstSaveWhatsApp] = useState<boolean>(true);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [savingPushFirst, setSavingPushFirst] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get("/portal/push/preference")
      .then((res) => {
        if (!active || !res.data?.success) return;
        const d = res.data.data;
        if (typeof d?.pushFirstSaveWhatsApp === "boolean") {
          setPushFirstSaveWhatsApp(d.pushFirstSaveWhatsApp);
        }
        setCompanySlug(d?.companySlug || null);
        setPublicCode(d?.publicCode || null);
        setCustomDomain(d?.customDomain || null);
      })
      .catch(() => {
        // Silently fallback to defaults if endpoint unreachable
      });
    return () => {
      active = false;
    };
  }, []);

  const handleTogglePushFirst = async (next: boolean) => {
    if (savingPushFirst) return;
    const prev = pushFirstSaveWhatsApp;
    setPushFirstSaveWhatsApp(next);
    setSavingPushFirst(true);
    try {
      await apiClient.put("/portal/push/preference", { pushFirstSaveWhatsApp: next });
      toast.success(
        next
          ? (isEn ? "Dentist push-first notifications enabled" : "تم تفعيل إشعارات بوابة الطبيب أولاً وتوفير الواتساب")
          : (isEn ? "Dentist push-first notifications disabled" : "تم إيقاف نمط إشعارات البوابة أولاً")
      );
    } catch (err: any) {
      setPushFirstSaveWhatsApp(prev);
      toast.error(err?.response?.data?.message || err?.message || (isEn ? "Failed to update notification setting" : "تعذر تحديث إعداد الإشعارات"));
    } finally {
      setSavingPushFirst(false);
    }
  };

  return (
    <div className="space-y-5">
      <PortalInviteAndPushCard
        portal="dental"
        companySlug={companySlug}
        publicCode={publicCode}
        customDomain={customDomain}
        pushFirstSaveWhatsApp={pushFirstSaveWhatsApp}
        onTogglePushFirst={handleTogglePushFirst}
        savingPushFirst={savingPushFirst}
        isEn={isEn}
      />

      <div className={`${sectionCardCls} space-y-4`}>
        <div>
          <h3 className="font-semibold">
            {t("dentalLab.settings.whatsappTemplates")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.settings.whatsappHint")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>
              {t("dentalLab.settings.readyTemplate")}
            </label>
            <textarea
              className={`${inputCls} min-h-[70px] resize-y`}
              value={readyTemplate}
              onChange={(e) => setReadyTemplate(e.target.value)}
              placeholder={t("dentalLab.settings.readyPlaceholder")}
            />
          </div>
          <div>
            <label className={labelCls}>
              {t("dentalLab.settings.receivedTemplate")}
            </label>
            <textarea
              className={`${inputCls} min-h-[70px] resize-y`}
              value={receivedTemplate}
              onChange={(e) => setReceivedTemplate(e.target.value)}
              placeholder={t("dentalLab.settings.receivedPlaceholder")}
            />
          </div>
          <div>
            <label className={labelCls}>
              {t("dentalLab.settings.overdueTemplate")}
            </label>
            <textarea
              className={`${inputCls} min-h-[70px] resize-y`}
              value={overdueTemplate}
              onChange={(e) => setOverdueTemplate(e.target.value)}
              placeholder={t("dentalLab.settings.overduePlaceholder")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsappSettingsSection;
