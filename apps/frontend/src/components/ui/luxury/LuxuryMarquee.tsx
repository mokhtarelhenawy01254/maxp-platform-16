import React from "react";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
}

export const LuxuryMarquee: React.FC<MarqueeProps> = ({
  className = "",
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
}) => {
  return (
    <div
      className={`group flex overflow-hidden p-2 [--duration:40s] [--gap:2rem] [gap:var(--gap)] ${
        vertical ? "flex-col" : "flex-row"
      } ${className}`}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={`flex shrink-0 justify-around [gap:var(--gap)] ${
            vertical
              ? "animate-marquee-vertical flex-col"
              : "animate-marquee flex-row"
          } ${reverse ? "[animation-direction:reverse]" : ""} ${
            pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
          }`}
        >
          {children}
        </div>
      ))}
    </div>
  );
};
