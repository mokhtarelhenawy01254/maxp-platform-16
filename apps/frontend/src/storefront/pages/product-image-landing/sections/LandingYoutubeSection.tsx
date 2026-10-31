import React from "react";

export interface LandingYoutubeSectionProps {
  section: any;
  idx: number;
}

export const LandingYoutubeSection: React.FC<LandingYoutubeSectionProps> = ({
  section,
  idx,
}) => {
  const content = section.content || {};
  const rawUrl = content.videoUrl || content.youtubeUrl || "";
  let ytId = content.videoId || "";
  if (!ytId && rawUrl) {
    const match = rawUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    ytId = match ? match[1] : "";
  }
  if (!ytId) return null;

  const title = content.title || content.heading;
  const isShorts = content.aspectRatio === "9/16";

  return (
    <section
      key={section.id || idx}
      className="pil-youtube-section"
      style={{
        backgroundColor: content.bgColor || "transparent",
        padding: "24px 16px",
        maxWidth: isShorts ? 400 : 760,
        margin: "0 auto",
      }}
    >
      {title && (
        <div className="pil-section-heading" style={{ marginBottom: 14 }}>
          <h2>{title}</h2>
        </div>
      )}
      <div
        style={{
          position: "relative",
          paddingBottom: isShorts ? "177.77%" : "56.25%",
          height: 0,
          overflow: "hidden",
          borderRadius: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          background: "#000",
        }}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
          title={title || "فيديو توضيحي"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {content.videoCaption && (
        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.85rem",
            marginTop: 8,
          }}
        >
          {content.videoCaption}
        </p>
      )}
    </section>
  );
};

export default LandingYoutubeSection;
