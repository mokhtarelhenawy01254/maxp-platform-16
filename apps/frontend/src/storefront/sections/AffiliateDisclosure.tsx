import React from "react";

interface Props {
  settings?: {
    text?: string;
    linkText?: string;
    linkHref?: string;
  };
}

const AffiliateDisclosure: React.FC<Props> = ({ settings }) => {
  const text =
    settings?.text ||
    "Affiliate Disclosure: This post contains affiliate links. If you purchase through our links, we may earn a small commission at no extra cost to you.";
  const linkText = settings?.linkText || "Full disclosure here.";
  const linkHref = settings?.linkHref || "/affiliate-disclaimer";

  return (
    <section className="w-full bg-background py-2">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-[6px] border border-[#f0d060] bg-[#fffbea] px-4 py-3 text-[13px] leading-6 text-[#7a6000]">
            <span className="font-semibold">⚠️ Affiliate Disclosure: </span>
            {text}{" "}
            <a href={linkHref} className="font-semibold text-[#5a4400] underline hover:no-underline">
              {linkText}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateDisclosure;
