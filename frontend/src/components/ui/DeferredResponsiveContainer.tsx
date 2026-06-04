import React, { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts";

type ResponsiveContainerProps = React.ComponentProps<
  typeof RechartsResponsiveContainer
>;

const toCssSize = (
  value:
    | ResponsiveContainerProps["width"]
    | ResponsiveContainerProps["height"]
    | ResponsiveContainerProps["minWidth"]
    | ResponsiveContainerProps["minHeight"],
) => {
  if (typeof value === "number") return `${value}px`;
  return value ?? undefined;
};

const DeferredResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minWidth = 0,
  minHeight = 0,
  ...props
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof window === "undefined") return;

    const updateDimensions = () => {
      const nextRect = node.getBoundingClientRect();
      const nextWidth = Math.floor(nextRect.width);
      const nextHeight = Math.floor(nextRect.height);

      setDimensions((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : {
              width: nextWidth > 0 ? nextWidth : 0,
              height: nextHeight > 0 ? nextHeight : 0,
            },
      );
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(node);

    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const wrapperStyle = useMemo(
    () => ({
      width: toCssSize(width),
      height: toCssSize(height),
      minWidth: toCssSize(minWidth),
      minHeight: toCssSize(minHeight),
    }),
    [height, minHeight, minWidth, width],
  );

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <RechartsResponsiveContainer
          width={dimensions.width}
          height={dimensions.height}
          minWidth={dimensions.width}
          minHeight={dimensions.height}
          {...props}
        >
          {children}
        </RechartsResponsiveContainer>
      ) : (
        <div aria-hidden="true" style={wrapperStyle} />
      )}
    </div>
  );
};

export default DeferredResponsiveContainer;
