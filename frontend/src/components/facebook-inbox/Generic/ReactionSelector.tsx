import React from "react";

interface ReactionSelectorProps {
  onSelect: (reaction: string) => void;
  currentReaction?: string;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const ReactionSelector: React.FC<ReactionSelectorProps> = ({
  onSelect,
  currentReaction,
}) => {
  return (
    <div className="business-dropdown-surface absolute bottom-full left-0 z-10 mb-2 flex gap-1 rounded-full p-1 animate-fade-in">
      {REACTIONS.map((reaction) => (
        <button
          type="button"
          key={reaction}
          onClick={() => onSelect(reaction)}
          className="business-icon-button business-icon-button--sm transition-transform hover:scale-110"
          style={
            currentReaction === reaction
              ? {
                  background:
                    "color-mix(in srgb, var(--color-primary) 10%, white)",
                  borderColor:
                    "color-mix(in srgb, var(--color-primary) 18%, transparent)",
                }
              : undefined
          }
          title={reaction}
        >
          <span className="text-xl leading-none block">{reaction}</span>
        </button>
      ))}
    </div>
  );
};

export default ReactionSelector;
