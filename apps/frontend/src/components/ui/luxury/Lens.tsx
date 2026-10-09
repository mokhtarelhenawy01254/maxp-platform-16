import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  isStatic?: boolean;
  position?: { x: number; y: number };
  ariaLabel?: string;
}

export const Lens: React.FC<LensProps> = ({
  children,
  zoomFactor = 2,
  lensSize = 170,
  isStatic = false,
  position = { x: 200, y: 150 },
  ariaLabel = "Zoom Lens",
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 100, y: 100 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  const currentPos = isStatic ? position : mousePosition;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      aria-label={ariaLabel}
      className="relative overflow-hidden cursor-crosshair select-none group"
    >
      {children}

      <AnimatePresence>
        {(isHovering || isStatic) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: `${currentPos.x - lensSize / 2}px`,
              top: `${currentPos.y - lensSize / 2}px`,
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              borderRadius: "50%",
              pointerEvents: "none",
              border: "1.5px solid rgba(255, 255, 255, 0.85)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
              zIndex: 30,
            }}
          >
            {/* Magnified content container */}
            <div
              style={{
                position: "absolute",
                left: `-${currentPos.x * zoomFactor - lensSize / 2}px`,
                top: `-${currentPos.y * zoomFactor - lensSize / 2}px`,
                transform: `scale(${zoomFactor})`,
                transformOrigin: "top left",
                width: containerRef.current?.clientWidth || "100%",
                height: containerRef.current?.clientHeight || "100%",
                pointerEvents: "none",
              }}
            >
              {children}
            </div>

            {/* Lens subtle glass reflection and crosshair watermark */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className="absolute top-2 right-2 text-[9px] font-mono tracking-widest text-white/90 bg-black/50 px-1.5 py-0.5 rounded-full pointer-events-none backdrop-blur-sm">
              2.5x ZOOM
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
