import React from 'react';
import type { ProductVariant } from '../hooks/useProducts';
import { canonicalizeAttributeKey, getVariantAttributeLabel, getVariantAttributes } from '../utils/variants';
import {
  buildStorefrontImageCandidates,
  normalizeStorefrontImageValue,
} from '../utils/productImages';
import { useStorefrontTheme } from '../engine/ThemeProvider';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedAttributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
  density?: 'default' | 'compact';
  layout?: 'default' | 'inline-compact';
  variantSettings?: {
    styles?: Record<string, unknown> | null;
    attributeImages?: Record<string, unknown> | null;
    attributeColors?: Record<string, unknown> | null;
  } | null;
  isOpen?: boolean;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

type VariantDisplayStyle =
  | 'buttons'
  | 'circles'
  | 'dropdown'
  | 'thumbnails'
  | 'radio';

const FALLBACK_LIGHT: RgbColor = { r: 255, g: 255, b: 255 };
const FALLBACK_DARK: RgbColor = { r: 17, g: 24, b: 39 };
const CANONICAL_ATTRIBUTE_LABELS: Record<string, string> = {
  color: 'Color',
  colors: 'Color',
  colour: 'Color',
  colours: 'Color',
  لون: 'Color',
  اللون: 'Color',
  الالوان: 'Color',
  الألوان: 'Color',
  الوان: 'Color',
  ألوان: 'Color',
  size: 'Size',
  sizes: 'Size',
  المقاس: 'Size',
  المقاسات: 'Size',
  الحجم: 'Size',
  الاحجام: 'Size',
  الأحجام: 'Size',
  shoe_size: 'Size',
  shoeSize: 'Size',
  'shoe-size': 'Size',
  'مقاس الحذاء': 'Size',
  material: 'Material',
  الخامة: 'Material',
  style: 'Style',
  الطراز: 'Style',
};

const COLOR_PRESETS: Record<string, string> = {
  black: '#000000',
  'أسود': '#000000',
  'اسود': '#000000',
  'أسود كلاسيك': '#18181b',
  'اسود كلاسيك': '#18181b',
  white: '#ffffff',
  'أبيض': '#ffffff',
  'ابيض': '#ffffff',
  'أبيض لؤلؤي': '#f7f1ea',
  'ابيض لؤلؤي': '#f7f1ea',
  'أوف وايت': '#f5efe6',
  'اوف وايت': '#f5efe6',
  red: '#dc2626',
  'أحمر': '#dc2626',
  'احمر': '#dc2626',
  blue: '#1d4ed8',
  'أزرق': '#1d4ed8',
  'ازرق': '#1d4ed8',
  green: '#16a34a',
  'أخضر': '#16a34a',
  'اخضر': '#16a34a',
  brown: '#8b4513',
  'بني': '#8b4513',
  beige: '#d0b089',
  'بيج': '#d0b089',
  gray: '#6b7280',
  grey: '#6b7280',
  'رمادي': '#6b7280',
  'رصاصي': '#6b7280',
  pink: '#ec4899',
  'وردي': '#ec4899',
  'زهري': '#ec4899',
  gold: '#d4af37',
  'ذهبي': '#d4af37',
  silver: '#c0c0c0',
  'فضي': '#c0c0c0',
  orange: '#f97316',
  'برتقالي': '#f97316',
  purple: '#8b5cf6',
  'بنفسجي': '#8b5cf6',
  yellow: '#facc15',
  'أصفر': '#facc15',
  'اصفر': '#facc15',
  navy: '#0f172a',
  'كحلي': '#0f172a',
  olive: '#6b8e23',
  'زيتي': '#6b8e23',
  'زيتي غامق': '#556b2f',
  'زيتي فاتح': '#879b4a',
  khaki: '#b59c67',
  'خاكي': '#b59c67',
  camel: '#c19a6b',
  'جملي': '#c19a6b',
  'هافان': '#8b6f47',
  mauve: '#a855f7',
  'موف': '#a855f7',
  'موف توتي': '#8f5576',
  'عنابي': '#6f1d3a',
  'خمري': '#6f1d3a',
  'نبيتي': '#702632',
  'برجاندي': '#7a1f3d',
  'بيج لوزي': '#c9a27a',
  'بيج رملي': '#d6b089',
  'وردي هادئ': '#dea1b1',
  'وردي غباري': '#c58f95',
  'بينك': '#ec4899',
  'بينك فاتح': '#f9a8d4',
  'بيبي بينك': '#fbcfe8',
  'فوشيا': '#d946ef',
  'روز': '#f472b6',
  'كريمي': '#efe2d2',
  'كريمي وردي': 'linear-gradient(135deg, #f1e3d8 0%, #e9b8c2 100%)',
  'سيج هادئ': '#95a895',
  'كشمير': '#c8a27d',
  'كاشمير': '#c8a27d',
  'مينت جرين': '#98d8c8',
  'لافندر': '#b39ddb',
  'بيبي بلو': '#93c5fd',
  'السماوي': '#38bdf8',
  'جنزاري': '#0f766e',
  'بترولي': '#155e75',
  'بترولي فاتح': '#0ea5a4',
  'البترولي الغامق': '#164e63',
  'بطيخي': '#fb7185',
  'مسترده': '#d4a017',
  'اورانج': '#f97316',
  'أورانج': '#f97316',
  'الأورانج': '#f97316',
  'دهبي': '#d4af37',
  'تلجي': '#e0f2fe',
  'فسفوري': '#a3e635',
};

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const toRgbString = ({ r, g, b }: RgbColor) => `rgb(${r}, ${g}, ${b})`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);


const parseHslToken = (rawValue: string): RgbColor | null => {
  const normalized = String(rawValue || '')
    .trim()
    .replace(/^hsl\(/i, '')
    .replace(/\)$/g, '')
    .split('/')[0]
    .trim();

  const match = normalized.match(
    /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/,
  );
  if (!match) {
    return null;
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const matchLightness = lightness - chroma / 2;
  return {
    r: clampChannel((red + matchLightness) * 255),
    g: clampChannel((green + matchLightness) * 255),
    b: clampChannel((blue + matchLightness) * 255),
  };
};

const toRelativeLuminance = ({ r, g, b }: RgbColor) => {
  const normalizeChannel = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * normalizeChannel(r) +
    0.7152 * normalizeChannel(g) +
    0.0722 * normalizeChannel(b)
  );
};

const getContrastRatio = (left: RgbColor, right: RgbColor) => {
  const leftLuminance = toRelativeLuminance(left);
  const rightLuminance = toRelativeLuminance(right);
  const [lightest, darkest] =
    leftLuminance >= rightLuminance
      ? [leftLuminance, rightLuminance]
      : [rightLuminance, leftLuminance];
  return (lightest + 0.05) / (darkest + 0.05);
};

const resolveReadableSelectedTextColor = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const target =
    document.getElementById('storefront-engine-root') || document.documentElement;
  const styles = window.getComputedStyle(target);
  const primary = parseHslToken(styles.getPropertyValue('--primary'));

  if (!primary) {
    return null;
  }

  const preferredForeground = parseHslToken(
    styles.getPropertyValue('--primary-foreground'),
  );
  if (preferredForeground && getContrastRatio(primary, preferredForeground) >= 4.5) {
    return toRgbString(preferredForeground);
  }

  const themeForeground = parseHslToken(styles.getPropertyValue('--foreground'));
  if (themeForeground && getContrastRatio(primary, themeForeground) >= 4.5) {
    return toRgbString(themeForeground);
  }

  return getContrastRatio(primary, FALLBACK_LIGHT) >= getContrastRatio(primary, FALLBACK_DARK)
    ? toRgbString(FALLBACK_LIGHT)
    : toRgbString(FALLBACK_DARK);
};

const normalizeVariantDisplayStyle = (
  value: unknown,
  isColor: boolean,
): VariantDisplayStyle => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (
    normalizedValue === 'buttons' ||
    normalizedValue === 'circles' ||
    normalizedValue === 'dropdown' ||
    normalizedValue === 'thumbnails' ||
    normalizedValue === 'radio'
  ) {
    return normalizedValue;
  }

  return isColor ? 'circles' : 'buttons';
};

const parseVariantMetadata = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseVariantImages = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch {
      return [trimmed];
    }
  }

  if (value) {
    return [value];
  }

  return [];
};

const normalizeColorToken = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' '); // normalize Arabic/spacing variants

const NORMALIZED_COLOR_PRESETS = Object.entries(COLOR_PRESETS).reduce<
  Record<string, string>
>((acc, [key, value]) => {
  acc[normalizeColorToken(key)] = value;
  return acc;
}, {});

const DARK_COLOR_TOKENS = ['غامق', 'غامقه', 'داكن', 'dark', 'deep'];
const LIGHT_COLOR_TOKENS = ['فاتح', 'فاتحه', 'light'];

const parseHexColor = (value: string): RgbColor | null => {
  const normalized = value.trim();
  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!hexMatch) {
    return null;
  }

  const hex = hexMatch[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
};

const toHexColor = ({ r, g, b }: RgbColor) =>
  `#${clampChannel(r).toString(16).padStart(2, '0')}${clampChannel(g)
    .toString(16)
    .padStart(2, '0')}${clampChannel(b).toString(16).padStart(2, '0')}`;

const shiftColor = (color: RgbColor, amount: number): RgbColor => ({
  r: clampChannel(color.r + amount),
  g: clampChannel(color.g + amount),
  b: clampChannel(color.b + amount),
});

const applyToneModifier = (baseColor: string, normalizedLabel: string): string => {
  const parsedBaseColor = parseHexColor(baseColor);
  if (!parsedBaseColor) {
    return baseColor;
  }

  if (DARK_COLOR_TOKENS.some((token) => normalizedLabel.includes(token))) {
    return toHexColor(shiftColor(parsedBaseColor, -28));
  }

  if (LIGHT_COLOR_TOKENS.some((token) => normalizedLabel.includes(token))) {
    return toHexColor(shiftColor(parsedBaseColor, 28));
  }

  return baseColor;
};

const getCircleFallbackLabel = (option: string): string => {
  const trimmed = option.trim();
  if (!trimmed) {
    return '?';
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
};

const resolveColorValue = (option: string): string | null => {
  const normalized = normalizeColorToken(option);
  if (!normalized) {
    return null;
  }

  const exactMatch = NORMALIZED_COLOR_PRESETS[normalized];
  if (exactMatch) {
    return applyToneModifier(exactMatch, normalized);
  }

  const normalizedParts = normalized.split(/[\s/-]+/).filter(Boolean);
  const partialMatch = Object.entries(NORMALIZED_COLOR_PRESETS)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([token]) => {
      if (!token) {
        return false;
      }

      if (normalized.includes(token) || token.includes(normalized)) {
        return true;
      }

      const tokenParts = token.split(/[\s/-]+/).filter(Boolean);
      return tokenParts.every((part) =>
        normalizedParts.some(
          (candidate) =>
            candidate === part ||
            candidate.includes(part) ||
            part.includes(candidate),
        ),
      );
    });

  return partialMatch?.[1] ? applyToneModifier(partialMatch[1], normalized) : null;
};

const normalizeOptionKey = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');

const isOptionSelected = (selectedValue: string | undefined, option: string): boolean => {
  if (!selectedValue) return false;
  if (selectedValue === option) return true;
  return normalizeOptionKey(selectedValue) === normalizeOptionKey(option);
};

const getOptionMatch = <T,>(
  source: Record<string, T> | undefined,
  option: string,
): T | undefined => {
  if (!source) {
    return undefined;
  }

  if (source[option] !== undefined) {
    return source[option];
  }

  const directNormalizedOption = option.trim().toLowerCase();
  const directMatch = Object.entries(source).find(
    ([candidate]) => candidate.trim().toLowerCase() === directNormalizedOption,
  );
  if (directMatch !== undefined) {
    return directMatch[1];
  }

  const arabicNormalizedOption = normalizeOptionKey(option);
  const matchedEntry = Object.entries(source).find(
    ([candidate]) => normalizeOptionKey(candidate) === arabicNormalizedOption,
  );

  return matchedEntry?.[1];
};


const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants = [],
  selectedAttributes = {},
  onChange,
  density = 'default',
  layout = 'default',
  variantSettings,
  isOpen = true,
}) => {
  if (!isOpen) return null;
  const { theme } = useStorefrontTheme();
  const isZenOrganic = theme.id === 'zen-organic';
  const isKhemetLuxeElessi = theme.id === 'khemet-luxe-eg';
  const prefersArabicCopy = theme.direction === 'rtl';
  const isCompact = density === 'compact';
  const isInlineCompact = isCompact && layout === 'inline-compact';

  const [selectedTextColor, setSelectedTextColor] = React.useState<string | null>(
    () => resolveReadableSelectedTextColor(),
  );

  const normalizedStyles = React.useMemo(() => {
    if (!isRecord(variantSettings?.styles)) {
      return {} as Record<string, string>;
    }

    return Object.entries(variantSettings.styles).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const normalizedKey = canonicalizeAttributeKey(key);
        const normalizedValue = String(value || '').trim();

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue;
        }

        return acc;
      },
      {},
    );
  }, [variantSettings?.styles]);

  const normalizedAttributeImages = React.useMemo(() => {
    if (!isRecord(variantSettings?.attributeImages)) {
      return {} as Record<string, Record<string, string>>;
    }

    return Object.entries(variantSettings.attributeImages).reduce<
      Record<string, Record<string, string>>
    >((acc, [key, value]) => {
      const normalizedKey = canonicalizeAttributeKey(key);
      if (!normalizedKey || !isRecord(value)) {
        return acc;
      }

      const valueMap = Object.entries(value).reduce<Record<string, string>>(
        (valueAcc, [option, imageValue]) => {
          const normalizedValue = normalizeStorefrontImageValue(
            imageValue as Parameters<typeof normalizeStorefrontImageValue>[0],
          );
          if (normalizedValue) {
            valueAcc[String(option)] = normalizedValue;
          }
          return valueAcc;
        },
        {},
      );

      if (Object.keys(valueMap).length > 0) {
        acc[normalizedKey] = valueMap;
      }

      return acc;
    }, {});
  }, [variantSettings?.attributeImages]);

  const normalizedAttributeColors = React.useMemo(() => {
    if (!isRecord(variantSettings?.attributeColors)) {
      return {} as Record<string, Record<string, string>>;
    }

    return Object.entries(variantSettings.attributeColors).reduce<
      Record<string, Record<string, string>>
    >((acc, [key, value]) => {
      const normalizedKey = canonicalizeAttributeKey(key);
      if (!normalizedKey || !isRecord(value)) {
        return acc;
      }

      const valueMap = Object.entries(value).reduce<Record<string, string>>(
        (valueAcc, [option, colorValue]) => {
          const normalizedColor = String(colorValue || '').trim();
          if (
            normalizedColor &&
            (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalizedColor) ||
              /^(?:rgb|rgba|hsl|hsla)\(/i.test(normalizedColor) ||
              /^(?:linear|radial)-gradient\(/i.test(normalizedColor))
          ) {
            valueAcc[String(option)] = normalizedColor;
          }
          return valueAcc;
        },
        {},
      );

      if (Object.keys(valueMap).length > 0) {
        acc[normalizedKey] = valueMap;
      }

      return acc;
    }, {});
  }, [variantSettings?.attributeColors]);

  const variantOptionImages = React.useMemo(() => {
    return variants.reduce<Record<string, Record<string, string>>>((acc, variant) => {
      const attributes = getVariantAttributes(variant);
      const variantMetadata = parseVariantMetadata(variant.metadata);
      const primaryVariantImage =
        buildStorefrontImageCandidates(
          variantMetadata.image,
          variant.image,
          parseVariantImages(variant.images),
        )[0] || '';

      if (!primaryVariantImage) {
        return acc;
      }

      Object.entries(attributes).forEach(([key, value]) => {
        const normalizedKey = canonicalizeAttributeKey(key);
        if (!normalizedKey || !value) {
          return;
        }

        if (!acc[normalizedKey]) {
          acc[normalizedKey] = {};
        }

        if (!acc[normalizedKey][value]) {
          acc[normalizedKey][value] = primaryVariantImage;
        }

        const normalizedVal = normalizeOptionKey(value);
        if (normalizedVal && !acc[normalizedKey][normalizedVal]) {
          acc[normalizedKey][normalizedVal] = primaryVariantImage;
        }
      });

      return acc;
    }, {});
  }, [variants]);

  const attributeKeys = React.useMemo(() => {
    const keys = new Set<string>();
    variants.forEach((variant) => {
      Object.keys(getVariantAttributes(variant)).forEach((key) => {
        const normalizedKey = canonicalizeAttributeKey(key);
        if (normalizedKey) {
          keys.add(normalizedKey);
        }
      });
    });
    return Array.from(keys);
  }, [variants]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setSelectedTextColor(resolveReadableSelectedTextColor());
    });

    return () => window.cancelAnimationFrame(frame);
  }, [attributeKeys.length, variants.length]);

  const getOptionsForKey = (key: string) => {
    const seenNormalized = new Set<string>();
    const options: string[] = [];

    variants.forEach((variant) => {
      const option = getVariantAttributes(variant)[key];
      if (typeof option === 'string' && option.trim().length > 0) {
        const trimmed = option.trim();
        const normalized = normalizeOptionKey(trimmed);
        if (!seenNormalized.has(normalized)) {
          seenNormalized.add(normalized);
          options.push(trimmed);
        }
      }
    });

    return options;
  };

  const getOptionImage = (key: string, option: string) => {
    const configuredImage = getOptionMatch(normalizedAttributeImages[key], option);
    if (configuredImage) {
      return configuredImage;
    }

    return getOptionMatch(variantOptionImages[key], option) || '';
  };

  const getOptionColor = (key: string, option: string) => {
    const configuredColor = getOptionMatch(normalizedAttributeColors[key], option);
    if (configuredColor) {
      return configuredColor;
    }

    return resolveColorValue(option);
  };

  const handleSelect = (key: string, value: string) => {
    onChange({
      ...selectedAttributes,
      [key]: value,
    });
  };

  if (variants.length === 0) return null;

  const rootClassName = isInlineCompact ? 'space-y-2.5' : isCompact ? 'space-y-3.5' : 'space-y-6';
  const groupMarginClassName = isInlineCompact ? 'mb-0' : isCompact ? 'mb-2' : 'mb-3';
  const selectedValueClassName = isInlineCompact ? 'hidden' : isCompact ? 'text-[11px] font-bold' : '';

  return (
    <div className={rootClassName}>
      {attributeKeys.map((key) => {
        const options = getOptionsForKey(key);
        const isColor = key.toLowerCase() === 'color';
        const displayKey = getVariantAttributeLabel(key, prefersArabicCopy);
        const requestedDisplayStyle = normalizeVariantDisplayStyle(
          normalizedStyles[key],
          isColor,
        );
        const optionImages = options.reduce<Record<string, string>>((acc, option) => {
          acc[option] = getOptionImage(key, option);
          return acc;
        }, {});
        const hasAnyOptionImages = Object.values(optionImages).some(Boolean);
        const displayStyle =
          requestedDisplayStyle === 'thumbnails' && !hasAnyOptionImages
            ? isColor
              ? 'circles'
              : 'buttons'
            : requestedDisplayStyle;
        const inlineCompactOptionGridClass =
          options.length <= 2
            ? 'grid-cols-2'
            : options.length === 3
              ? 'grid-cols-3'
              : options.length === 4
                ? 'grid-cols-4'
                : options.length === 5
                  ? 'grid-cols-5'
                  : options.length === 6
                    ? 'grid-cols-3 sm:grid-cols-6'
                    : 'grid-cols-4 sm:grid-cols-6';

        const isNumericOrShortButtonOption = options.every((opt) => opt.trim().length <= 4);

        const getThumbnailContainerClass = () => {
          if (isInlineCompact) {
            return options.length <= 3
              ? 'grid grid-cols-3 max-w-[340px] gap-2'
              : 'flex gap-2 overflow-x-auto pb-1 scrollbar-none';
          }
          if (options.length === 1) return 'flex max-w-[120px]';
          if (options.length === 2) return 'grid grid-cols-2 max-w-[220px] gap-2';
          if (options.length === 3) return 'grid grid-cols-3 max-w-[340px] gap-2';
          if (options.length === 4) return 'grid grid-cols-2 min-[380px]:grid-cols-4 max-w-sm gap-2';
          if (options.length === 6) return 'grid grid-cols-3 sm:grid-cols-6 max-w-md gap-2';
          return 'grid grid-cols-3 min-[440px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2';
        };

        const getButtonContainerClass = () => {
          if (isInlineCompact) {
            return `grid w-full ${inlineCompactOptionGridClass} max-w-[360px] gap-1.5 sm:gap-2`;
          }
          if (isNumericOrShortButtonOption) {
            if (options.length <= 2) return 'grid grid-cols-2 max-w-xs gap-2';
            if (options.length === 3) return 'grid grid-cols-3 max-w-sm gap-2';
            if (options.length === 4) return 'grid grid-cols-4 max-w-md gap-2';
            if (options.length === 5) return 'grid grid-cols-5 max-w-[360px] gap-2';
            if (options.length === 6) return 'grid grid-cols-3 min-[380px]:grid-cols-6 max-w-md gap-2';
            return 'grid grid-cols-4 min-[380px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2';
          }
          return isCompact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2';
        };

        return (
          <div
            key={key}
            className={
              isInlineCompact && displayStyle !== 'thumbnails'
                ? 'flex w-full flex-col gap-y-1.5'
                : ''
            }
          >
            <label
              className={`block ${
                isInlineCompact
                  ? 'text-[10px] tracking-[0.12em]'
                  : isCompact
                    ? 'text-[9px] tracking-[0.16em]'
                    : 'text-[10px] tracking-widest'
              } font-black uppercase ${groupMarginClassName} ${
                isZenOrganic
                  ? 'text-[#1a3328]'
                  : isKhemetLuxeElessi && !isInlineCompact
                    ? 'text-[#7f665b]'
                    : 'text-foreground'
              } ${isInlineCompact ? 'w-full text-right' : ''}`}
            >
              {displayKey}:{' '}
              <span
                className={`${
                  isZenOrganic
                    ? 'text-[#1a3328]/80 font-bold ms-1'
                    : selectedAttributes[key]
                      ? 'text-primary font-bold ms-1'
                      : 'text-muted-foreground ms-1'
                } ${selectedValueClassName}`}
              >
                {selectedAttributes[key] || (prefersArabicCopy ? 'اختر' : 'Select')}
              </span>
            </label>

            {displayStyle === 'dropdown' ? (
              <select
                aria-label={
                  prefersArabicCopy ? `اختر ${displayKey}` : `Select ${displayKey}`
                }
                value={options.find((opt) => isOptionSelected(selectedAttributes[key], opt)) || selectedAttributes[key] || ''}
                onChange={(event) => handleSelect(key, event.target.value)}
                className={`w-full rounded-[var(--radius)] border border-border bg-background text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                  isInlineCompact
                    ? 'px-3 py-2 text-[11px]'
                    : isCompact
                      ? 'px-3 py-2.5 text-xs'
                      : 'px-4 py-3 text-sm'
                }`}
              >
                <option value="" disabled>
                  {prefersArabicCopy ? `اختر ${displayKey}` : `Select ${displayKey}`}
                </option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : displayStyle === 'radio' ? (
              isKhemetLuxeElessi && !isInlineCompact ? (
                <div
                  dir={prefersArabicCopy ? 'rtl' : 'ltr'}
                  className="flex w-full flex-wrap gap-2.5"
                >
                  {options.map((option) => {
                    const isSelected = isOptionSelected(selectedAttributes[key], option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(key, option)}
                        aria-label={
                          prefersArabicCopy
                            ? `اختر ${displayKey} ${option}`
                            : `Select ${displayKey} ${option}`
                        }
                        className={`min-w-[4.8rem] rounded-full border px-4 py-2.5 text-sm font-black transition-all duration-200 ${
                          isSelected
                            ? 'border-[#1f4737] bg-[#1f4737] text-white shadow-[0_12px_28px_-18px_rgba(31,71,55,0.55)]'
                            : 'border-[#e0d2c5] bg-white text-[#2d211e] hover:border-[#b79d8e] hover:bg-[#fffaf6]'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className={`grid ${
                    isInlineCompact ? 'w-full justify-items-end gap-1' : isCompact ? 'gap-1.5' : 'gap-2'
                  }`}
                >
                  {options.map((option) => {
                    const isSelected = isOptionSelected(selectedAttributes[key], option);
                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center rounded-[var(--radius)] border transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-background hover:border-primary/40'
                        } ${
                          isInlineCompact
                            ? 'gap-2 px-2.5 py-2'
                            : isCompact
                              ? 'gap-2.5 px-3 py-2.5'
                              : 'gap-3 px-4 py-3'
                        }`}
                        style={
                          isSelected && selectedTextColor && !isZenOrganic
                            ? { color: selectedTextColor }
                            : undefined
                        }
                      >
                        <input
                          type="radio"
                          name={`variant-${key}`}
                          value={option}
                          checked={isSelected}
                          onChange={() => handleSelect(key, option)}
                          aria-label={
                            prefersArabicCopy
                              ? `اختر ${displayKey} ${option}`
                              : `Select ${displayKey} ${option}`
                          }
                          className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} border-border text-primary focus:ring-primary`}
                        />
                        <span
                          className={
                            isInlineCompact
                              ? 'text-[11px] font-semibold'
                              : isCompact
                                ? 'text-xs font-semibold'
                                : 'text-sm font-medium'
                          }
                        >
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )
            ) : (
              <div
                className={
                  displayStyle === 'thumbnails'
                    ? getThumbnailContainerClass()
                    : displayStyle === 'buttons'
                      ? getButtonContainerClass()
                      : `flex flex-wrap ${
                          isInlineCompact
                            ? 'w-full justify-end gap-1.5'
                            : isCompact
                              ? 'gap-1.5'
                              : 'gap-2'
                        }`
                }
                style={
                  isInlineCompact && displayStyle !== 'buttons' && displayStyle !== 'thumbnails'
                    ? { direction: 'ltr' }
                    : undefined
                }
              >
                {options.map((option) => {
                  const isSelected = isOptionSelected(selectedAttributes[key], option);
                  const thumbnailImage =
                    displayStyle === 'thumbnails' ? optionImages[option] || '' : '';
                  const resolvedColor = isColor ? getOptionColor(key, option) : null;
                  const shouldShowColorFallbackLabel = isColor && !resolvedColor;

                  if (displayStyle === 'thumbnails') {
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(key, option)}
                        className={
                          isKhemetLuxeElessi && !isInlineCompact
                            ? `group relative flex w-full flex-col overflow-hidden rounded-xl border-2 transition-all duration-200 p-0 cursor-pointer ${
                                isSelected
                                  ? 'border-[#1f4737] shadow-md ring-2 ring-[#1f4737]/25 scale-[1.02]'
                                  : 'border-[#e0d2c5] hover:border-[#b79d8e] hover:shadow-xs'
                              }`
                            : `group relative flex w-full flex-col overflow-hidden rounded-xl border-2 transition-all duration-200 p-0 cursor-pointer ${
                                isSelected
                                  ? 'border-primary ring-2 ring-primary/30 shadow-md scale-[1.02]'
                                  : 'border-border/80 hover:border-primary/60 hover:shadow-xs'
                              }`
                        }
                        aria-label={
                          prefersArabicCopy
                            ? `اختر ${displayKey} ${option}`
                            : `Select ${displayKey} ${option}`
                        }
                      >
                        <div className="relative w-full aspect-square sm:aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                          {thumbnailImage ? (
                            <img
                              src={thumbnailImage}
                              alt={`${displayKey} ${option}`}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center p-1 text-center text-xs font-bold text-muted-foreground">
                              {option}
                            </div>
                          )}

                          {isSelected ? (
                            <span
                              className={`absolute top-1 end-1 z-20 flex items-center justify-center rounded-full text-white shadow-md animate-in zoom-in-75 duration-150 ${
                                isKhemetLuxeElessi
                                  ? 'bg-[#1f4737]'
                                  : 'bg-primary'
                              } ${
                                isInlineCompact
                                  ? 'h-3.5 w-3.5 text-[8px]'
                                  : 'h-4 w-4 sm:h-5 sm:w-5 text-[9px] sm:text-[10px]'
                              }`}
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          ) : null}

                          <div
                            className={`absolute inset-x-0 bottom-0 z-10 pt-4 pb-1 px-1 text-center transition-colors ${
                              isSelected
                                ? isKhemetLuxeElessi
                                  ? 'bg-gradient-to-t from-[#1f4737]/95 via-[#1f4737]/75 to-transparent'
                                  : 'bg-gradient-to-t from-primary/95 via-primary/75 to-transparent'
                                : 'bg-gradient-to-t from-black/85 via-black/45 to-transparent'
                            }`}
                          >
                            <span
                              className={`block w-full text-center leading-tight truncate text-white ${
                                isInlineCompact
                                  ? 'text-[9.5px]'
                                  : isCompact
                                    ? 'text-[10.5px]'
                                    : 'text-[11px] sm:text-xs'
                              } font-bold drop-shadow-xs`}
                              title={option}
                            >
                              {option}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  }

                  if (displayStyle === 'circles') {
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(key, option)}
                        className={
                          isKhemetLuxeElessi && !isInlineCompact
                            ? `relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2.5px] font-bold transition-all duration-200 ${
                                isSelected
                                  ? 'border-[#1f4737] shadow-[0_0_0_3px_rgba(31,71,55,0.08)]'
                                  : 'border-[#ead8ca] hover:border-[#b79d8e]'
                              } ${shouldShowColorFallbackLabel ? 'bg-[#f5efe8] text-[#2d211e]' : ''}`
                            : `relative flex items-center justify-center overflow-hidden rounded-full border-2 font-bold transition-all duration-200 ${
                                isSelected
                                  ? 'border-ring ring-2 ring-ring ring-offset-2 ring-offset-background scale-110'
                                  : 'border-white/10 hover:border-primary/50 hover:scale-105'
                              } ${shouldShowColorFallbackLabel ? 'bg-muted text-foreground' : ''} ${
                                isInlineCompact
                                  ? 'h-10 w-10 text-[9px]'
                                  : isCompact
                                    ? 'h-8 w-8 text-[9px]'
                                    : 'h-10 w-10 text-[10px]'
                              }`
                        }
                        style={
                          isColor
                            ? {
                                background: resolvedColor || undefined,
                              }
                            : undefined
                        }
                        aria-label={
                          prefersArabicCopy
                            ? `اختر ${displayKey} ${option}`
                            : `Select ${displayKey} ${option}`
                        }
                        title={option}
                      >
                        {!isColor || shouldShowColorFallbackLabel ? (
                          <span
                            className={
                              shouldShowColorFallbackLabel
                                ? 'text-[9px] text-foreground'
                                : 'text-foreground'
                            }
                          >
                            {shouldShowColorFallbackLabel
                              ? getCircleFallbackLabel(option)
                              : option.slice(0, 2).toUpperCase()}
                          </span>
                        ) : null}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleSelect(key, option)}
                        className={
                          isZenOrganic
                            ? `px-6 py-2 text-[13px] font-bold rounded-full transition-all duration-300 border ${
                                isSelected
                                  ? 'bg-[#1a3328] border-[#1a3328] text-white'
                                  : 'bg-transparent border-[#e9ebe5] text-[#1a3328]/40 hover:border-[#1a3328]/30'
                              }`
                          : `rounded-xl border transition-all duration-200 flex items-center justify-center ${
                              isInlineCompact
                                ? 'min-h-[2.4rem] w-full px-1 py-1.5 text-[11px] font-black'
                                : isCompact
                                  ? 'min-h-[2.5rem] px-2.5 py-1.5 text-xs font-bold'
                                  : 'min-h-[2.75rem] px-3.5 py-2 text-sm font-bold'
                            } ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                : 'bg-background text-foreground border-border/80 hover:border-primary/50 hover:bg-muted/30'
                            }`
                      }
                      style={
                        isSelected && selectedTextColor && !isZenOrganic
                          ? { color: selectedTextColor }
                          : undefined
                      }
                      aria-label={
                        prefersArabicCopy
                          ? `اختر ${displayKey} ${option}`
                          : `Select ${displayKey} ${option}`
                      }
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

VariantSelector.displayName = 'VariantSelector';

export default VariantSelector;
