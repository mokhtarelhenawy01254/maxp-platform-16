import type { AspectRatioType, CanvasOverlaySettings, MarketingProduct } from "./types";

interface ExportCanvasOptions {
  backgroundUrl: string | null;
  product: MarketingProduct | null;
  aspectRatio: AspectRatioType;
  overlay: CanvasOverlaySettings;
  previewGradient?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin for local data URLs or same-origin
      const retryImg = new Image();
      retryImg.onload = () => resolve(retryImg);
      retryImg.onerror = (e) => reject(e);
      retryImg.src = src;
    };
    img.src = src;
  });
}

export async function renderCompositeCanvas({
  backgroundUrl,
  product,
  aspectRatio,
  overlay,
  previewGradient = "from-slate-900 to-indigo-950",
}: ExportCanvasOptions): Promise<HTMLCanvasElement> {
  // 1. High-DPI Output Dimensions (2K Resolution)
  const dimensions: Record<AspectRatioType, { width: number; height: number }> = {
    "1:1": { width: 2048, height: 2048 },
    "9:16": { width: 1152, height: 2048 },
    "4:5": { width: 1638, height: 2048 },
    "16:9": { width: 2048, height: 1152 },
  };

  const { width, height } = dimensions[aspectRatio] || dimensions["1:1"];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 2. Layer 0: Background
  let bgLoaded = false;
  if (backgroundUrl) {
    try {
      const bgImg = await loadImage(backgroundUrl);
      // Cover fit
      const bgRatio = bgImg.width / bgImg.height;
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (bgRatio > canvasRatio) {
        drawW = height * bgRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / bgRatio;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
      bgLoaded = true;
    } catch (e) {
      console.warn("Could not load AI background image, using fallback gradient", e);
    }
  }

  if (!bgLoaded) {
    // Elegant dark studio gradient fallback
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e1b4b");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle radial spotlight
    const spot = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.6);
    spot.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    spot.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Layer 1 & 2: Product & Shadow (Only if showProductLayer is not explicitly false)
  const resolvedProductImg = product?.mainImage;
  const shouldRenderProductLayer = overlay.showProductLayer !== false;
  if (resolvedProductImg && shouldRenderProductLayer) {
    try {
      const pImg = await loadImage(resolvedProductImg);
      const transform = overlay.productTransform || {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        shadowType: "contact",
      };

      // Calculate Product Sizing (Base ~ 55% of canvas min dimension)
      const baseDim = Math.min(width, height) * 0.58;
      const pRatio = pImg.width / pImg.height;
      let pWidth = pRatio >= 1 ? baseDim : baseDim * pRatio;
      let pHeight = pRatio >= 1 ? baseDim / pRatio : baseDim;

      pWidth *= transform.scale || 1;
      pHeight *= transform.scale || 1;

      // Center with offsets
      const centerX = width / 2 + (transform.x / 100) * (width * 0.4);
      const centerY = height / 2 + (transform.y / 100) * (height * 0.4);

      // Layer 1: Physical Shadow
      if (transform.shadowType !== "none") {
        ctx.save();
        const shadowY = centerY + pHeight * 0.42;
        const shadowW = pWidth * 0.85;
        const shadowH = pHeight * 0.18;

        if (transform.shadowType === "contact") {
          // Deep Contact Occlusion Shadow + Soft Ambient Ring
          const ambientGrad = ctx.createRadialGradient(
            centerX, shadowY, 0,
            centerX, shadowY, shadowW * 0.5
          );
          ambientGrad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
          ambientGrad.addColorStop(0.4, "rgba(0, 0, 0, 0.45)");
          ambientGrad.addColorStop(0.8, "rgba(0, 0, 0, 0.15)");
          ambientGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = ambientGrad;
          ctx.beginPath();
          ctx.ellipse(centerX, shadowY, shadowW * 0.5, shadowH * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tight hard contact line right under the base
          const hardContact = ctx.createRadialGradient(
            centerX, shadowY - 4, 0,
            centerX, shadowY - 4, shadowW * 0.3
          );
          hardContact.addColorStop(0, "rgba(0, 0, 0, 0.95)");
          hardContact.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = hardContact;
          ctx.beginPath();
          ctx.ellipse(centerX, shadowY - 4, shadowW * 0.35, shadowH * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (transform.shadowType === "directional") {
          // Angled Sunlight / Studio directional shadow
          ctx.translate(centerX + pWidth * 0.15, shadowY + pHeight * 0.1);
          const dirGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW * 0.6);
          dirGrad.addColorStop(0, "rgba(0, 0, 0, 0.6)");
          dirGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = dirGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, shadowW * 0.6, shadowH * 0.4, Math.PI / 12, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Subtle ambient
          const subtleGrad = ctx.createRadialGradient(centerX, shadowY, 0, centerX, shadowY, shadowW * 0.4);
          subtleGrad.addColorStop(0, "rgba(0, 0, 0, 0.4)");
          subtleGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = subtleGrad;
          ctx.beginPath();
          ctx.ellipse(centerX, shadowY, shadowW * 0.4, shadowH * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Layer 2: Product Image with Transform
      ctx.save();
      ctx.translate(centerX, centerY);
      if (transform.rotation) {
        ctx.rotate((transform.rotation * Math.PI) / 180);
      }
      ctx.drawImage(pImg, -pWidth / 2, -pHeight / 2, pWidth, pHeight);
      ctx.restore();
    } catch (e) {
      console.warn("Could not load product image onto canvas", e);
    }
  }

  // 4. Layer 3: Ad Badges (Discount, Rating, Trust)
  const isVertical = aspectRatio === "9:16";
  const paddingX = width * 0.07;
  const topY = height * (isVertical ? 0.08 : 0.07);

  // Discount Pill (Top Corner)
  if (overlay.showBadge && overlay.discountBadge) {
    ctx.save();
    const badgeText = overlay.discountBadge;
    ctx.font = `bold ${Math.round(width * 0.024)}px 'Cairo', sans-serif`;
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = textWidth + width * 0.04;
    const badgeH = width * 0.045;
    const badgeX = width - paddingX - badgeW;
    const badgeY = topY;

    // Badge background with specular highlight
    ctx.fillStyle = overlay.accentColor || "#f59e0b";
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();

    // Badge text
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
    ctx.restore();
  }

  // 5. Layer 4: High-Impact Typography & Conversion Content
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";

  const contentY = isVertical ? height * 0.72 : height * 0.75;

  // Headline
  if (overlay.headline) {
    const headlineSize = Math.round(width * (isVertical ? 0.055 : 0.048));
    ctx.font = `900 ${headlineSize}px 'Cairo', sans-serif`;
    ctx.fillStyle = overlay.textColor || "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillText(overlay.headline, width - paddingX, contentY);
  }

  // Subheadline
  if (overlay.subheadline) {
    const subSize = Math.round(width * (isVertical ? 0.028 : 0.024));
    ctx.font = `500 ${subSize}px 'Cairo', sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillText(overlay.subheadline, width - paddingX, contentY + width * 0.05);
  }

  // Price & CTA Bar
  const bottomBarY = contentY + width * (isVertical ? 0.12 : 0.1);

  if (overlay.showPrice && typeof overlay.price === "number") {
    const priceText = `${overlay.price.toLocaleString("ar-EG")} ${overlay.currency || "ج.م"}`;
    const priceSize = Math.round(width * 0.042);
    ctx.font = `900 ${priceSize}px 'Cairo', sans-serif`;
    ctx.fillStyle = "#22c55e"; // Fresh high-converting emerald green
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;
    ctx.fillText(priceText, width - paddingX, bottomBarY);

    if (overlay.originalPrice && overlay.originalPrice > overlay.price) {
      const origText = `${overlay.originalPrice.toLocaleString("ar-EG")} ${overlay.currency || "ج.م"}`;
      const origSize = Math.round(width * 0.024);
      ctx.font = `bold ${origSize}px 'Cairo', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      const priceWidth = ctx.measureText(priceText).width;
      const origX = width - paddingX - priceWidth - width * 0.02;
      ctx.fillText(origText, origX, bottomBarY - 2);

      // Strike through original price
      const origWidth = ctx.measureText(origText).width;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      ctx.lineWidth = Math.max(2, width * 0.002);
      ctx.beginPath();
      ctx.moveTo(origX, bottomBarY - origSize * 0.4);
      ctx.lineTo(origX - origWidth, bottomBarY - origSize * 0.4);
      ctx.stroke();
    }
  }

  // Primary Action Button (Call To Action on Left Side)
  if (overlay.showCta && overlay.callToAction) {
    ctx.direction = "ltr";
    const ctaText = overlay.callToAction;
    const ctaSize = Math.round(width * 0.026);
    ctx.font = `bold ${ctaSize}px 'Cairo', sans-serif`;
    const ctaWidth = ctx.measureText(ctaText).width + width * 0.06;
    const ctaHeight = width * 0.052;
    const ctaX = paddingX;
    const ctaY = bottomBarY - ctaHeight * 0.75;

    // CTA Button Pill
    ctx.fillStyle = overlay.primaryColor || "#4f46e5";
    ctx.shadowColor = "rgba(79, 70, 229, 0.5)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
    ctx.fill();

    // CTA Text + Arrow
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${ctaText} ←`, ctaX + ctaWidth / 2, ctaY + ctaHeight / 2);
  }

  ctx.restore();

  // 6. Layer 5: Brand Logo Overlay (if enabled)
  if (overlay.logo?.show && overlay.logo?.url) {
    try {
      const logoImg = await loadImage(overlay.logo.url);
      const logoRatio = logoImg.width / logoImg.height;
      const sizeMultiplier = overlay.logo.size === "sm" ? 0.08 : overlay.logo.size === "lg" ? 0.16 : 0.12;
      const logoW = width * sizeMultiplier;
      const logoH = logoW / logoRatio;
      const logoPadding = width * 0.06;

      let lx = logoPadding;
      let ly = logoPadding;
      if (overlay.logo.position === "top-right") {
        lx = width - logoPadding - logoW;
        ly = logoPadding;
      } else if (overlay.logo.position === "bottom-left") {
        lx = logoPadding;
        ly = height - logoPadding - logoH;
      } else if (overlay.logo.position === "bottom-right") {
        lx = width - logoPadding - logoW;
        ly = height - logoPadding - logoH;
      }

      ctx.save();
      ctx.globalAlpha = overlay.logo.opacity ?? 1;
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(logoImg, lx, ly, logoW, logoH);
      ctx.restore();
    } catch (e) {
      console.warn("Could not load logo image onto composite canvas", e);
    }
  }

  return canvas;
}

export async function downloadCompositeImage(options: ExportCanvasOptions): Promise<void> {
  const canvas = await renderCompositeCanvas(options);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const cleanName = options.product?.name ? options.product.name.replace(/\s+/g, "-") : "product";
        a.href = url;
        a.download = `maxp-ad-${cleanName}-${options.aspectRatio}-${Date.now()}.png`;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 1000);
      },
      "image/png",
      1.0
    );
  });
}
