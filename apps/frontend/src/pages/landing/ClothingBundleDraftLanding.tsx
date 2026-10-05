import React, { useEffect } from "react";

/**
 * Draft preview frames for the «باقة متجر الملابس» landing directions (A/B/C).
 * Each renders the standalone static page (public/lp/*.html) inside an iframe:
 * pixel-perfect, no CSS leakage into the platform shell, and the static page
 * itself keeps its no-JS guarantee. Drafts are noindex; public launch requires
 * Mokhtar's written approval and picking one direction (A/B/C).
 */
const ClothingBundleDraftFrame: React.FC<{ src: string; label: string }> = ({ src, label }) => {
  useEffect(() => {
    document.title = `${label} — مسودة مراجعة | Max P`;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, [label]);

  return (
    <iframe
      src={src}
      title={label}
      className="w-full h-screen border-0 bg-white"
      loading="eager"
    />
  );
};

export const ClothingBundleDraftA: React.FC = () => (
  <ClothingBundleDraftFrame src="/lp/clothing-bundle.html" label="باقة متجر الملابس — الاتجاه أ (فاتح/تحريري)" />
);

export const ClothingBundleDraftB: React.FC = () => (
  <ClothingBundleDraftFrame src="/lp/clothing-bundle-b.html" label="باقة متجر الملابس — الاتجاه ب (غرفة تحكم)" />
);

export const ClothingBundleDraftC: React.FC = () => (
  <ClothingBundleDraftFrame src="/lp/clothing-bundle-c.html" label="باقة متجر الملابس — الاتجاه ج (رسالة طويلة)" />
);

export default ClothingBundleDraftFrame;
