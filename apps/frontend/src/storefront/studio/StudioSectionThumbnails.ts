import { resolveStorefrontSectionCategory } from "../sections/manifest";
import type { StudioSectionCategoryId } from "./StudioTypes";

/**
 * StudioSectionThumbnails.ts
 * High-fidelity SVG visual layout diagrams for Storefront Studio Library elements.
 * Generates lightweight, crisp vector previews (>= 120x48px) encoded as SVG data URIs
 * for instant, zero-latency DOM image rendering.
 */

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const STUDIO_SECTION_THUMBNAILS: Record<string, string> = {
  // Video Element (فيديو)
  video: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="10" width="216" height="60" rx="6" fill="#20242e" stroke="#333a48" stroke-width="1"/>
      <circle cx="120" cy="40" r="14" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="1.5"/>
      <polygon points="116,34 128,40 116,46" fill="#60a5fa"/>
    </svg>
  `),

  // Marquee Element (شريط متحرك)
  marquee: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="22" width="216" height="36" rx="6" fill="#1e222a" stroke="#2d3340" stroke-width="1"/>
      <rect x="22" y="34" width="45" height="12" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
      <circle cx="75" cy="40" r="2" fill="#64748b"/>
      <rect x="85" y="34" width="55" height="12" rx="3" fill="#10b981" fill-opacity="0.3"/>
      <circle cx="148" cy="40" r="2" fill="#64748b"/>
      <rect x="158" y="34" width="50" height="12" rx="3" fill="#f59e0b" fill-opacity="0.3"/>
      <!-- Motion arrows -->
      <path d="M195 28 L205 28 M201 25 L205 28 L201 31" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `),

  // Lottie Element (أنيميشن لوتي)
  lottie: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="10" width="216" height="60" rx="6" fill="#20232b" stroke="#313745" stroke-width="1"/>
      <!-- Sparkle/Lottie shape -->
      <path d="M120 22 C120 30 128 38 136 38 C128 38 120 46 120 54 C120 46 112 38 104 38 C112 38 120 30 120 22 Z" fill="#818cf8"/>
      <circle cx="100" cy="26" r="3" fill="#34d399"/>
      <circle cx="140" cy="50" r="2.5" fill="#f472b6"/>
    </svg>
  `),
  // 1. Richtext (عنوان ونصوص)
  richtext: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#1b1d22"/>
      <rect x="16" y="14" width="34" height="6" rx="3" fill="#3b82f6"/>
      <rect x="16" y="26" width="130" height="9" rx="4" fill="#f1f5f9"/>
      <rect x="16" y="42" width="195" height="4" rx="2" fill="#64748b"/>
      <rect x="16" y="51" width="165" height="4" rx="2" fill="#64748b"/>
      <rect x="16" y="60" width="110" height="4" rx="2" fill="#475569"/>
    </svg>
  `),

  // 2. Hero Banner (بانر رئيسي)
  "hero-banner": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#16181d"/>
      <!-- Content column -->
      <rect x="14" y="14" width="28" height="5" rx="2.5" fill="#3b82f6"/>
      <rect x="14" y="24" width="95" height="9" rx="4" fill="#ffffff"/>
      <rect x="14" y="38" width="75" height="4" rx="2" fill="#94a3b8"/>
      <rect x="14" y="46" width="55" height="4" rx="2" fill="#64748b"/>
      <!-- CTA Button -->
      <rect x="14" y="55" width="46" height="13" rx="3.5" fill="#2563eb"/>
      <circle cx="21" cy="61.5" r="2" fill="#ffffff"/>
      <rect x="26" y="60" width="26" height="3" rx="1.5" fill="#ffffff"/>
      <!-- Visual Media Area -->
      <rect x="126" y="10" width="100" height="60" rx="6" fill="#242831" stroke="#333945" stroke-width="1"/>
      <path d="M142 54 L162 34 L180 48 L198 30 L216 54 Z" fill="#38bdf8" opacity="0.35"/>
      <circle cx="152" cy="24" r="5" fill="#f59e0b" opacity="0.6"/>
    </svg>
  `),

  // 3. Info Content (صورة ومحتوى)
  "info-content": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#191b20"/>
      <!-- Image card -->
      <rect x="14" y="12" width="76" height="56" rx="6" fill="#252932" stroke="#333842" stroke-width="1"/>
      <rect x="22" y="20" width="60" height="32" rx="4" fill="#1f232b"/>
      <path d="M28 46 L42 32 L56 42 L68 28 L76 46 Z" fill="#818cf8" opacity="0.4"/>
      <!-- Text lines -->
      <rect x="102" y="16" width="30" height="5" rx="2.5" fill="#10b981"/>
      <rect x="102" y="26" width="90" height="8" rx="3" fill="#f8fafc"/>
      <rect x="102" y="40" width="122" height="4" rx="2" fill="#64748b"/>
      <rect x="102" y="49" width="105" height="4" rx="2" fill="#64748b"/>
      <rect x="102" y="58" width="70" height="4" rx="2" fill="#475569"/>
    </svg>
  `),

  // 4. Featured Products (شبكة منتجات)
  "featured-products": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#181a1f"/>
      <!-- 4 product cards -->
      <g transform="translate(12, 10)">
        <rect width="48" height="60" rx="5" fill="#242730" stroke="#323642" stroke-width="1"/>
        <rect x="4" y="4" width="40" height="32" rx="3" fill="#303542"/>
        <rect x="4" y="40" width="34" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="4" y="48" width="20" height="5" rx="2" fill="#10b981"/>
      </g>
      <g transform="translate(68, 10)">
        <rect width="48" height="60" rx="5" fill="#242730" stroke="#323642" stroke-width="1"/>
        <rect x="4" y="4" width="40" height="32" rx="3" fill="#303542"/>
        <rect x="4" y="40" width="34" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="4" y="48" width="20" height="5" rx="2" fill="#10b981"/>
      </g>
      <g transform="translate(124, 10)">
        <rect width="48" height="60" rx="5" fill="#242730" stroke="#323642" stroke-width="1"/>
        <rect x="4" y="4" width="40" height="32" rx="3" fill="#303542"/>
        <rect x="4" y="40" width="34" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="4" y="48" width="20" height="5" rx="2" fill="#10b981"/>
      </g>
      <g transform="translate(180, 10)">
        <rect width="48" height="60" rx="5" fill="#242730" stroke="#323642" stroke-width="1"/>
        <rect x="4" y="4" width="40" height="32" rx="3" fill="#303542"/>
        <rect x="4" y="40" width="34" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="4" y="48" width="20" height="5" rx="2" fill="#10b981"/>
      </g>
    </svg>
  `),

  // 5. Promo Strip (شريط عروض)
  "promo-strip": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#181a1f"/>
      <rect x="10" y="20" width="220" height="40" rx="7" fill="#1e2430" stroke="#2b3345" stroke-width="1"/>
      <!-- Badge -->
      <rect x="20" y="30" width="48" height="20" rx="4" fill="#f97316"/>
      <rect x="25" y="37" width="38" height="5" rx="2" fill="#ffffff"/>
      <!-- Announcement line -->
      <rect x="76" y="34" width="95" height="6" rx="3" fill="#e2e8f0"/>
      <rect x="76" y="44" width="65" height="4" rx="2" fill="#94a3b8"/>
      <!-- Button -->
      <rect x="180" y="32" width="40" height="16" rx="4" fill="#3b82f6"/>
      <rect x="188" y="38" width="24" height="4" rx="2" fill="#ffffff"/>
    </svg>
  `),

  // 6. Newsletter (نموذج ونشرة)
  newsletter: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#181a1f"/>
      <rect x="65" y="14" width="110" height="7" rx="3.5" fill="#f8fafc"/>
      <rect x="50" y="25" width="140" height="4" rx="2" fill="#717a8a"/>
      <!-- Form Input & Button -->
      <rect x="25" y="38" width="135" height="26" rx="6" fill="#252932" stroke="#363c48" stroke-width="1"/>
      <circle cx="37" cy="51" r="4" fill="#64748b"/>
      <rect x="47" y="49" width="60" height="4" rx="2" fill="#64748b"/>
      <rect x="165" y="38" width="50" height="26" rx="6" fill="#2563eb"/>
      <rect x="175" y="49" width="30" height="4" rx="2" fill="#ffffff"/>
    </svg>
  `),

  // 7. Preset: Products Grid (شبكة منتجات 4 أعمدة مع فلاتر)
  "preset-products": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#1a1c22"/>
      <!-- Header row with title & filter pills -->
      <rect x="12" y="10" width="60" height="6" rx="3" fill="#ffffff"/>
      <rect x="145" y="10" width="24" height="6" rx="3" fill="#333844"/>
      <rect x="173" y="10" width="24" height="6" rx="3" fill="#2563eb"/>
      <rect x="201" y="10" width="27" height="6" rx="3" fill="#333844"/>
      <!-- 4 product cards -->
      <g transform="translate(12, 22)">
        <rect width="48" height="48" rx="4" fill="#252832" stroke="#353b47" stroke-width="1"/>
        <rect x="3" y="3" width="42" height="26" rx="3" fill="#303542"/>
        <rect x="3" y="33" width="30" height="3" rx="1.5" fill="#cbd5e1"/>
        <rect x="3" y="39" width="18" height="4" rx="1.5" fill="#f59e0b"/>
      </g>
      <g transform="translate(68, 22)">
        <rect width="48" height="48" rx="4" fill="#252832" stroke="#353b47" stroke-width="1"/>
        <rect x="3" y="3" width="42" height="26" rx="3" fill="#303542"/>
        <rect x="3" y="33" width="30" height="3" rx="1.5" fill="#cbd5e1"/>
        <rect x="3" y="39" width="18" height="4" rx="1.5" fill="#f59e0b"/>
      </g>
      <g transform="translate(124, 22)">
        <rect width="48" height="48" rx="4" fill="#252832" stroke="#353b47" stroke-width="1"/>
        <rect x="3" y="3" width="42" height="26" rx="3" fill="#303542"/>
        <rect x="3" y="33" width="30" height="3" rx="1.5" fill="#cbd5e1"/>
        <rect x="3" y="39" width="18" height="4" rx="1.5" fill="#f59e0b"/>
      </g>
      <g transform="translate(180, 22)">
        <rect width="48" height="48" rx="4" fill="#252832" stroke="#353b47" stroke-width="1"/>
        <rect x="3" y="3" width="42" height="26" rx="3" fill="#303542"/>
        <rect x="3" y="33" width="30" height="3" rx="1.5" fill="#cbd5e1"/>
        <rect x="3" y="39" width="18" height="4" rx="1.5" fill="#f59e0b"/>
      </g>
    </svg>
  `),

  // 8. Preset: Deal Banner & Countdown (شريط عروض ومؤقت)
  "preset-deal": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#1e1518"/>
      <rect x="8" y="10" width="224" height="60" rx="6" fill="#26171b" stroke="#7f1d1d" stroke-width="1"/>
      <!-- Deal Badge -->
      <rect x="18" y="18" width="52" height="12" rx="3" fill="#ef4444"/>
      <rect x="22" y="22" width="44" height="4" rx="2" fill="#ffffff"/>
      <rect x="18" y="35" width="80" height="7" rx="3.5" fill="#ffffff"/>
      <rect x="18" y="47" width="60" height="4" rx="2" fill="#fca5a5"/>
      <!-- Countdown timer chips -->
      <g transform="translate(110, 22)">
        <rect width="24" height="28" rx="4" fill="#3b161c" stroke="#991b1b" stroke-width="1"/>
        <rect x="4" y="9" width="16" height="10" rx="2" fill="#f87171"/>
      </g>
      <circle cx="138" cy="32" r="1.5" fill="#ef4444"/>
      <circle cx="138" cy="40" r="1.5" fill="#ef4444"/>
      <g transform="translate(142, 22)">
        <rect width="24" height="28" rx="4" fill="#3b161c" stroke="#991b1b" stroke-width="1"/>
        <rect x="4" y="9" width="16" height="10" rx="2" fill="#f87171"/>
      </g>
      <!-- CTA Button -->
      <rect x="174" y="26" width="48" height="20" rx="5" fill="#ef4444"/>
      <rect x="182" y="34" width="32" height="4" rx="2" fill="#ffffff"/>
    </svg>
  `),

  // 9. Preset: Hero Banner Showcase (واجهة البطل الرئيسية)
  "preset-hero": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#14171d"/>
      <!-- Content column -->
      <rect x="14" y="12" width="38" height="6" rx="3" fill="#2563eb"/>
      <rect x="14" y="22" width="100" height="10" rx="4" fill="#ffffff"/>
      <rect x="14" y="37" width="85" height="4" rx="2" fill="#94a3b8"/>
      <rect x="14" y="44" width="65" height="4" rx="2" fill="#64748b"/>
      <!-- Dual Buttons -->
      <rect x="14" y="53" width="42" height="15" rx="4" fill="#2563eb"/>
      <rect x="22" y="59" width="26" height="3" rx="1.5" fill="#ffffff"/>
      <rect x="60" y="53" width="36" height="15" rx="4" fill="#2a303c" stroke="#3b4252" stroke-width="1"/>
      <rect x="68" y="59" width="20" height="3" rx="1.5" fill="#cbd5e1"/>
      <!-- Hero Product Media Plinth -->
      <rect x="126" y="8" width="102" height="64" rx="6" fill="#1f242e" stroke="#2b3240" stroke-width="1"/>
      <rect x="134" y="14" width="86" height="52" rx="4" fill="#262d3a"/>
      <!-- Model silhouette / glow -->
      <ellipse cx="177" cy="38" rx="24" ry="18" fill="#38bdf8" opacity="0.25"/>
      <circle cx="177" cy="28" r="9" fill="#60a5fa" opacity="0.6"/>
      <rect x="163" y="39" width="28" height="18" rx="4" fill="#3b82f6" opacity="0.7"/>
    </svg>
  `),

  // 10. Preset: Trust Badges (شريط الموثوقية والضمان)
  "preset-trust": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#181b20"/>
      <!-- 4 Columns -->
      <g transform="translate(10, 15)">
        <rect width="50" height="50" rx="6" fill="#22262f" stroke="#303643" stroke-width="1"/>
        <circle cx="25" cy="22" r="8" fill="#10b981" opacity="0.8"/>
        <rect x="8" y="34" width="34" height="4" rx="2" fill="#e2e8f0"/>
        <rect x="12" y="40" width="26" height="3" rx="1.5" fill="#64748b"/>
      </g>
      <g transform="translate(66, 15)">
        <rect width="50" height="50" rx="6" fill="#22262f" stroke="#303643" stroke-width="1"/>
        <circle cx="25" cy="22" r="8" fill="#3b82f6" opacity="0.8"/>
        <rect x="8" y="34" width="34" height="4" rx="2" fill="#e2e8f0"/>
        <rect x="12" y="40" width="26" height="3" rx="1.5" fill="#64748b"/>
      </g>
      <g transform="translate(122, 15)">
        <rect width="50" height="50" rx="6" fill="#22262f" stroke="#303643" stroke-width="1"/>
        <circle cx="25" cy="22" r="8" fill="#f59e0b" opacity="0.8"/>
        <rect x="8" y="34" width="34" height="4" rx="2" fill="#e2e8f0"/>
        <rect x="12" y="40" width="26" height="3" rx="1.5" fill="#64748b"/>
      </g>
      <g transform="translate(178, 15)">
        <rect width="50" height="50" rx="6" fill="#22262f" stroke="#303643" stroke-width="1"/>
        <circle cx="25" cy="22" r="8" fill="#8b5cf6" opacity="0.8"/>
        <rect x="8" y="34" width="34" height="4" rx="2" fill="#e2e8f0"/>
        <rect x="12" y="40" width="26" height="3" rx="1.5" fill="#64748b"/>
      </g>
    </svg>
  `),

  // 11. Preset: Customer Reviews (آراء وتجارب العملاء)
  "preset-reviews": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#181a1f"/>
      <!-- 3 Testimonial Cards -->
      <g transform="translate(10, 12)">
        <rect width="68" height="56" rx="6" fill="#222630" stroke="#323846" stroke-width="1"/>
        <circle cx="16" cy="18" r="6" fill="#818cf8"/>
        <!-- 5 mini stars -->
        <circle cx="32" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="38" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="44" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="50" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="56" cy="18" r="1.8" fill="#fbbf24"/>
        <!-- comment lines -->
        <rect x="8" y="30" width="52" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="8" y="38" width="46" height="4" rx="2" fill="#64748b"/>
        <rect x="8" y="46" width="32" height="3" rx="1.5" fill="#475569"/>
      </g>
      <g transform="translate(86, 12)">
        <rect width="68" height="56" rx="6" fill="#222630" stroke="#323846" stroke-width="1"/>
        <circle cx="16" cy="18" r="6" fill="#38bdf8"/>
        <!-- 5 mini stars -->
        <circle cx="32" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="38" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="44" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="50" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="56" cy="18" r="1.8" fill="#fbbf24"/>
        <rect x="8" y="30" width="52" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="8" y="38" width="46" height="4" rx="2" fill="#64748b"/>
        <rect x="8" y="46" width="32" height="3" rx="1.5" fill="#475569"/>
      </g>
      <g transform="translate(162, 12)">
        <rect width="68" height="56" rx="6" fill="#222630" stroke="#323846" stroke-width="1"/>
        <circle cx="16" cy="18" r="6" fill="#f472b6"/>
        <!-- 5 mini stars -->
        <circle cx="32" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="38" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="44" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="50" cy="18" r="1.8" fill="#fbbf24"/>
        <circle cx="56" cy="18" r="1.8" fill="#fbbf24"/>
        <rect x="8" y="30" width="52" height="4" rx="2" fill="#cbd5e1"/>
        <rect x="8" y="38" width="46" height="4" rx="2" fill="#64748b"/>
        <rect x="8" y="46" width="32" height="3" rx="1.5" fill="#475569"/>
      </g>
    </svg>
  `),

  // 12. Egypt: WhatsApp CTA (واتساب مباشر)
  "whatsapp-cta": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="14" width="216" height="52" rx="8" fill="#14261c" stroke="#22c55e" stroke-width="1.2"/>
      <circle cx="38" cy="40" r="15" fill="#22c55e"/>
      <path d="M33 44 L35 38 A6 6 0 1 1 45 40 L45 44 Z" fill="#ffffff"/>
      <rect x="62" y="28" width="80" height="8" rx="4" fill="#ffffff"/>
      <rect x="62" y="42" width="130" height="6" rx="3" fill="#86efac"/>
    </svg>
  `),

  // 13. Egypt: COD Badge (الدفع عند الاستلام)
  "cod-badge": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="14" width="216" height="52" rx="8" fill="#241e14" stroke="#f59e0b" stroke-width="1.2"/>
      <circle cx="38" cy="40" r="15" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="1.5"/>
      <path d="M38 31 L45 35 V42 C45 46 38 50 38 50 C38 50 31 46 31 42 V35 Z" fill="#fbbf24"/>
      <rect x="62" y="28" width="90" height="8" rx="4" fill="#ffffff"/>
      <rect x="62" y="42" width="120" height="6" rx="3" fill="#fcd34d"/>
    </svg>
  `),

  // 14. Egypt: Shipping Partners (شركات الشحن)
  "shipping-partners": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="14" width="216" height="52" rx="8" fill="#141d28" stroke="#0ea5e9" stroke-width="1.2"/>
      <rect x="22" y="24" width="28" height="32" rx="4" fill="#0284c7"/>
      <rect x="58" y="26" width="48" height="28" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <rect x="112" y="26" width="48" height="28" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <rect x="166" y="26" width="48" height="28" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
    </svg>
  `),

  // 15. Egypt: Payment Methods (طرق الدفع)
  "payment-methods": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="14" width="216" height="52" rx="8" fill="#1f182b" stroke="#a855f7" stroke-width="1.2"/>
      <rect x="22" y="26" width="36" height="28" rx="4" fill="#7c3aed"/>
      <rect x="66" y="26" width="44" height="28" rx="4" fill="#242138" stroke="#c084fc" stroke-width="1"/>
      <rect x="116" y="26" width="44" height="28" rx="4" fill="#242138" stroke="#c084fc" stroke-width="1"/>
      <rect x="166" y="26" width="44" height="28" rx="4" fill="#242138" stroke="#c084fc" stroke-width="1"/>
    </svg>
  `),

  // 16. Dental: Sample Kit (طقم عينات الأسنان)
  "dental-sample-kit": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#040711"/>
      <rect x="12" y="10" width="216" height="60" rx="8" fill="#081824" stroke="#06b6d4" stroke-width="1.2"/>
      <circle cx="38" cy="40" r="16" fill="#06b6d4" fill-opacity="0.2"/>
      <path d="M38 28 C34 28 32 32 32 36 C32 44 35 50 38 52 C41 50 44 44 44 36 C44 32 42 28 38 28 Z" fill="#22d3ee"/>
      <rect x="64" y="24" width="105" height="8" rx="4" fill="#ffffff"/>
      <rect x="64" y="38" width="140" height="5" rx="2.5" fill="#67e8f9"/>
      <rect x="64" y="48" width="60" height="13" rx="4" fill="#0891b2"/>
    </svg>
  `),

  // 17. Dental: 3D Showcase (معاينة ثلاثية الأبعاد)
  "dental-3d-showcase": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#040711"/>
      <rect x="12" y="10" width="216" height="60" rx="8" fill="#081622" stroke="#14b8a6" stroke-width="1.2"/>
      <ellipse cx="170" cy="40" rx="30" ry="16" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="170" cy="40" r="12" fill="#0f766e"/>
      <rect x="24" y="22" width="90" height="8" rx="4" fill="#ffffff"/>
      <rect x="24" y="36" width="115" height="5" rx="2.5" fill="#99f6e4"/>
      <rect x="24" y="47" width="65" height="13" rx="4" fill="#0d9488"/>
    </svg>
  `),

  // 18. Automotive: Car Model Matcher (مطابقة موديل السيارة)
  "car-model-matcher": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="12" width="216" height="56" rx="8" fill="#1b2230" stroke="#3b82f6" stroke-width="1.2"/>
      <rect x="24" y="22" width="120" height="16" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1"/>
      <rect x="30" y="27" width="60" height="6" rx="2" fill="#94a3b8"/>
      <rect x="150" y="22" width="66" height="16" rx="4" fill="#2563eb"/>
      <rect x="24" y="46" width="110" height="8" rx="3" fill="#22c55e" fill-opacity="0.3"/>
    </svg>
  `),

  // 19. Automotive: Bento (مواصفات هندسية بينتو)
  "automotive-bento": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="12" width="65" height="56" rx="6" fill="#1e222b" stroke="#333a46" stroke-width="1"/>
      <rect x="85" y="12" width="70" height="56" rx="6" fill="#1e222b" stroke="#333a46" stroke-width="1"/>
      <rect x="161" y="12" width="65" height="56" rx="6" fill="#1e222b" stroke="#333a46" stroke-width="1"/>
    </svg>
  `),

  // 20. Fashion: Shoe Fit Finder (محدد مقاس الأحذية)
  "shoe-fit-finder": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="12" width="216" height="56" rx="8" fill="#1f232b" stroke="#f97316" stroke-width="1.2"/>
      <rect x="24" y="24" width="75" height="8" rx="4" fill="#ffffff"/>
      <rect x="24" y="40" width="30" height="16" rx="4" fill="#ea580c"/>
      <rect x="60" y="40" width="30" height="16" rx="4" fill="#2a2e39"/>
      <rect x="96" y="40" width="30" height="16" rx="4" fill="#2a2e39"/>
      <rect x="132" y="40" width="30" height="16" rx="4" fill="#2a2e39"/>
    </svg>
  `),

  // 21. Fashion: Shop The Look (تسوق الإطلالة)
  "shop-the-look": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="10" width="100" height="60" rx="6" fill="#252934"/>
      <circle cx="50" cy="30" r="5" fill="#f43f5e"/>
      <circle cx="70" cy="50" r="5" fill="#f43f5e"/>
      <rect x="124" y="18" width="90" height="8" rx="3" fill="#ffffff"/>
      <rect x="124" y="32" width="70" height="5" rx="2.5" fill="#94a3b8"/>
      <rect x="124" y="45" width="50" height="14" rx="4" fill="#e11d48"/>
    </svg>
  `),

  // 22. Look Mosaic / Planner / Progress
  "look-mosaic": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="12" width="48" height="56" rx="5" fill="#222630"/>
      <rect x="68" y="12" width="48" height="26" rx="5" fill="#222630"/>
      <rect x="68" y="42" width="48" height="26" rx="5" fill="#222630"/>
      <rect x="124" y="12" width="102" height="56" rx="6" fill="#1b202a" stroke="#333948" stroke-width="1"/>
    </svg>
  `),
  "look-planner": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="12" width="60" height="56" rx="6" fill="#222733"/>
      <rect x="80" y="12" width="60" height="56" rx="6" fill="#222733"/>
      <rect x="146" y="12" width="80" height="56" rx="6" fill="#1c212c" stroke="#3b82f6" stroke-width="1"/>
    </svg>
  `),
  "look-progress": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="16" y="24" width="208" height="12" rx="6" fill="#222631"/>
      <rect x="16" y="24" width="130" height="12" rx="6" fill="#ec4899"/>
      <circle cx="146" cy="30" r="10" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
      <rect x="16" y="46" width="100" height="8" rx="4" fill="#ffffff"/>
    </svg>
  `),

  // 23. Combined Listing (قائمة مجمعة)
  "combined-listing": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="14" width="70" height="52" rx="6" fill="#242933"/>
      <rect x="92" y="18" width="80" height="8" rx="3" fill="#ffffff"/>
      <rect x="92" y="32" width="50" height="6" rx="2.5" fill="#10b981"/>
      <rect x="92" y="46" width="130" height="12" rx="3" fill="#3b82f6" fill-opacity="0.3"/>
    </svg>
  `),

  // 24. Cart Items / Cart Items Element (بنود السلة)
  "cart-items": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="12" width="212" height="26" rx="5" fill="#20242e"/>
      <rect x="22" y="18" width="16" height="14" rx="3" fill="#3b82f6"/>
      <rect x="44" y="21" width="70" height="6" rx="2" fill="#ffffff"/>
      <rect x="180" y="21" width="36" height="6" rx="2" fill="#10b981"/>
      <rect x="14" y="42" width="212" height="26" rx="5" fill="#20242e"/>
      <rect x="22" y="48" width="16" height="14" rx="3" fill="#3b82f6"/>
      <rect x="44" y="51" width="85" height="6" rx="2" fill="#ffffff"/>
      <rect x="180" y="51" width="36" height="6" rx="2" fill="#10b981"/>
    </svg>
  `),
  "cart-items-element": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="12" width="212" height="26" rx="5" fill="#20242e"/>
      <rect x="22" y="18" width="16" height="14" rx="3" fill="#3b82f6"/>
      <rect x="44" y="21" width="70" height="6" rx="2" fill="#ffffff"/>
      <rect x="180" y="21" width="36" height="6" rx="2" fill="#10b981"/>
      <rect x="14" y="42" width="212" height="26" rx="5" fill="#20242e"/>
      <rect x="22" y="48" width="16" height="14" rx="3" fill="#3b82f6"/>
      <rect x="44" y="51" width="85" height="6" rx="2" fill="#ffffff"/>
      <rect x="180" y="51" width="36" height="6" rx="2" fill="#10b981"/>
    </svg>
  `),

  // 25. Cart Totals & Checkout Button (إجمالي السلة وزر الطلب)
  "cart-totals": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="14" width="212" height="52" rx="6" fill="#1c212b" stroke="#333a48" stroke-width="1"/>
      <rect x="24" y="22" width="80" height="6" rx="2" fill="#94a3b8"/>
      <rect x="170" y="22" width="46" height="6" rx="2" fill="#ffffff"/>
      <rect x="24" y="38" width="192" height="18" rx="4" fill="#2563eb"/>
    </svg>
  `),
  "checkout-button": encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="20" y="20" width="200" height="40" rx="8" fill="#2563eb"/>
      <circle cx="50" cy="40" r="6" fill="#ffffff"/>
      <rect x="68" y="36" width="110" height="8" rx="4" fill="#ffffff"/>
    </svg>
  `),

  // 26. Coupon (كوبون الخصم)
  coupon: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="18" width="140" height="44" rx="6" fill="#1c202a" stroke="#475569" stroke-width="1" stroke-dasharray="4 2"/>
      <rect x="26" y="36" width="80" height="8" rx="3" fill="#cbd5e1"/>
      <rect x="160" y="18" width="66" height="44" rx="6" fill="#059669"/>
      <rect x="175" y="36" width="36" height="8" rx="3" fill="#ffffff"/>
    </svg>
  `),
};

// Category-based semantic SVG thumbnail generator
const CATEGORY_THUMBNAILS: Record<StudioSectionCategoryId, string> = {
  all: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#16181d"/>
      <rect x="14" y="12" width="65" height="56" rx="6" fill="#222733" stroke="#333a46" stroke-width="1"/>
      <rect x="87" y="12" width="65" height="56" rx="6" fill="#222733" stroke="#333a46" stroke-width="1"/>
      <rect x="160" y="12" width="65" height="56" rx="6" fill="#222733" stroke="#333a46" stroke-width="1"/>
    </svg>
  `),
  hero: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#16181d"/>
      <rect x="14" y="16" width="30" height="6" rx="3" fill="#3b82f6"/>
      <rect x="14" y="28" width="95" height="10" rx="4" fill="#ffffff"/>
      <rect x="14" y="44" width="70" height="5" rx="2.5" fill="#94a3b8"/>
      <rect x="14" y="55" width="45" height="13" rx="3.5" fill="#2563eb"/>
      <rect x="126" y="10" width="100" height="60" rx="6" fill="#222733" stroke="#333a48" stroke-width="1"/>
    </svg>
  `),
  products: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#17191e"/>
      <rect x="12" y="12" width="66" height="56" rx="6" fill="#222631" stroke="#333946" stroke-width="1"/>
      <rect x="87" y="12" width="66" height="56" rx="6" fill="#222631" stroke="#333946" stroke-width="1"/>
      <rect x="162" y="12" width="66" height="56" rx="6" fill="#222631" stroke="#333946" stroke-width="1"/>
    </svg>
  `),
  promotions: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="14" width="216" height="52" rx="8" fill="#251616" stroke="#ef4444" stroke-width="1.2"/>
      <circle cx="36" cy="40" r="14" fill="#ef4444"/>
      <rect x="60" y="26" width="90" height="8" rx="4" fill="#ffffff"/>
      <rect x="60" y="42" width="120" height="6" rx="3" fill="#fca5a5"/>
    </svg>
  `),
  trust: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="14" width="216" height="52" rx="8" fill="#14221c" stroke="#10b981" stroke-width="1.2"/>
      <circle cx="36" cy="40" r="14" fill="#10b981"/>
      <rect x="60" y="28" width="90" height="8" rx="4" fill="#ffffff"/>
      <rect x="60" y="44" width="130" height="6" rx="3" fill="#6ee7b7"/>
    </svg>
  `),
  content: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#181a20"/>
      <rect x="16" y="16" width="36" height="6" rx="3" fill="#3b82f6"/>
      <rect x="16" y="28" width="120" height="9" rx="4" fill="#ffffff"/>
      <rect x="16" y="44" width="180" height="5" rx="2.5" fill="#94a3b8"/>
      <rect x="16" y="55" width="140" height="5" rx="2.5" fill="#64748b"/>
    </svg>
  `),
  navigation: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="24" width="46" height="32" rx="6" fill="#202530" stroke="#333a48" stroke-width="1"/>
      <rect x="68" y="24" width="46" height="32" rx="6" fill="#202530" stroke="#333a48" stroke-width="1"/>
      <rect x="122" y="24" width="46" height="32" rx="6" fill="#202530" stroke="#333a48" stroke-width="1"/>
      <rect x="176" y="24" width="46" height="32" rx="6" fill="#202530" stroke="#333a48" stroke-width="1"/>
    </svg>
  `),
  pdp: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#16181d"/>
      <rect x="14" y="10" width="60" height="60" rx="6" fill="#242833"/>
      <rect x="86" y="18" width="90" height="8" rx="4" fill="#ffffff"/>
      <rect x="86" y="32" width="50" height="6" rx="3" fill="#10b981"/>
      <rect x="86" y="46" width="110" height="16" rx="4" fill="#2563eb"/>
    </svg>
  `),
  checkout: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="14" width="212" height="52" rx="6" fill="#1c212b" stroke="#333a48" stroke-width="1"/>
      <rect x="24" y="22" width="70" height="6" rx="2" fill="#94a3b8"/>
      <rect x="160" y="22" width="50" height="6" rx="2" fill="#ffffff"/>
      <rect x="24" y="38" width="192" height="18" rx="4" fill="#10b981"/>
    </svg>
  `),
  elements: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="14" y="14" width="212" height="52" rx="6" fill="#1e222b" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4 2"/>
      <rect x="30" y="26" width="80" height="8" rx="4" fill="#60a5fa"/>
      <rect x="30" y="42" width="120" height="6" rx="3" fill="#94a3b8"/>
    </svg>
  `),
  specialized: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
      <rect width="240" height="80" rx="8" fill="#15171c"/>
      <rect x="12" y="12" width="216" height="56" rx="8" fill="#1e222b" stroke="#8b5cf6" stroke-width="1.2"/>
      <circle cx="36" cy="40" r="14" fill="#8b5cf6" fill-opacity="0.3"/>
      <rect x="62" y="26" width="95" height="8" rx="4" fill="#ffffff"/>
      <rect x="62" y="42" width="125" height="6" rx="3" fill="#c4b5fd"/>
    </svg>
  `),
};

// Fallback generic section thumbnail
const DEFAULT_FALLBACK_THUMBNAIL = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
    <rect width="240" height="80" rx="8" fill="#1b1d22"/>
    <rect x="16" y="16" width="30" height="6" rx="3" fill="#3b82f6"/>
    <rect x="16" y="28" width="120" height="8" rx="4" fill="#f1f5f9"/>
    <rect x="16" y="44" width="180" height="4" rx="2" fill="#64748b"/>
    <rect x="16" y="53" width="140" height="4" rx="2" fill="#475569"/>
  </svg>
`);

export function getStudioSectionThumbnail(typeOrId: string): string {
  if (STUDIO_SECTION_THUMBNAILS[typeOrId]) {
    return STUDIO_SECTION_THUMBNAILS[typeOrId];
  }
  const category = resolveStorefrontSectionCategory(typeOrId);
  return CATEGORY_THUMBNAILS[category] || DEFAULT_FALLBACK_THUMBNAIL;
}
