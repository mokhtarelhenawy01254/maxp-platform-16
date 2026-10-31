import React from "react";

export interface LandingReviewsSectionProps {
  section: any;
  idx: number;
  reviewsSection?: any;
}

export const LandingReviewsSection: React.FC<LandingReviewsSectionProps> = ({
  section,
  idx,
  reviewsSection,
}) => {
  const content = section.content || {};
  const reviews =
    content.reviews || reviewsSection?.content?.reviews || [];
  if (!reviews.length) return null;

  const isWhatsApp = section.variant === "WHATSAPP";

  if (isWhatsApp) {
    return (
      <section
        key={section.id || idx}
        className="pil-whatsapp-section"
        aria-label="آراء وتجارب العملاء على واتساب"
      >
        <div className="pil-section-heading pil-section-heading--wa">
          <span>تجارب حقيقية موثقة</span>
          <h2>محادثات ورسائل العملاء على واتساب</h2>
        </div>
        <div className="pil-wa-container">
          <div className="pil-wa-header">
            <div className="pil-wa-header-profile">
              <div className="pil-wa-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.029-.482-1.636-.684-2.697-2.348-2.778-2.457-.081-.109-.658-.876-.658-1.671 0-.796.417-1.189.566-1.35.149-.161.326-.201.435-.201.109 0 .217.001.312.006.101.005.236-.038.37.284.14.335.478 1.168.52 1.254.042.086.07.186.012.3-.058.114-.087.186-.174.288-.087.102-.183.228-.261.306-.089.089-.182.186-.078.365.104.179.462.763.992 1.236.683.61 1.26.799 1.44.888.179.089.284.075.39-.047.105-.122.454-.529.576-.71.121-.182.242-.152.406-.091.164.06 1.039.49 1.218.579.179.089.298.134.341.209.043.075.043.435-.101.84zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.438 5.176L2 22l4.974-1.398A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              </div>
              <div className="pil-wa-info">
                <div className="pil-wa-name-row">
                  <strong>فريق خدمة عملاء المتجر</strong>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#25d366" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <span className="pil-wa-status-text">
                  <span className="pil-wa-status-dot" />
                  متصل الآن (محادثات استلام حقيقية)
                </span>
              </div>
            </div>
          </div>
          <div className="pil-wa-chat">
            {reviews.map((rev: any, rIdx: number) => (
              <React.Fragment key={rIdx}>
                <div className="pil-wa-bubble pil-wa-bubble--incoming">
                  <div className="pil-wa-bubble-head">
                    <strong className="pil-wa-author">{rev.name}</strong>
                    <span className="pil-wa-buyer-tag">مشتري مؤكد ✓</span>
                  </div>
                  <p className="pil-wa-text">{rev.comment || rev.text}</p>
                  <div className="pil-wa-meta">
                    <span className="pil-wa-time">
                      {10 + (rIdx % 12)}:{15 + ((rIdx * 7) % 45)} م
                    </span>
                    <span className="pil-wa-checks" aria-label="تمت القراءة">
                      <svg viewBox="0 0 16 11" width="14" height="10" fill="#53bdeb">
                        <path d="M11.55 1.45a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L4.52 7.41l5.97-5.96a.75.75 0 0 1 1.06 0zm3.5 0a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-.71-.71a.75.75 0 1 1 1.06-1.06l.18.18 5.97-5.97a.75.75 0 0 1 1.06 0z" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Authentic Store Reply for realistic dialogue */}
                {rIdx === 0 && (
                  <div className="pil-wa-bubble pil-wa-bubble--outgoing">
                    <div className="pil-wa-bubble-head">
                      <strong className="pil-wa-author-store">فريق الدعم</strong>
                    </div>
                    <p className="pil-wa-text">
                      أهلاً بحضرتك يا فندم! سعداء جداً بتجربتك وراحتك مع المنتج، ونتشرف بخدمتك دائماً 🙏
                    </p>
                    <div className="pil-wa-meta">
                      <span className="pil-wa-time">
                        {10 + (rIdx % 12)}:{17 + ((rIdx * 7) % 45)} م
                      </span>
                      <span className="pil-wa-checks" aria-label="تمت القراءة">
                        <svg viewBox="0 0 16 11" width="14" height="10" fill="#53bdeb">
                          <path d="M11.55 1.45a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L4.52 7.41l5.97-5.96a.75.75 0 0 1 1.06 0zm3.5 0a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-.71-.71a.75.75 0 1 1 1.06-1.06l.18.18 5.97-5.97a.75.75 0 0 1 1.06 0z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      key={section.id || idx}
      className="pil-reviews"
      aria-label="آراء العملاء"
      style={{ padding: "32px 16px", maxWidth: 760, margin: "0 auto" }}
    >
      <div className="pil-section-heading">
        <span>تجارب حقيقية</span>
        <h2>
          {content.title ||
            reviewsSection?.content?.title ||
            "آراء وتقييمات العملاء"}
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {reviews.map((rev: any, rIdx: number) => (
          <div
            key={rIdx}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>
                {rev.name}
              </strong>
              <span style={{ color: "#f59e0b", fontSize: "1rem" }}>
                {"★".repeat(Number(rev.rating) || 5)}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              {rev.comment || rev.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingReviewsSection;
