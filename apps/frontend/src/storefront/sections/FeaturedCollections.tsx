import React from 'react';
import { FeaturedCollectionsProps } from './featured-collections/types';
import { useFeaturedCollectionsController } from './featured-collections/useFeaturedCollectionsController';
import { ButcherCutMapVariant } from './featured-collections/variants/ButcherCutMapVariant';
import { EasyOrdersCirclesVariant } from './featured-collections/variants/EasyOrdersCirclesVariant';
import { FeaturedCollectionsLayout } from './featured-collections/variants/FeaturedCollectionsLayout';

export * from './featured-collections';

export const FeaturedCollections: React.FC<FeaturedCollectionsProps> = ({
  section,
  settings,
}) => {
  const ctrl = useFeaturedCollectionsController(section, settings);

  if (ctrl.variant === 'butcher-cut-map') {
    return <ButcherCutMapVariant ctrl={ctrl} />;
  }

  if (ctrl.variant === 'easyorders-circles') {
    return <EasyOrdersCirclesVariant ctrl={ctrl} />;
  }

  return <FeaturedCollectionsLayout ctrl={ctrl} />;
};

export default FeaturedCollections;
