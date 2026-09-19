import React, { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone } from "lucide-react";

interface LandingLivePreviewProps {
  /** Storefront URL of the landing (tenant subdomain). */
  customerUrl: string;
  /** Company id — required so the in-frame preview endpoint can resolve drafts. */
  companyId?: string;
  /**
   * Any change to this string reloads the frame (debounced). Feed it the
   * serialized editor snapshot + a save counter so refreshes land after
   * the autosave has persisted.
   */
  refreshToken: string;
  isMobileView: boolean;
}

const MOBILE_FRAME_WIDTH = 390;

/**
 * Live preview rendering the REAL storefront page inside an iframe —
 * same render pipeline customers see (sections, style variables, SEO meta),
 * unlike the old hand-written mock. Reloads (debounced) after edits are saved.
 */
export const LandingLivePreview: React.FC<LandingLivePreviewProps> = ({
  customerUrl,
  companyId,
  refreshToken,
  isMobileView,
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const embedUrl = useMemo(() => {
    if (!customerUrl) return "";
    try {
      const url = new URL(customerUrl);
      url.searchParams.set("preview", "1");
      if (companyId) url.searchParams.set("companyId", companyId);
      return url.toString();
    } catch {
      return customerUrl;
    }
  }, [customerUrl, companyId]);

  useEffect(() => {
    if (!embedUrl) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setLoaded(false);
      setReloadKey((k) => k + 1);
    }, 1200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [refreshToken, embedUrl]);

  if (!customerUrl) {
    return (
      <div className="eolp-preview-empty">
        احفظ الصفحة الأول عشان تظهر المعاينة الحية
      </div>
    );
  }

  return (
    <div className={`eolp-preview ${isMobileView ? "is-mobile" : "is-desktop"}`}>
      <div className="eolp-preview-toolbar">
        <span className="eolp-preview-dot" aria-hidden="true" />
        <span className="eolp-preview-label">معاينة حية — الصفحة الفعلية</span>
        <button
          type="button"
          className="eolp-preview-tool"
          onClick={() => {
            setLoaded(false);
            setReloadKey((k) => k + 1);
          }}
          aria-label="تحديث المعاينة"
          title="تحديث المعاينة"
        >
          <RefreshCw size={13} />
        </button>
        <a
          className="eolp-preview-tool"
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="فتح في تاب جديد"
          title="فتح في تاب جديد"
        >
          <ExternalLink size={13} />
        </a>
        <span className="eolp-preview-device">
          {isMobileView ? <Smartphone size={12} /> : <Monitor size={12} />}
        </span>
      </div>

      <div
        className="eolp-preview-stage"
        style={isMobileView ? { maxWidth: MOBILE_FRAME_WIDTH } : undefined}
      >
        {!loaded && <div className="eolp-preview-loading">جاري تحديث المعاينة…</div>}
        <iframe
          key={reloadKey}
          className="eolp-preview-frame"
          src={embedUrl}
          title="معاينة صفحة الهبوط الحية"
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      </div>
    </div>
  );
};
