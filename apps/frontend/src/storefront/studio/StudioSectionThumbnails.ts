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
  return STUDIO_SECTION_THUMBNAILS[typeOrId] || DEFAULT_FALLBACK_THUMBNAIL;
}
