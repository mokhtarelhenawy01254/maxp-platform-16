import { Link, useLocation } from "react-router-dom";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { buildStorefrontPath } from "../utils/paths";
import { resolveSectionVariant } from "../variants";

type JournalItem = {
  title: string;
  meta?: string;
  excerpt?: string;
  image: string;
  link: string;
};

interface JournalStripProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: unknown;
    [key: string]: unknown;
  };
}

const DEFAULT_ITEMS_RTL: JournalItem[] = [
  {
    title: "كيف تبنين خزانة شتوية أخف وأكثر أناقة",
    meta: "ستايل يومي",
    excerpt:
      "تنسيقات سهلة بين القطع الأساسية والطبقات الهادئة حتى تبدو الإطلالة مرتبة بدون مبالغة.",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    link: "/lookbook",
  },
  {
    title: "3 طرق لتنسيق الفساتين اليومية في الخروجات الخفيفة",
    meta: "دليل سريع",
    excerpt:
      "فستان واحد يمكن أن يأخذك من النهار إلى المساء إذا تغيّرت الطبقة والإكسسوار المناسب فقط.",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
    link: "/shop?category=dresses",
  },
  {
    title: "البلوش الهادئ ولماذا يظل الأكثر أناقة في البوتيكات الكلاسيكية",
    meta: "إلهام الموسم",
    excerpt:
      "لون دافئ وخفيف يرفع نعومة الصفحة والمنتج من غير أن يحوّل التجربة إلى شيء صاخب أو مبالغ فيه.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
    link: "/shop",
  },
];

const DEFAULT_ITEMS_LTR: JournalItem[] = [
  {
    title: "How to Build a Lighter Winter Wardrobe",
    meta: "Daily styling",
    excerpt:
      "Pairing calm layers and cleaner staples helps the wardrobe feel more refined without looking overly precious.",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    link: "/lookbook",
  },
  {
    title: "Three Ways to Style an Easy Day Dress",
    meta: "Quick guide",
    excerpt:
      "One dress can move from daylight to dinner with just a lighter layer and a better accessory rhythm.",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
    link: "/shop?category=dresses",
  },
  {
    title: "Why Soft Blush Still Wins in Classic Boutiques",
    meta: "Seasonal note",
    excerpt:
      "A warmer pink keeps the storefront romantic, airy, and feminine without drifting into a louder trend cycle.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
    link: "/shop",
  },
];

const isJournalItem = (value: unknown): value is JournalItem =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof (value as JournalItem).title === "string" &&
  typeof (value as JournalItem).image === "string" &&
  typeof (value as JournalItem).link === "string";

const parseItems = (value: unknown, isRtl: boolean): JournalItem[] => {
  if (Array.isArray(value)) {
    const parsed = value
      .filter(isJournalItem)
      .map((item) => ({
        title: item.title.trim(),
        meta: item.meta?.trim(),
        excerpt: item.excerpt?.trim(),
        image: item.image.trim(),
        link: item.link.trim(),
      }))
      .filter((item) => item.title && item.image && item.link);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = value
      .split(/\r?\n/)
      .map((line) => line.split("|").map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
      .map(([title, meta, image, link, excerpt]) => ({
        title: title || "",
        meta: meta || undefined,
        image: image || "",
        link: link || "/lookbook",
        excerpt: excerpt || undefined,
      }))
      .filter((item) => item.title && item.image && item.link);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return isRtl ? DEFAULT_ITEMS_RTL : DEFAULT_ITEMS_LTR;
};

const JournalStrip: React.FC<JournalStripProps> = ({ section, settings }) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const isRtl = theme.direction === "rtl";
  const variant = resolveSectionVariant(
    "JournalStrip",
    settings?.variant || section?.variant,
    "editorial-cards",
  );
  const items = parseItems(settings?.items, isRtl).slice(0, 3);
  const title =
    settings?.title || (isRtl ? "من يوميات البوتيك" : "From the Journal");
  const subtitle =
    settings?.subtitle ||
    (isRtl
      ? "محتوى خفيف يضيف نفسًا تحريريًا ناعمًا بين رفوف المنتجات والنشرة البريدية."
      : "A lighter editorial lane that keeps the storefront airy between product shelves and newsletter signup.");
  const hideSubtitle = settings?.hideSubtitle === true;

  if (variant === "vela-customer-testimonials") {
    return (
      <section className="bg-[#fffdfb] py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-3xl text-start">
            {settings?.badge ? (
              <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0abb45]">
                {String(settings.badge)}
              </span>
            ) : null}
            <h2 className="mt-3 font-heading text-[1.95rem] font-semibold tracking-tight text-[#171717] md:text-[2.4rem]">
              {title}
            </h2>
            {subtitle && !hideSubtitle ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b6b6b] md:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                item.link.startsWith("/") ? item.link : `/${item.link}`,
                location.search,
              );

              return (
                <Link
                  key={`${item.title}-${index}`}
                  to={href}
                  className="group flex h-full flex-col rounded-[1.25rem] border border-[#ebe5df] bg-white p-5 shadow-[0_24px_56px_-46px_rgba(18,18,18,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-46px_rgba(18,18,18,0.22)]"
                >
                  <p className="text-sm leading-7 text-[#404040]">
                    {item.excerpt}
                  </p>

                  <div className="mt-auto pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-[#ede3dd] bg-[#f4efea]">
                        <img
                          src={item.image}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#171717]">
                          {item.title}
                        </h3>
                        {item.meta ? (
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a8a]">
                            {item.meta}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#fdfaf7] py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          {settings?.badge ? (
            <span className="inline-flex rounded-full border border-[#e5d8d3] bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#9c7b74]">
              {String(settings.badge)}
            </span>
          ) : null}
          <h2 className="mt-4 font-heading text-[2rem] font-semibold tracking-tight text-[#201916] md:text-[2.45rem]">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#7b6d68] md:text-[15px]">
            {subtitle}
          </p>
        </div>

        <div
          className={`grid gap-6 ${
            variant === "editorial-cards"
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          }`}
        >
          {items.map((item, index) => {
            const href = buildStorefrontPath(
              location.pathname,
              item.link.startsWith("/") ? item.link : `/${item.link}`,
              location.search,
            );

            return (
              <Link
                key={`${item.title}-${index}`}
                to={href}
                className="group block"
              >
                <article className="space-y-4">
                  <div className="overflow-hidden rounded-[1.15rem] bg-[#f0ebe7] shadow-[0_22px_54px_-44px_rgba(45,27,23,0.28)]">
                    <div className="aspect-[15/10] overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-start">
                    {item.meta ? (
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-[#b06767]">
                        {item.meta}
                      </p>
                    ) : null}
                    <h3 className="font-heading text-[1.15rem] font-semibold leading-8 text-[#221a18]">
                      {item.title}
                    </h3>
                    {item.excerpt ? (
                      <p className="text-sm leading-7 text-[#716662]">
                        {item.excerpt}
                      </p>
                    ) : null}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default JournalStrip;
