import React from "react";

interface H2MLuxuryLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const H2MLuxuryLogo: React.FC<H2MLuxuryLogoProps> = ({
  className = "",
  size = 280,
  showText = true,
}) => {
  return (
    <svg
      viewBox="0 0 600 500"
      width={size}
      height={(size * 5) / 6}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      <defs>
        {/* Gradients for Luxury 3D Gold */}
        <linearGradient id="h2mGoldBright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4B8" />
          <stop offset="30%" stopColor="#FFD368" />
          <stop offset="70%" stopColor="#D99518" />
          <stop offset="100%" stopColor="#8A520E" />
        </linearGradient>

        <linearGradient id="h2mGoldDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B37812" />
          <stop offset="50%" stopColor="#5B3518" />
          <stop offset="100%" stopColor="#2A1608" />
        </linearGradient>

        <linearGradient id="h2mGoldBevelTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="25%" stopColor="#FFD368" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#D99518" stopOpacity="0.3" />
        </linearGradient>

        <linearGradient id="h2mGoldBevelSide" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5B3518" />
          <stop offset="60%" stopColor="#331C0B" />
          <stop offset="100%" stopColor="#150B04" />
        </linearGradient>

        <radialGradient id="h2mBackGlow" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFD368" stopOpacity="0.18" />
          <stop offset="40%" stopColor="#D99518" stopOpacity="0.08" />
          <stop offset="80%" stopColor="#242424" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="h2mHexBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD368" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#D99518" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5B3518" stopOpacity="0.5" />
        </linearGradient>

        {/* Soft Drop Shadow Filter */}
        <filter id="h2mDropShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000000" floodOpacity="0.75" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#D99518" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ambient Radial Golden Glow */}
      <rect width="600" height="500" rx="28" fill="#000000" />
      <circle cx="300" cy="210" r="230" fill="url(#h2mBackGlow)" />

      {/* Geometric Hexagonal Outer Shield */}
      <polygon
        points="300,50 470,145 470,335 300,430 130,335 130,145"
        stroke="url(#h2mHexBorder)"
        strokeWidth="1.5"
        fill="#0A0A0C"
        fillOpacity="0.65"
        filter="url(#h2mDropShadow)"
      />

      {/* Inner Concentric Diamond Frame */}
      <polygon
        points="300,68 450,152 450,325 300,410 150,325 150,152"
        stroke="#FFD368"
        strokeWidth="0.75"
        strokeOpacity="0.2"
        fill="none"
      />

      {/* Corner Tech Anchors */}
      <circle cx="300" cy="50" r="3" fill="#FFD368" />
      <circle cx="470" cy="145" r="3" fill="#D99518" />
      <circle cx="470" cy="335" r="3" fill="#D99518" />
      <circle cx="300" cy="430" r="3" fill="#FFD368" />
      <circle cx="130" cy="335" r="3" fill="#D99518" />
      <circle cx="130" cy="145" r="3" fill="#D99518" />

      {/* ==================== 3D EMBLEM: INTERLOCKING H2M ==================== */}
      <g filter="url(#h2mDropShadow)">
        {/* ----- LETTER H (Left Wing) ----- */}
        {/* Left Column Front */}
        <polygon points="180,140 215,120 215,310 180,330" fill="url(#h2mGoldBright)" />
        {/* Left Column Top Bevel */}
        <polygon points="180,140 215,120 230,130 195,150" fill="url(#h2mGoldBevelTop)" />
        {/* Left Column Right Bevel */}
        <polygon points="215,120 230,130 230,320 215,310" fill="url(#h2mGoldBevelSide)" />

        {/* H Crossbar & Connectors */}
        <polygon points="215,205 270,180 270,215 215,240" fill="url(#h2mGoldBright)" />
        <polygon points="215,205 270,180 275,185 220,210" fill="url(#h2mGoldBevelTop)" />
        <polygon points="215,240 270,215 270,225 215,250" fill="url(#h2mGoldDark)" />

        {/* ----- DIGIT 2 (Center Crest & Diagonal Bridge) ----- */}
        {/* Top Arch of 2 */}
        <path
          d="M 265,155 C 265,120 325,110 345,140 C 355,155 345,175 320,195 L 265,245 L 345,245 L 345,275 L 250,275 L 250,235 L 310,180 C 325,165 330,150 320,140 C 310,130 280,135 280,155 Z"
          fill="url(#h2mGoldBright)"
        />
        {/* 3D Depth for 2 */}
        <path
          d="M 345,245 L 358,255 L 358,285 L 345,275 Z"
          fill="url(#h2mGoldDark)"
        />
        <path
          d="M 250,275 L 260,285 L 358,285 L 345,275 Z"
          fill="url(#h2mGoldBevelSide)"
        />

        {/* ----- LETTER M (Right Wing) ----- */}
        {/* Right Outer Column Front */}
        <polygon points="385,120 420,140 420,330 385,310" fill="url(#h2mGoldBright)" />
        {/* Right Outer Column Left Bevel */}
        <polygon points="385,120 400,110 400,300 385,310" fill="url(#h2mGoldBevelTop)" />
        {/* Right Outer Column Top Bevel */}
        <polygon points="385,120 400,110 435,130 420,140" fill="url(#h2mGoldBevelTop)" />

        {/* M Diagonal Slopes */}
        <polygon points="350,150 385,120 385,160 350,190" fill="url(#h2mGoldBright)" />
        <polygon points="350,150 385,120 375,115 340,145" fill="url(#h2mGoldBevelTop)" />
        <polygon points="350,190 385,160 385,175 350,205" fill="url(#h2mGoldDark)" />

        {/* Central Crown Diamond */}
        <polygon points="300,90 315,108 300,126 285,108" fill="url(#h2mGoldBright)" />
        <polygon points="300,90 315,108 300,102" fill="#FFFFFF" fillOpacity="0.7" />
        <polygon points="300,126 315,108 300,115" fill="url(#h2mGoldDark)" />
      </g>

      {/* ==================== TYPOGRAPHY & BRAND MARK ==================== */}
      {showText && (
        <g textAnchor="middle">
          {/* Brand Name */}
          <text
            x="300"
            y="370"
            fill="url(#h2mGoldBright)"
            fontSize="26"
            fontWeight="900"
            letterSpacing="6"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            H2M MEDIA
          </text>

          {/* Subtitle / Positioning */}
          <text
            x="300"
            y="395"
            fill="#D99518"
            fontSize="10"
            fontWeight="700"
            letterSpacing="4"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            GROWTH & PERFORMANCE AGENCY
          </text>

          {/* Golden Hairline Divider */}
          <line x1="220" y1="412" x2="380" y2="412" stroke="url(#h2mHexBorder)" strokeWidth="1" />

          {/* Footnote Badge */}
          <text
            x="300"
            y="426"
            fill="#71717A"
            fontSize="8"
            fontWeight="600"
            letterSpacing="2"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            EST. 2026 • OPERATING ON MAXP
          </text>
        </g>
      )}
    </svg>
  );
};
