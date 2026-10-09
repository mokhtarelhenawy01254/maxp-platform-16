import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

interface Card {
  src: string;
  title: string;
  category: string;
  content: React.ReactNode;
}

interface CarouselProps {
  items: React.ReactNode[];
  initialScroll?: number;
}

type CarouselContextType = {
  onCardClose: (index: number) => void;
  currentIndex: number;
};

export const CarouselContext = createContext<CarouselContextType>({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel: React.FC<CarouselProps> = ({ items, initialScroll = 0 }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -400, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 400, behavior: "smooth" });
    }
  };

  const handleCardClose = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full overflow-hidden py-10">
        <div
          ref={carouselRef}
          onScroll={checkScrollability}
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:none px-6 md:px-12 gap-6"
        >
          {items.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index, ease: "easeOut" }}
              key={"carousel-item-" + index}
              className="last:pr-12 md:last:pr-24"
            >
              {item}
            </motion.div>
          ))}
        </div>

        {/* Minimal Navigation Controls */}
        <div className="flex justify-end gap-3 px-6 md:px-12 mt-4">
          <button
            type="button"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className="w-10 h-10 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all"
            aria-label="Scroll right"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="w-10 h-10 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all"
            aria-label="Scroll left"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({
  card,
  index,
  layout = false,
}: {
  card: Card;
  index: number;
  layout?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-50 max-w-3xl mx-auto my-12 bg-[#0B0B0C] border border-white/10 rounded-3xl p-6 md:p-10 text-white shadow-2xl"
            >
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-6 left-6 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono tracking-widest uppercase text-white/50 block mb-2">
                {card.category}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold font-serif mb-6">{card.title}</h2>
              <div className="overflow-hidden rounded-2xl mb-6 max-h-96">
                <img
                  src={card.src}
                  alt={card.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                {card.content}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={handleOpen}
        className="rounded-3xl bg-[#121214] border border-white/10 h-96 w-72 md:w-80 overflow-hidden flex flex-col items-start justify-between relative group hover:border-white/30 transition-all text-right shrink-0"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={card.src}
            alt={card.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-75 group-hover:brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        </div>

        <div className="relative z-10 p-6 flex flex-col justify-between h-full w-full">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-white/70 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
              {card.category}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white font-serif leading-tight mb-2">
              {card.title}
            </h3>
            <span className="text-xs text-white/60 group-hover:text-white transition-colors flex items-center gap-1">
              استكشف التفاصيل ←
            </span>
          </div>
        </div>
      </motion.button>
    </>
  );
};
