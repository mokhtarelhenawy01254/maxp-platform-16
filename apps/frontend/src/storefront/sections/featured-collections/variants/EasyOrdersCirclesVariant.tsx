import React from 'react';
import { Link } from 'react-router-dom';
import { FeaturedCollectionsController } from '../useFeaturedCollectionsController';

/**
 * EasyOrders / EMY category row: five circular images with the category name
 * underneath, centered title + subtitle above. RTL friendly.
 */
export const EasyOrdersCirclesVariant: React.FC<{
  ctrl: FeaturedCollectionsController;
}> = ({ ctrl }) => {
  const { collectionCards, title, subtitle, hideSubtitle } = ctrl;
  const items = collectionCards.slice(0, 6);

  if (!items.length) {
    return null;
  }

  return (
    <section className="bg-white py-10 md:py-14" dir="rtl">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="text-center">
          {title ? (
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
              {title}
            </h2>
          ) : null}
          {!hideSubtitle && subtitle ? (
            <p className="mt-2 text-sm text-neutral-500 md:text-base">{subtitle}</p>
          ) : null}
        </div>

        <div className="mt-7 grid grid-cols-3 gap-4 md:grid-cols-5 md:gap-6">
          {items.map((card) => (
            <Link
              key={card.id}
              to={card.href || '/shop'}
              className="group flex flex-col items-center text-center"
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200/70">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : null}
              </span>
              <span className="mt-3 text-sm font-bold text-neutral-900">{card.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
