import React from "react";

export interface LandingLiveProofSectionProps {
  section: any;
  idx: number;
  productName: string;
}

export const LandingLiveProofSection: React.FC<LandingLiveProofSectionProps> = ({
  section,
  idx,
  productName,
}) => {
  const content = section.content || {};
  const satisfaction =
    content.satisfactionRate || "4.9 / 5 (أكثر من 1,420 تقييم)";
  const recent = content.recentOrders || [
    {
      buyer: "أميرة م.",
      city: "مدينة نصر، القاهرة",
      timeAgo: "منذ 4 دقائق",
      item: productName,
    },
    {
      buyer: "محمود ع.",
      city: "سموحة، الإسكندرية",
      timeAgo: "منذ 11 دقيقة",
      item: `${productName} (باقة قطعتين)`,
    },
    {
      buyer: "نورهان س.",
      city: "المنصورة، الدقهلية",
      timeAgo: "منذ 19 دقيقة",
      item: productName,
    },
  ];

  return (
    <div
      key={section.id || idx}
      className="pil-liveproof-strip"
      aria-label="الإثبات الاجتماعي"
    >
      <div className="pil-liveproof-inner">
        <div className="pil-liveproof-header-row">
          <div className="pil-liveproof-badge">
            <span className="pil-live-dot" />
            <strong>طلب مباشر نشط الآن</strong>
          </div>
          <div className="pil-liveproof-rating">
            <svg
              className="pil-star-svg"
              viewBox="0 0 20 20"
              width="13"
              height="13"
              fill="#f59e0b"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="pil-liveproof-rating-val">{satisfaction}</span>
          </div>
        </div>
        <div className="pil-liveproof-ticker">
          <span>
            طلب مؤكد: {recent[0]?.buyer ? `${recent[0].buyer} · ` : ""}{recent[0]?.city} — {recent[0]?.item} (
            {recent[0]?.timeAgo})
          </span>
        </div>
      </div>
    </div>
  );
};

export default LandingLiveProofSection;
