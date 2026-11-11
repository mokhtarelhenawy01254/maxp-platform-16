import React from 'react';
import { Link } from 'react-router-dom';
import type { FeaturedCollectionsProps } from './types';
import { useFeaturedCollectionsController } from './useFeaturedCollectionsController';

/**
 * Marketplace category tiles: one horizontal rail of tall photo tiles (105x146 with a square
 * photo on top and a 15px label underneath), the shape the department-store demo uses for
 * "Shop by categories". No section badge, no subtitle, no wrapping to a second row.
 */
export const MarketplaceCategoryTiles: React.FC<{ ctrl: ReturnType<typeof useFeaturedCollectionsController>; settings?: Record<string, unknown> }> = ({ ctrl, settings }) => {
  const cards = ((ctrl.collectionCards || ctrl.collections || []) as Array<Record<string, unknown>>).slice(0, 12);
  const cardTitle = (card: Record<string, unknown>) =>
    String((card['title'] || card['name'] || card['label'] || card['categoryName'] || '') as string).trim();
  const cardImage = (card: Record<string, unknown>) => String((card['image'] || card['imageUrl'] || '') as string).trim();
  const cardLink = (card: Record<string, unknown>) => String((card['link'] || card['href'] || '') as string).trim();
  if (!cards.length) return null;

  return (
    <section className="w-full bg-white py-4">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        {ctrl.title && settings?.['hideTitle'] !== true ? (
          <h2 className="mb-4 font-heading text-[22px] font-semibold text-[#333333] md:text-[24px]">{ctrl.title}</h2>
        ) : null}

        <div className="flex snap-x snap-mandatory gap-[21px] overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards.map((card, index) => (
            <Link
              key={`${cardTitle(card) || 'tile'}-${index}`}
              to={cardLink(card) || '/collections'}
              className="group flex w-[105px] shrink-0 snap-start flex-col items-center gap-2 text-center"
            >
              <span className="block h-[108px] w-[108px] overflow-hidden bg-white">
                {cardImage(card) ? (
                  <img
                    src={cardImage(card)}
                    alt={cardTitle(card)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
              </span>
              <span className="text-[15px] font-semibold leading-tight text-[#333333] group-hover:text-[#e14a5c]">
                {cardTitle(card)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
