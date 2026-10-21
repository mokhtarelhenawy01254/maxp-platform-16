import React from 'react';
import {
  SparklesIcon,
  CheckCircleIcon,
  StarIcon,
  HeartIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  PhoneIcon,
  BoltIcon,
  FireIcon,
  TagIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PhotoIcon,
  PlayIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

export interface IconElementSettings {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number | string;
  color?: string;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  className?: string;
}

export interface IconElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: IconElementSettings;
    [key: string]: any;
  };
  settings?: IconElementSettings;
}

const ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  sparkles: SparklesIcon,
  check: CheckCircleIcon,
  'check-circle': CheckCircleIcon,
  star: StarIcon,
  heart: HeartIcon,
  'shopping-bag': ShoppingBagIcon,
  bag: ShoppingBagIcon,
  cart: ShoppingBagIcon,
  truck: TruckIcon,
  shipping: TruckIcon,
  delivery: TruckIcon,
  shield: ShieldCheckIcon,
  security: ShieldCheckIcon,
  phone: PhoneIcon,
  contact: PhoneIcon,
  bolt: BoltIcon,
  flash: BoltIcon,
  fire: FireIcon,
  hot: FireIcon,
  tag: TagIcon,
  discount: TagIcon,
  chat: ChatBubbleBottomCenterTextIcon,
  message: ChatBubbleBottomCenterTextIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  photo: PhotoIcon,
  image: PhotoIcon,
  play: PlayIcon,
  video: PlayIcon,
  info: InformationCircleIcon,
  information: InformationCircleIcon,
  help: QuestionMarkCircleIcon,
  question: QuestionMarkCircleIcon,
};

const IconElement: React.FC<IconElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const rawName = String(mergedSettings?.name || 'sparkles').trim().toLowerCase();
  const rawSize = mergedSettings?.size;
  const color = mergedSettings?.color?.trim();
  const rawAlign = String(mergedSettings?.align || 'start').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  const IconComponent = ICON_REGISTRY[rawName] || SparklesIcon;

  // Resolve size
  let sizeClass = 'w-6 h-6'; // default md
  let inlineSize: string | undefined;

  if (typeof rawSize === 'number') {
    inlineSize = `${rawSize}px`;
  } else {
    const s = String(rawSize || 'md').trim().toLowerCase();
    if (s === 'sm') {
      sizeClass = 'w-4 h-4';
    } else if (s === 'lg') {
      sizeClass = 'w-9 h-9';
    } else if (s === 'xl') {
      sizeClass = 'w-12 h-12';
    } else if (s.endsWith('px') || s.endsWith('rem')) {
      inlineSize = s;
    }
  }

  // Alignment
  let alignClass = 'justify-start';
  if (rawAlign === 'center') {
    alignClass = 'justify-center';
  } else if (rawAlign === 'end' || rawAlign === 'right') {
    alignClass = 'justify-end';
  }

  const iconStyle: React.CSSProperties = {
    color: color === 'accent' ? 'var(--store-accent, #2563eb)' : color || 'var(--store-accent, currentColor)',
  };

  if (inlineSize) {
    iconStyle.width = inlineSize;
    iconStyle.height = inlineSize;
  }

  return (
    <div
      data-storefront-element="icon"
      data-element="icon"
      data-icon-name={rawName}
      data-icon-color={color || 'default'}
      className={`storefront-icon-wrapper flex w-full items-center ${alignClass} ${customClass}`.trim()}
    >
      <IconComponent
        className={`${inlineSize ? '' : sizeClass} text-[var(--store-accent,currentColor)] transition-colors duration-150 shrink-0`}
        style={iconStyle}
        aria-hidden="true"
      />
    </div>
  );
};

export default IconElement;
