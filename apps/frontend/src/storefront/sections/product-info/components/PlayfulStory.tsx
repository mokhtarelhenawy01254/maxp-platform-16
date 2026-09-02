import React from 'react';
import { StaticMotionDiv } from '../../../components/StaticMotion';

export const PlayfulStory = ({
  header,
  price,
  actions,
  variants,
  description,
}: {
  header: React.ReactNode;
  price: React.ReactNode;
  actions: React.ReactNode;
  variants: React.ReactNode;
  description: React.ReactNode;
}) => (
  <div className="relative flex flex-col gap-6">
    <StaticMotionDiv
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      className="rounded-[3rem] border-8 border-white bg-white/60 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div className="flex flex-col gap-4">
        {header}
        {price}
      </div>

      <div className="my-8 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="space-y-6">
        {variants && <div className="space-y-2">{variants}</div>}
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-secondary/80 px-4 py-1 text-xs font-black uppercase tracking-widest text-secondary-foreground">
            The Story
          </div>
          <div className="text-base leading-relaxed text-foreground/80">
            {description}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {actions}
      </div>
    </StaticMotionDiv>

    {/* Decorative floating elements for the story */}
    <StaticMotionDiv
      animate={{
        y: [0, -10, 0],
        rotate: [0, 5, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute -right-8 -top-8 h-20 w-20 opacity-20 drop-shadow-xl"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full fill-primary">
        <path d="M50 0 L100 50 L50 100 L0 50 Z" />
      </svg>
    </StaticMotionDiv>
  </div>
);

PlayfulStory.displayName = 'PlayfulStory';
export default PlayfulStory;