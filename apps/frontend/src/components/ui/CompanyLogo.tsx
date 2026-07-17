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
    const imgUrl = src.startsWith("http") ? src : `${envConfig.backendUrl}${src}`;
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
