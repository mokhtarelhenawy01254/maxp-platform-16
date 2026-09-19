import React, { useState } from "react";
import { envConfig } from "@/config/environment";

interface CompanyLogoProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  title?: string;
  companyName?: string;
  children?: React.ReactNode;
}

export function CompanyLogo({ src, alt = "", className = "", title, companyName, children }: CompanyLogoProps) {
  const [erred, setErred] = useState(false);

  if (src && !erred) {
    const isFullUrl = src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:");
    const imgUrl = isFullUrl
      ? src
      : `${envConfig.backendUrl}${src.startsWith("/") ? "" : "/"}${src}`;
    return (
      <img
        src={imgUrl}
        alt={alt}
        className={className}
        title={title}
        onError={() => setErred(true)}
      />
    );
  }

  return <>{children}</>;
}
