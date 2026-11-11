import React from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw, Info } from "lucide-react";
import { FacebookIcon } from "../../../components/icons/brands";
import { Button } from "../../../components/ui/button";
import { FacebookOAuthImportProgress } from "./FacebookOAuthImportProgress";

interface FacebookOAuthConnectCardProps {
  loading: boolean;
  hasCompanyId: boolean;
  onConnect: (reauthorize?: boolean) => void;
}

export const FacebookOAuthConnectCard: React.FC<FacebookOAuthConnectCardProps> = ({
  loading,
  hasCompanyId,
  onConnect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/80 bg-card p-6 text-center sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 mb-3 shadow-sm">
        <FacebookIcon className="h-6 w-6" />
      </div>

      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        {t("facebookOAuth.facebookInstagram", "ربط صفحات فيسبوك وإنستجرام")}
      </h3>
      <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
        {t(
          "facebookOAuth.description",
          "اربط حساب فيسبوك أو إنستجرام عشان تقدر تستقبل رسايل العملاء وتدير المحادثات والتعليقات من منصة واحدة.",
        )}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <Button
          onClick={() => onConnect(false)}
          disabled={loading || !hasCompanyId}
          className="h-8 gap-1.5 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {loading
            ? t("facebookOAuth.loading", "جاري التحميل...")
            : t("facebookOAuth.connectWithFacebook", "ربط مع Facebook")}
        </Button>

        <Button
          variant="outline"
          onClick={() => onConnect(true)}
          disabled={loading || !hasCompanyId}
          className="h-8 gap-1.5 text-xs font-medium"
          title={t("facebookOAuth.reselectPagesTooltip")}
        >
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          {t("facebookOAuth.reselectPagesInitial", "إعادة اختيار الصفحات")}
        </Button>
      </div>

      {/* 📦 تقدم استيراد الصفحات في الخلفية (بيقرأ من store مش props) */}
      <FacebookOAuthImportProgress />

      <div className="mt-4 flex max-w-md items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-start text-[11px] text-blue-700 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0" />
        <p className="leading-normal">
          {t(
            "facebookOAuth.reconnectPagesHelpTip",
            "تأكد من تفعيل صلاحيات إدارة الصفحات والرسائل في نافذة فيسبوك لضمان استقبال الرسائل بدون انقطاع.",
          )}
        </p>
      </div>

      {!hasCompanyId && (
        <p className="mt-2 text-xs text-destructive">
          {t("facebookOAuth.companyIdMissing", "معرف الشركة غير متوفر")}
        </p>
      )}
    </div>
  );
};
