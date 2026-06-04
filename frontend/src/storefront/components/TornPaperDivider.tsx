import React from 'react';

export interface TornPaperDividerProps {
  /** The color of the solid part of the torn edge, e.g., 'text-amber-900/10' or 'text-white' */
  colorClass?: string;
  className?: string;
  /** 'up' to tear downwards from top, 'down' to tear upwards from bottom */
  direction?: 'up' | 'down';
}

/**
 * A decorative divider that simulates torn edges paper to separate generic sections.
 * Designed using scalable vector graphics (SVG).
 */
export const TornPaperDivider: React.FC<TornPaperDividerProps> = ({ 
  colorClass = 'text-white', 
  className = '', 
  direction = 'down' 
}) => {
  return (
    <div
      className={`pointer-events-none relative z-10 w-full overflow-hidden leading-none ${className} ${
        direction === 'up' ? 'rotate-180' : ''
      }`}
    >
      <svg
        viewBox="0 0 1600 170"
        preserveAspectRatio="none"
        className={`block h-14 w-full md:h-20 lg:h-24 ${colorClass}`}
      >
        <path
          d="M0 0v62c33 8 73 23 120 23 46 0 88-13 136-20 63-9 109 7 164 24 65 20 120 21 180 1 55-18 106-42 170-39 64 2 115 36 172 48 61 14 119 2 183-20 59-20 109-31 164-20 74 15 141 25 209 16 38-5 71-14 102-26v83H0V0z"
          className="fill-current opacity-30"
        />
        <path
          d="M0 0v45c39 26 81 36 132 33 49-3 91-20 140-30 63-13 120-4 173 15 58 21 113 43 176 38 69-6 123-42 187-54 70-13 123 9 181 31 63 24 118 29 181 9 47-16 91-39 143-44 58-6 111 15 158 25 46 11 89 9 129-5V0H0z"
          className="fill-current opacity-60"
        />
        <path
          d="M0 0v34c52 4 92 17 141 17 54 0 102-20 158-31 70-13 124-5 179 16 63 24 114 52 185 45 70-7 120-45 188-60 69-15 122 5 180 31 54 24 112 42 176 33 59-8 102-31 151-42 71-16 126 0 242 14V0H0z"
          className="fill-current"
        />
      </svg>
    </div>
  );
};
