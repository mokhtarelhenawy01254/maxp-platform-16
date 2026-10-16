import React from 'react';
import Linkify from 'linkify-react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

const LINK_CLASSES =
  'text-primary hover:text-primary/85 underline underline-offset-2 decoration-primary/35 hover:decoration-primary transition-colors duration-150 cursor-pointer break-all font-medium';

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
