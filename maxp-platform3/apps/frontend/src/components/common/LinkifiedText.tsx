import React from 'react';
import Linkify from 'linkify-react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

const LINK_CLASSES =
  'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 decoration-blue-400/40 dark:decoration-blue-500/40 hover:decoration-blue-600/60 dark:hover:decoration-blue-300/60 transition-colors duration-150 cursor-pointer break-all';

const LinkifiedText: React.FC<LinkifiedTextProps> = React.memo(({ text, className }) => {
  if (!text) return null;

  return (
    <Linkify
      options={{
        defaultProtocol: 'https',
        target: '_blank',
        rel: 'noopener noreferrer',
        className: LINK_CLASSES,
        attributes: {
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        },
      }}
      tagName="span"
      className={className}
    >
      {text}
    </Linkify>
  );
});

LinkifiedText.displayName = 'LinkifiedText';

export default LinkifiedText;
