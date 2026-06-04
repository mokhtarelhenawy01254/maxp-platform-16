import { useState } from "react";

export const useFAQ = (initialIndex: number | null = null) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(initialIndex);

  const toggleIndex = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return {
    activeIndex,
    toggleIndex,
    setActiveIndex,
  };
};
