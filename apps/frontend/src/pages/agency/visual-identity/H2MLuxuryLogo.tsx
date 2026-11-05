import React, { useState } from "react";

export const H2M_LOGO_SRC = "/brand/h2m-logo.webp";

interface H2MLuxuryLogoProps {
  className?: string;
}

/** Typographic gold extrusion used only if the logo image fails to load. */
const FallbackMark: React.FC<{ className?: string }> = ({ className = "" }) => {
  const depth = Array.from({ length: 9 }, (_, i) => i + 1);
  const common = {
    x: 200,
    y: 135,
    textAnchor: "middle" as const,
    fontSize: 128,
    fontWeight: 900,
    fontFamily: "Montserrat, 'Arial Black', Impact, sans-serif",
    letterSpacing: -2,
  };
  return (
    <svg
      viewBox="0 0 400 190"
      role="img"
      aria-label="H2M"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="h2mFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="35%" stopColor="#FFD368" />
          <stop offset="75%" stopColor="#D99518" />
          <stop offset="100%" stopColor="#8A520E" />
        </linearGradient>
      </defs>
      {depth.map((i) => (
        <text key={i} {...common} x={common.x + i * 0.9} y={common.y + i * 0.9} fill="#5B3518">
          H2M
        </text>
      ))}
      <text {...common} fill="url(#h2mFace)" stroke="#FFF4C7" strokeOpacity="0.55" strokeWidth="0.8">
        H2M
      </text>
    </svg>
  );
};

export const H2MLuxuryLogo: React.FC<H2MLuxuryLogoProps> = ({ className = "" }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <FallbackMark className={className} />;
  return (
    <img
      src={H2M_LOGO_SRC}
      alt="شعار H2M"
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
};
