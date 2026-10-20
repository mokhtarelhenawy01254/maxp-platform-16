import React from "react";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  question: string;
  answer: string;
}

interface AppDetailsFaqTabProps {
  faq: FaqItem[];
}

export const AppDetailsFaqTab: React.FC<AppDetailsFaqTabProps> = ({ faq }) => {
  const { t } = useTranslation();

  if (faq.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 text-right">
      <h2 className="text-xl font-extrabold text-foreground mb-4">
        {t("marketplace.faq")}
      </h2>
      <Accordion type="single" collapsible className="space-y-2">
        {faq.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="rounded-xl border bg-background px-4"
          >
            <AccordionTrigger className="text-sm font-bold text-right hover:no-underline">
              <HelpCircle size={14} className="ml-2 text-primary shrink-0" />
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
