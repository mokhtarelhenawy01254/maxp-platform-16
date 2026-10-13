import React, { useState } from "react";
import { Play } from "lucide-react";

/**
 * فيديو الشرح الرسمي للباقة (3:36 · عمودي) — يتحمّل عند التشغيل فقط (preload=none)
 * عشان ترافيك الإعلانات ماتحملش 30MB غير لما العميل يطلبها.
 */
export const CsbVideo: React.FC = () => {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="csb-section" id="video" style={{ paddingTop: 8 }}>
      <div className="csb-video-wrap csb-reveal">
        <div className="csb-video-copy">
          <span className="csb-sec-eyebrow">شوف قبل ما تدفع</span>
          <h2>فيديو 3 دقايق: الأوردر بيمشي إزاي جوه النظام؟</h2>
          <p>
            مش كلام تسويق — ده شاشة حقيقية من متجر شغال على MaxP: الأوردر بيجي من
            فين، بيتأكد إزاي، بيتجهز وبيتشحن، والفلوس بتتحسب فين. من الموبايل، زي
            ما هتشتغل بيه انت.
          </p>
        </div>

        <div className="csb-video-frame">
          <video
            controls
            playsInline
            preload="none"
            poster="/videos/csb-explainer-poster.jpg"
            src="/videos/csb-explainer-vertical.mp4"
            onPlay={() => setPlaying(true)}
            aria-label="فيديو شرح باقة المتجر الكاملة — 3 دقايق و36 ثانية"
          />
          {!playing && (
            <button
              type="button"
              className="csb-video-playbtn"
              aria-label="شغّل الفيديو"
              onClick={(e) => {
                const v = e.currentTarget.previousElementSibling as HTMLVideoElement;
                setPlaying(true);
                v.play().catch(() => setPlaying(false));
              }}
            >
              <Play size={30} strokeWidth={2.4} fill="currentColor" />
              <span>شغّل الفيديو — 3:36</span>
            </button>
          )}
          <span className="csb-video-badge">من متجر حقيقي شغال على MaxP</span>
        </div>
      </div>
    </section>
  );
};
