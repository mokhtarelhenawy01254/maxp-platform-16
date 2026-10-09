import React from "react";
import { motion, useInView } from "framer-motion";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}

export const BlurFade: React.FC<BlurFadeProps> = ({
  children,
  className = "",
  duration = 0.5,
  delay = 0,
  yOffset = 8,
  inView = true,
  inViewMargin = "-50px",
  blur = "8px",
}) => {
  const ref = React.useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin as any });
  const isInView = inView ? inViewResult : true;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const effectiveBlur = isMobile ? "0px" : blur;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: effectiveBlur !== "0px" ? `blur(${effectiveBlur})` : undefined }}
      animate={
        isInView
          ? { opacity: 1, y: 0, filter: effectiveBlur !== "0px" ? "blur(0px)" : undefined }
          : { opacity: 0, y: yOffset, filter: effectiveBlur !== "0px" ? `blur(${effectiveBlur})` : undefined }
      }
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
