import React, { useState } from 'react';

interface ReviewItem {
  name?: string;
  role?: string;
  quote?: string;
  avatar?: string;
  rating?: number | string;
}

interface ReviewsProps {
  section?: { variant?: string };
  settings?: {
    title?: string;
    subtitle?: string;
    intro?: string;
    reviews?: ReviewItem[] | string;
  };
}

const REVIEW_VARIANTS = new Set(['standard', 'circle', 'cards']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return REVIEW_VARIANTS.has(normalizedValue) ? normalizedValue : 'circle';
};

const parseReviews = (value: ReviewsProps['settings'] extends undefined ? never : unknown): ReviewItem[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', role = '', quote = '', avatar = '', rating = ''] = line
        .split('|')
        .map((part) => part.trim());
      return { name, role, quote, avatar, rating };
    });
};

const DEFAULT_REVIEWS: ReviewItem[] = [
  { name: 'Mackle Johnathan', role: 'Manager', quote: 'The quality and fit are outstanding — every piece feels curated and premium.', avatar: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_45444.png?v=1787286485&width=120', rating: 5 },
  { name: 'Noah Anderson', role: 'Stylist', quote: 'From the fabric to the stitching, everything reads intentional and timeless.', avatar: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle93_3.png?v=1787287360&width=120', rating: 5 },
  { name: 'Ava Thompson', role: 'Buyer', quote: 'Effortless to style and always gets compliments — my go-to wardrobe edit.', avatar: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle45440.png?v=1787286887&width=120', rating: 4 },
  { name: 'James Richardson', role: 'Director', quote: 'Professional, polished, and a seamless shopping experience start to finish.', avatar: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle33_7.png?v=1784364663&width=120', rating: 5 },
  { name: 'Olivia Bennett', role: 'Creator', quote: 'The color and size options made the decision effortless and exact.', avatar: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/88396e42bdc4fabeb247862b7d9c51cef76aa494.jpg?v=1784534763&width=120', rating: 5 },
  { name: 'Emma Wilson', role: 'Client', quote: 'Refined pieces that move beautifully from the office to the evening.', avatar: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle96_7.png?v=1787287360&width=120', rating: 4 },
];

const renderStars = (rating: number | string | undefined) => {
  const value = Number(rating) || 5;
  return (
    <div className="flex justify-center gap-1 text-[#e16244]">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} viewBox="0 0 24 24" className={`h-4 w-4 ${star <= value ? 'fill-current' : 'fill-black/10'}`}>
          <path d="M12 2l2.9 6.26 6.6.63-5 4.4 1.5 6.5L12 16.9 5.99 19.79 7.5 13.29 2.5 8.89l6.6-.63L12 2z" />
        </svg>
      ))}
    </div>
  );
};

const Reviews: React.FC<ReviewsProps> = ({ section, settings }) => {
  const variant = normalizeVariant(section?.variant);
  const title = settings?.title || 'The Best Reviews From Clients';
  const intro =
    settings?.intro ||
    'Explore curated styles designed to bring effortless elegance and everyday confidence to every look.';
  const reviews = parseReviews(settings?.reviews);
  const resolvedReviews = reviews.length > 0 ? reviews : DEFAULT_REVIEWS;
  const [active, setActive] = useState(0);
  const activeReview =
    resolvedReviews[Math.min(active, resolvedReviews.length - 1)] ??
    resolvedReviews[0] ?? { name: '', role: '', quote: '' };

  const isCards = variant === 'cards';

  if (isCards) {
    return (
      <section className="w-full bg-white py-14 md:py-20">
        <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
          <div className="mb-10 text-center">
            <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
              Reviews
            </span>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
            {intro && <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#575757] md:text-base">{intro}</p>}
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resolvedReviews.map((review, index) => (
              <div key={`${review.name}-${index}`} className="rounded-[15px] border border-black/5 bg-[#f7f7f7] p-6">
                {renderStars(review.rating)}
                <p className="mt-4 text-sm leading-7 text-[#3a3a3a]">“{review.quote}”</p>
                <div className="mt-5 flex items-center gap-3">
                  {review.avatar && <img src={review.avatar} alt={review.name || 'reviewer'} loading="lazy" className="h-11 w-11 rounded-full object-cover" />}
                  <div>
                    <p className="text-sm font-semibold text-[#171717]">{review.name}</p>
                    <p className="text-xs text-[#8a8a8a]">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full overflow-hidden bg-white py-14 md:py-24">
      <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
        <div className="mb-6 text-center">
          <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
            Reviews
          </span>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
          {intro && <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#575757] md:text-base">{intro}</p>}
        </div>

        {/* Orbit: avatars on an ellipse around the active quote */}
        <div className="relative mx-auto flex h-[430px] max-w-[900px] items-center justify-center md:h-[480px]">
          {resolvedReviews.map((review, index) => {
            const total = resolvedReviews.length;
            // The active reviewer always sits at the top of the ellipse;
            // the rest rotate around it, like the Texture original.
            const position = (index - active + total) % total;
            const angle = (position / total) * Math.PI * 2 - Math.PI / 2;
            const rx = 46; // % of container width
            const ry = 44; // % of container height
            const x = 50 + rx * Math.cos(angle);
            const y = 50 + ry * Math.sin(angle);
            const isActive = position === 0;
            return (
              <button
                key={`${review.name}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={review.name}
                className={`absolute overflow-hidden rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? 'z-10 h-24 w-24 border-[3px] border-[#171717] shadow-[0_20px_44px_-20px_rgba(0,0,0,0.45)] md:h-28 md:w-28'
                    : 'h-14 w-14 opacity-70 hover:opacity-100 hover:shadow-[0_14px_30px_-16px_rgba(0,0,0,0.4)] md:h-20 md:w-20'
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {review.avatar && (
                  <img src={review.avatar} alt={review.name || 'reviewer'} loading="lazy" className="h-full w-full object-cover" />
                )}
              </button>
            );
          })}

          {/* Center quote */}
          <div className="relative z-[5] mx-6 max-w-md text-center md:mx-16">
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 select-none font-heading text-[5rem] leading-none text-black/[0.07]">
              “
            </span>
            <div className="relative">
              {renderStars(activeReview.rating)}
              <p className="mt-4 text-sm leading-7 text-[#3a3a3a] md:text-[15px]">“{activeReview.quote}”</p>
              <p className="mt-4 font-heading text-xl font-medium text-[#2c2426]">{activeReview.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-[#8a8a8a]">{activeReview.role}</p>
            </div>
          </div>
        </div>
      </div>

      <AutoRotate active={active} count={resolvedReviews.length} onSelect={setActive} />
    </section>
  );
};

const AutoRotate: React.FC<{
  active: number;
  count: number;
  onSelect: (index: number) => void;
}> = ({ active, count, onSelect }) => {
  React.useEffect(() => {
    if (count < 2) return undefined;
    const timer = setInterval(() => {
      onSelect((active + 1) % count);
    }, 5000);
    return () => clearInterval(timer);
  }, [active, count, onSelect]);
  return null;
};

export default Reviews;
