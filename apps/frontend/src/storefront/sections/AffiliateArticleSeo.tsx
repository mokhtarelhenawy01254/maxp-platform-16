import React from "react";

interface Props {
  settings?: {
    headline?: string;
    description?: string;
    image?: string;
    datePublished?: string;
    dateModified?: string;
    authorName?: string;
    url?: string;
  };
}

const AffiliateArticleSeo: React.FC<Props> = ({ settings }) => {
  const headline = settings?.headline || "How To Choose The Right Electric Beard Trimmers";
  const description = settings?.description || "Let's be honest: most guys treat their beard trimmer like a blunt instrument. Expert guide to choosing the right electric beard trimmers.";
  const image = settings?.image || "https://mensgroomingpro.com/how-to-choose-the-right-electric-beard-trimmers/hero.webp";
  const datePublished = settings?.datePublished || "2026-08-11T00:00:00Z";
  const dateModified = settings?.dateModified || "2026-08-11T00:00:00Z";
  const authorName = settings?.authorName || "Jake Morrison";
  const url = settings?.url || "https://mensgroomingpro.com/how-to-choose-the-right-electric-beard-trimmers/";

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url,
    datePublished,
    dateModified,
    image,
    author: { "@type": "Person", name: authorName },
    publisher: {
      "@type": "Organization",
      name: "Mens Grooming Pro",
      logo: { "@type": "ImageObject", url: "https://mensgroomingpro.com/img/logo.svg" },
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mens Grooming Pro",
    url: "https://mensgroomingpro.com/",
    description: "Expert product reviews and guides for men's grooming",
    publisher: {
      "@type": "Organization",
      name: "Mens Grooming Pro",
      logo: { "@type": "ImageObject", url: "https://mensgroomingpro.com/img/logo.svg" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
    </>
  );
};

export default AffiliateArticleSeo;
