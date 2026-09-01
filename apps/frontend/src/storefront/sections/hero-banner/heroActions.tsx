import React from "react";
import { Link } from "react-router-dom";

export const isExternalHref = (href: string): boolean =>
  /^(https?:\/\/|mailto:|tel:)/i.test(href);

export const renderHeroAction = (
  href: string | null | undefined,
  label: string | undefined,
  className: string,
): React.ReactNode => {
  if (!href || !label?.trim()) return null;
  if (href.startsWith("#")) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }}
        className={className}
      >
        {label}
      </a>
    );
  }
  return isExternalHref(href) ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label}
    </a>
  ) : (
    <Link to={href} className={className}>
      {label}
    </Link>
  );
};
