import React from "react";
import { Link } from "react-router-dom";
import {
  PlayCircle,
  AlertCircle,
  Shield,
  MessageSquare,
  Headphones,
  FileText,
  Users,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import {
  getYouTubeEmbedUrl,
  getDirectVideoUrl,
} from "@/utils/explanationVideo";
import { formatInstallCount } from "@/utils/marketplace";
import {
  formatMoney,
  safeParseJson,
} from "../../types/appDetailsTypes";

interface AppDetailsAuxiliarySectionsProps {
  app: MPA;
  appExplanation: { title: string; videoUrl: string | null } | null;
}

export const AppDetailsAuxiliarySections: React.FC<AppDetailsAuxiliarySectionsProps> = ({
  app,
  appExplanation,
}) => {
  const { t } = useTranslation();

  const limitations = safeParseJson(app.limitations);
  const requiredApps = safeParseJson(app.requiredApps);
  const normalizedRequiredApps = Array.isArray(requiredApps) ? requiredApps : [];

  return (
    <div className="space-y-5">
      {/* Video Explanation Section */}
      {appExplanation?.videoUrl && (
        <section className="rounded-2xl border bg-card p-5 text-right">
          <h2 className="text-xl font-extrabold text-foreground mb-4 flex items-center justify-end gap-2">
            <span>شرح بالفيديو</span>
            <PlayCircle size={20} className="text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            {appExplanation.title}
          </p>
          <div className="overflow-hidden rounded-xl bg-black/90 mx-auto w-full max-w-3xl">
            {getYouTubeEmbedUrl(appExplanation.videoUrl) ? (
              <iframe
                src={getYouTubeEmbedUrl(appExplanation.videoUrl) as string}
                title={appExplanation.title}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : getDirectVideoUrl(appExplanation.videoUrl) ? (
              <video
                src={getDirectVideoUrl(appExplanation.videoUrl) as string}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[70vh]"
              />
            ) : (
              <video
                src={appExplanation.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[70vh]"
              />
            )}
          </div>
        </section>
      )}

      {/* Pricing Rules */}
      {app.pricingRules && app.pricingRules.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 text-right">
          <h2 className="text-xl font-extrabold text-foreground">
            {t("marketplace.pricing")}
          </h2>
          <div className="mt-4 space-y-3">
            {app.pricingRules.map(
              (rule: {
                id: string;
                name: string;
                description?: string;
                price: number;
              }) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3"
                >
                  <div className="text-left text-lg font-extrabold text-primary tabular-nums font-mono">
                    {formatMoney(rule.price)}
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-foreground font-bold">{rule.name}</div>
                    {rule.description && (
                      <div className="text-muted-foreground mt-1 text-sm">
                        {rule.description}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Requirements & Limitations */}
      {(normalizedRequiredApps.length > 0 || limitations) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {normalizedRequiredApps.length > 0 && (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-right">
              <h3 className="text-foreground mb-3 flex items-center justify-end gap-2 font-bold">
                <span>متطلبات التشغيل</span>
                <AlertCircle size={19} className="text-amber-600" />
              </h3>
              <ul className="space-y-2">
                {normalizedRequiredApps.map(
                  (
                    req: { slug?: string; name?: string } | string,
                    idx: number
                  ) => (
                    <li
                      key={idx}
                      className="flex items-center justify-end gap-2 text-sm font-bold"
                    >
                      <span>
                        {typeof req === "string"
                          ? req
                          : req.name || req.slug || ""}
                      </span>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </li>
                  )
                )}
              </ul>
            </section>
          )}
          {limitations && Object.keys(limitations).length > 0 && (
            <section className="rounded-2xl border bg-card p-5 text-right">
              <h3 className="text-foreground mb-3 flex items-center justify-end gap-2 font-bold">
                <span>القيود</span>
                <Shield size={19} className="text-primary" />
              </h3>
              <ul className="space-y-2">
                {Object.entries(limitations).map(([key, value]) => (
                  <li key={key} className="text-sm text-muted-foreground">
                    <span className="text-foreground font-bold">{key}:</span>{" "}
                    {String(value)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Support & Documentation Links */}
      <section className="rounded-2xl border bg-card p-5 text-right">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground flex items-center justify-end gap-2 font-bold">
            <span>{t("marketplace.support")}</span>
            <MessageSquare size={19} className="text-primary" />
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/support"
            className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">الدعم الفني</p>
              <p className="text-xs text-muted-foreground">تواصل مع فريق الدعم</p>
            </div>
          </Link>
          {app.docsUrl && (
            <Link
              to={app.docsUrl}
              target="_blank"
              className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {t("marketplace.documentation")}
                </p>
                <p className="text-xs text-muted-foreground">
                  دليل الاستخدام الكامل
                </p>
              </div>
            </Link>
          )}
          {app.privacyPolicy && (
            <Link
              to={app.privacyPolicy}
              target="_blank"
              className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {t("marketplace.privacyPolicy")}
                </p>
                <p className="text-xs text-muted-foreground">سياسة الخصوصية</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Developer Information Card */}
      {app.developer && (
        <section className="rounded-2xl border bg-card p-5 text-right">
          <h3 className="text-foreground mb-4 flex items-center justify-end gap-2 font-bold">
            <span>{t("marketplace.developerInfo")}</span>
            <Users size={19} className="text-primary" />
          </h3>
          <div className="flex items-start gap-4">
            {app.developer.logo && (
              <img
                src={app.developer.logo}
                alt=""
                className="size-12 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-extrabold text-foreground">
                {app.developer.name}
              </h4>
              {app.developer.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {app.developer.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                {app.developer.totalApps && (
                  <span className="tabular-nums font-mono">
                    {app.developer.totalApps}{" "}
                    <span className="font-sans">تطبيق</span>
                  </span>
                )}
                {app.developer.totalDownloads && (
                  <span className="tabular-nums font-mono">
                    {formatInstallCount(app.developer.totalDownloads)}{" "}
                    <span className="font-sans">تحميل</span>
                  </span>
                )}
                {app.developer.averageRating && (
                  <span className="inline-flex items-center gap-0.5 tabular-nums font-mono">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    {app.developer.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
