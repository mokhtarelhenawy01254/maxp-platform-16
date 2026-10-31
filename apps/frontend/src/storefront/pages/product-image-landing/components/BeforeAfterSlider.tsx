import React, { useRef, useState } from "react";

export interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = "قبل (بدائل السوق)",
  afterLabel = "بعد (المنتج الأصلي)",
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = (clientX: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPos(Math.round(pct));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="pil-before-after-container">
      <div
        ref={stageRef}
        className="pil-ba-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        {/* After / Our Product image (Base) */}
        {afterImage && (
          <img
            src={afterImage}
            alt={afterLabel}
            className="pil-ba-img pil-ba-after"
            draggable={false}
          />
        )}

        {/* Before / Competitor image (Clipped) */}
        <div
          className="pil-ba-clipped"
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
        >
          {beforeImage && (
            <img
              src={beforeImage}
              alt={beforeLabel}
              className="pil-ba-img pil-ba-before"
              draggable={false}
            />
          )}
        </div>

        {/* Corner Badges: permanently visible on opposite corners, never clipped */}
        <span className="pil-ba-badge pil-ba-badge-before">{beforeLabel}</span>
        <span className="pil-ba-badge pil-ba-badge-after">{afterLabel}</span>

        {/* Divider Line & Handle */}
        <div className="pil-ba-divider" style={{ left: `${sliderPos}%` }}>
          <div className="pil-ba-handle">
            <span>⇄</span>
          </div>
        </div>

        {/* Accessible range input for keyboard / screen readers */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="pil-ba-range"
          aria-label="مقارنة الصورة قبل وبعد"
        />
      </div>
      <p className="pil-ba-hint">مرر السلايدر يميناً ويساراً للمقارنة المباشرة باللمس</p>
    </div>
  );
};

export default BeforeAfterSlider;
