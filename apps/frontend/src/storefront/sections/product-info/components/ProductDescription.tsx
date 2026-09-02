import React from 'react';

export const ProductDescription = ({
  safeDescription,
  emptyText = '?? ???? ??? ???? ???? ?????? ??? ????.',
}: {
  safeDescription: string;
  emptyText?: string;
}) => (
  safeDescription ? (
    <div
      className="text-base leading-relaxed text-muted-foreground/90 max-w-lg prose prose-sm dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: safeDescription }}
    />
  ) : (
    <p className="text-base leading-relaxed text-muted-foreground/90 max-w-lg">
      {emptyText}
    </p>
  )
);

ProductDescription.displayName = 'ProductDescription';
export default ProductDescription;