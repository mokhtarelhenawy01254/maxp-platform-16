import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildOptimizedStorefrontImageUrl,
  buildResponsiveStorefrontImage,
  canOptimizeStorefrontImage,
} from "../utils/productImages";

interface StorefrontProductImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  candidates?: Array<string | null | undefined>;
  fallback?: React.ReactNode;
  requestedWidth?: number;
  responsiveWidths?: number[];
  responsiveSizes?: string;
  imageQuality?: number;
  fetchpriority?: "high" | "low" | "auto";
  fitMode?: "cover" | "contain";
  preferOriginal?: boolean;
  deferUntilVisible?: boolean;
  deferRootMargin?: string;
}

const DEFAULT_REQUESTED_IMAGE_WIDTH = 560;
const MIN_INFERRED_IMAGE_WIDTH = 160;
const MAX_INFERRED_IMAGE_WIDTH = 720;

const parseImageDimension = (
  value: React.ImgHTMLAttributes<HTMLImageElement>["width"],
): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const resolveRequestedImageWidth = (
  requestedWidth: number | undefined,
  width: React.ImgHTMLAttributes<HTMLImageElement>["width"],
): number => {
  if (Number.isFinite(requestedWidth) && Number(requestedWidth) > 0) {
    return Math.round(Number(requestedWidth));
  }

  const imageWidth = parseImageDimension(width);
  if (!imageWidth) {
    return DEFAULT_REQUESTED_IMAGE_WIDTH;
  }

  return Math.min(
    MAX_INFERRED_IMAGE_WIDTH,
    Math.max(MIN_INFERRED_IMAGE_WIDTH, Math.round(imageWidth * 1.5)),
  );
};

const StorefrontProductImage: React.FC<StorefrontProductImageProps> = ({
  candidates = [],
  fallback = null,
  decoding = "async",
  loading = "lazy",
  alt = "", // Default to empty string for accessibility (decorative) if not provided
  onError,
  requestedWidth,
  responsiveWidths,
  responsiveSizes,
  imageQuality = 76,
  fetchpriority,
  fitMode,
  preferOriginal = false,
  deferUntilVisible = false,
  deferRootMargin = "900px 0px",
  ...imgProps
}) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const normalizedCandidates = useMemo(
    () =>
      candidates
        .map((candidate) => String(candidate || "").trim())
        .filter(Boolean),
    [candidates],
  );
  const candidatesKey = normalizedCandidates.join("|");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [useOriginalCandidate, setUseOriginalCandidate] = useState(false);
  const [canLoadDeferredImage, setCanLoadDeferredImage] = useState(
    !deferUntilVisible,
  );

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidatesKey]);

  useEffect(() => {
    setUseOriginalCandidate(false);
  }, [candidateIndex, candidatesKey]);

  useEffect(() => {
    if (!deferUntilVisible) {
      setCanLoadDeferredImage(true);
      return;
    }

    setCanLoadDeferredImage(false);

    const target = imageRef.current;
    if (
      !target ||
      typeof window === "undefined" ||
      typeof window.IntersectionObserver !== "function"
    ) {
      setCanLoadDeferredImage(true);
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCanLoadDeferredImage(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: deferRootMargin,
        threshold: 0.01,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [candidatesKey, deferRootMargin, deferUntilVisible]);

  const activeCandidate = normalizedCandidates[candidateIndex];
  const resolvedRequestedWidth = useMemo(
    () => resolveRequestedImageWidth(requestedWidth, imgProps.width),
    [imgProps.width, requestedWidth],
  );
  const resolvedStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!fitMode) {
      return imgProps.style;
    }

    return {
      ...imgProps.style,
      objectFit: fitMode,
      objectPosition: imgProps.style?.objectPosition || "center",
    };
  }, [fitMode, imgProps.style]);
  const optimizedCandidate = useMemo(() => {
    if (!activeCandidate || useOriginalCandidate || preferOriginal) {
      return {
        src: activeCandidate || "",
        srcSet: undefined,
        sizes: undefined,
      };
    }

    if (responsiveWidths?.length && responsiveSizes) {
      return buildResponsiveStorefrontImage(activeCandidate, {
        widths: responsiveWidths,
        fallbackWidth: resolvedRequestedWidth,
        sizes: responsiveSizes,
        quality: imageQuality,
      });
    }

    if (!canOptimizeStorefrontImage(activeCandidate)) {
      return {
        src: activeCandidate,
        srcSet: undefined,
        sizes: undefined,
      };
    }

    return {
      src: buildOptimizedStorefrontImageUrl(activeCandidate, {
        width: resolvedRequestedWidth,
        quality: imageQuality,
      }),
      srcSet: undefined,
      sizes: undefined,
    };
  }, [
    activeCandidate,
    imageQuality,
    resolvedRequestedWidth,
    responsiveSizes,
    responsiveWidths,
    preferOriginal,
    useOriginalCandidate,
  ]);

  if (!activeCandidate) {
    return <>{fallback}</>;
  }

  const shouldLoadImage = !deferUntilVisible || canLoadDeferredImage;

  return (
    <img
      {...imgProps}
      ref={imageRef}
      alt={alt}
      decoding={decoding}
      loading={loading}
      fetchpriority={fetchpriority}
      style={resolvedStyle}
      data-storefront-deferred-image={deferUntilVisible ? "true" : undefined}
      src={shouldLoadImage ? optimizedCandidate.src : undefined}
      srcSet={shouldLoadImage ? optimizedCandidate.srcSet : undefined}
      sizes={shouldLoadImage ? optimizedCandidate.sizes : undefined}
      onError={(event) => {
        if (!shouldLoadImage) {
          return;
        }

        onError?.(event);
        if (
          !preferOriginal &&
          !useOriginalCandidate &&
          optimizedCandidate.src !== activeCandidate
        ) {
          setUseOriginalCandidate(true);
          return;
        }

        setUseOriginalCandidate(false);
        setCandidateIndex((currentIndex) => currentIndex + 1);
      }}
    />
  );
};

export default StorefrontProductImage;
