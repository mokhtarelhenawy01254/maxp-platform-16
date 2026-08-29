import React from "react";

interface Props {
  settings?: {
    title?: string;
    text?: string;
    icon?: string;
  };
}

const AffiliateProTip: React.FC<Props> = ({ settings }) => {
  const title = settings?.title || "Pro Tip";
  const text =
    settings?.text ||
    "If you have dense hair, don't skimp on the motor. A high-power trimmer handles thick growth smoothly, whereas a weaker model will bog down and leave you with a patchy finish.";
  const icon = settings?.icon || "💡";

  return (
    <section className="w-full bg-background py-2">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-lg border-l-4 border-[#19212B] bg-[#f0f4f8] px-4 py-4">
            <p className="text-sm leading-6 text-[#1a1a1a]">
              <span className="font-bold">
                {icon} {title}:
              </span>{" "}
              {text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateProTip;
