import React from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
}

/**
 * Optimized image component with lazy loading and async decoding
 * Use this instead of regular <img> tags for better performance
 */
export const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, ...props }) => {
    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={className}
            {...props}
        />
    );
};

export default LazyImage;
