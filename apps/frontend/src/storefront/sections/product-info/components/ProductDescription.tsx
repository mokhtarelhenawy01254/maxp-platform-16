import React from 'react';

export const ProductDescription = ({
  safeDescription,
  emptyText = 'لا يوجد وصف متاح لهذا المنتج حالياً.',
}: {
  safeDescription: string;
  emptyText?: string;
}) => (
  safeDescription ? (
    <div
      className="product-rich-description w-full max-w-none text-base leading-relaxed text-foreground/90 prose prose-base dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: safeDescription }}
    />
  ) : (
    <p className="text-base leading-relaxed text-muted-foreground/90">
      {emptyText}
    </p>
  )
);

ProductDescription.displayName = 'ProductDescription';
export default ProductDescription;