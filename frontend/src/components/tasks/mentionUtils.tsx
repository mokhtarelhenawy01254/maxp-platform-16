import React from "react";

export const extractMentions = (text: string): string[] => {
  const mentions = text.match(/@(\w+_\w+)/g) || [];
  return mentions.map((mention) => mention.substring(1));
};

export const renderWithMentions = (text: string): React.ReactNode => {
  const parts = text.split(/(@\w+_\w+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="text-indigo-600 font-medium">
          {part}
        </span>
      );
    }

    return part;
  });
};
