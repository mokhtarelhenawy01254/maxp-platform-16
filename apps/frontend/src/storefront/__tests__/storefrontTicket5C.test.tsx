// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Element Primitives
import HeadingElement from '../sections/elements/HeadingElement';
import TextElement from '../sections/elements/TextElement';
import ImageElement from '../sections/elements/ImageElement';
import ButtonElement from '../sections/elements/ButtonElement';
import IconElement from '../sections/elements/IconElement';
import DividerElement from '../sections/elements/DividerElement';
import SpacerElement from '../sections/elements/SpacerElement';
import VideoElement from '../sections/elements/VideoElement';

// Studio Elements Panel
import { StudioElementsPanel } from '../studio/StudioElementsPanel';

// Manifest & Registry
import {
  STOREFRONT_SECTION_MANIFEST,
  isStorefrontSectionKnown,
  getStorefrontSectionManifest,
  isStorefrontSectionAllowedOnPage,
} from '../sections/manifest';
import { ComponentRegistry } from '../engine/ComponentRegistry';
import { TreeRenderer } from '../engine/tree/TreeRenderer';

describe('Storefront Ticket 5C — Independent Element Primitives', () => {
  // Test 1: HeadingElement
  describe('1. HeadingElement', () => {
    it('renders with custom text, level, align, and color', () => {
      const { container } = render(
        <HeadingElement
          settings={{
            text: 'أفضل العروض الحصرية',
            level: 'h3',
            align: 'center',
            color: 'accent',
          }}
        />,
      );

      const heading = container.querySelector('h3');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('أفضل العروض الحصرية');
      expect(heading?.getAttribute('data-element')).toBe('heading');
      expect(heading?.getAttribute('data-heading-level')).toBe('h3');
      expect(heading?.getAttribute('data-heading-color')).toBe('accent');
      expect(heading?.className).toContain('text-center');
      expect(heading?.className).toContain('text-[var(--store-accent,#2563eb)]');
      expect(heading?.getAttribute('style')).toContain('var(--store-font-family, inherit)');
    });

    it('supports custom hex colors properly', () => {
      const { container } = render(
        <HeadingElement
          settings={{
            text: 'عنوان باللون الأخضر',
            color: '#10b981',
          }}
        />,
      );
      const heading = container.querySelector('h2');
      expect(heading).toBeTruthy();
      expect(heading?.style.color).toBe('rgb(16, 185, 129)');
    });

    it('renders safely with empty settings and defaults to h2', () => {
      const { container } = render(<HeadingElement settings={{}} />);
      const heading = container.querySelector('h2');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('عنوان رئيسي');
      expect(heading?.getAttribute('data-element')).toBe('heading');
      expect(heading?.getAttribute('data-heading-level')).toBe('h2');
    });
  });

  // Test 2: TextElement
  describe('2. TextElement', () => {
    it('renders content with size and alignment', () => {
      const { container } = render(
        <TextElement
          settings={{
            content: 'فقرة نصية تفصيلية لشرح مميزات المنتج والخدمات المتاحة.',
            size: 'lg',
            align: 'end',
          }}
        />,
      );

      const textEl = container.querySelector('[data-element="text"]');
      expect(textEl).toBeTruthy();
      expect(textEl?.textContent).toBe(
        'فقرة نصية تفصيلية لشرح مميزات المنتج والخدمات المتاحة.',
      );
      expect(textEl?.className).toContain('text-end');
      expect(textEl?.getAttribute('data-text-size')).toBe('lg');
      expect(textEl?.getAttribute('style')).toContain('var(--store-font-family, inherit)');
    });

    it('handles empty content safely without crashing', () => {
      const { container } = render(<TextElement settings={{}} />);
      const textEl = container.querySelector('[data-element="text"]');
      expect(textEl).toBeTruthy();
    });
  });

  // Test 3: ImageElement
  describe('3. ImageElement', () => {
    it('renders an image with src, alt, href, and store radius', () => {
      const { container } = render(
        <ImageElement
          settings={{
            src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
            alt: 'ساعة يد عصرية',
            href: '/products/watch',
            radius: 'store',
          }}
        />,
      );

      const link = container.querySelector('a[data-element="image"]');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('/products/watch');
      expect(link?.getAttribute('style')).toContain('var(--store-radius, 8px)');

      const img = link?.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe(
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      );
      expect(img?.getAttribute('alt')).toBe('ساعة يد عصرية');
    });

    it('renders clean placeholder when src is missing', () => {
      const { container } = render(<ImageElement settings={{}} />);
      const placeholder = container.querySelector(
        '[data-storefront-element="image-placeholder"]',
      );
      expect(placeholder).toBeTruthy();
      expect(placeholder?.textContent).toContain('اختر صورة لعرضها');
    });
  });

  // Test 4: ButtonElement
  describe('4. ButtonElement', () => {
    it('renders button with primary variant, custom label, and link', () => {
      const { container } = render(
        <ButtonElement
          settings={{
            label: 'تسوق الآن',
            href: '/collections/summer',
            variant: 'primary',
            size: 'lg',
          }}
        />,
      );

      const wrapper = container.querySelector('[data-element="button"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.getAttribute('data-button-variant')).toBe('primary');
      expect(wrapper?.getAttribute('data-button-size')).toBe('lg');

      const link = wrapper?.querySelector('a');
      expect(link?.textContent).toBe('تسوق الآن');
      expect(link?.getAttribute('href')).toBe('/collections/summer');
      expect(link?.className).toContain('bg-[var(--store-accent,#2563eb)]');
      expect(link?.getAttribute('style')).toContain('var(--store-radius, 8px)');
    });

    it('renders outline and ghost variants properly', () => {
      const { container: outlineContainer } = render(
        <ButtonElement settings={{ label: 'تواصل معنا', variant: 'outline' }} />,
      );
      const outlineLink = outlineContainer.querySelector('a');
      expect(outlineLink?.className).toContain('border-[var(--store-accent,#2563eb)]');
      expect(outlineLink?.className).toContain('text-[var(--store-accent,#2563eb)]');

      const { container: ghostContainer } = render(
        <ButtonElement settings={{ label: 'تخطي', variant: 'ghost' }} />,
      );
      const ghostLink = ghostContainer.querySelector('a');
      expect(ghostLink?.className).toContain('text-[var(--store-accent,#2563eb)]');
    });

    it('renders safely with missing settings', () => {
      const { container } = render(<ButtonElement settings={{}} />);
      const wrapper = container.querySelector('[data-element="button"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.querySelector('a')?.textContent).toBe('زر الإجراء');
    });
  });

  // Test 5: IconElement
  describe('5. IconElement', () => {
    it('renders registered icons by name (e.g. check, shield, truck)', () => {
      const { container: checkContainer } = render(
        <IconElement settings={{ name: 'check', size: 'lg', color: 'accent' }} />,
      );
      const checkEl = checkContainer.querySelector('[data-element="icon"]');
      expect(checkEl).toBeTruthy();
      expect(checkEl?.getAttribute('data-icon-name')).toBe('check');
      expect(checkEl?.getAttribute('data-icon-color')).toBe('accent');

      const svg = checkEl?.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('class')).toContain('text-[var(--store-accent,currentColor)]');
    });

    it('falls back gracefully to SparklesIcon for unknown icon names', () => {
      const { container } = render(
        <IconElement settings={{ name: 'non-existent-icon-xyz' }} />,
      );
      const iconEl = container.querySelector('[data-element="icon"]');
      expect(iconEl).toBeTruthy();
      expect(iconEl?.querySelector('svg')).toBeTruthy();
    });
  });

  // Test 6: DividerElement
  describe('6. DividerElement', () => {
    it('renders hr divider with thickness, color, and width', () => {
      const { container } = render(
        <DividerElement
          settings={{
            thickness: '2px',
            color: 'accent',
            width: '1/2',
            align: 'center',
          }}
        />,
      );

      const wrapper = container.querySelector('[data-element="divider"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.getAttribute('data-divider-thickness')).toBe('2px');
      expect(wrapper?.getAttribute('data-divider-color')).toBe('accent');

      const hr = wrapper?.querySelector('hr');
      expect(hr).toBeTruthy();
      expect(hr?.style.height).toBe('2px');
      expect(hr?.style.width).toBe('50%');
      expect(hr?.className).toContain('bg-[var(--store-accent,#2563eb)]');
    });

    it('renders safely with default thickness and width', () => {
      const { container } = render(<DividerElement settings={{}} />);
      const hr = container.querySelector('hr');
      expect(hr).toBeTruthy();
      expect(hr?.style.height).toBe('1px');
      expect(hr?.style.width).toBe('100%');
    });
  });

  // Test 7: SpacerElement
  describe('7. SpacerElement', () => {
    it('resolves density height to CSS variable --store-density-gap', () => {
      const { container } = render(<SpacerElement settings={{ height: 'density' }} />);
      const spacer = container.querySelector('[data-element="spacer"]');
      expect(spacer).toBeTruthy();
      expect(spacer?.getAttribute('data-spacer-height')).toBe('density');
      expect(spacer?.className).toContain('h-[var(--store-density-gap,1.5rem)]');
    });

    it('resolves preset and numeric heights correctly', () => {
      const { container: smContainer } = render(
        <SpacerElement settings={{ height: 'sm' }} />,
      );
      expect(
        (smContainer.querySelector('[data-element="spacer"]') as HTMLElement).style
          .height,
      ).toBe('12px');

      const { container: numContainer } = render(
        <SpacerElement settings={{ height: 40 }} />,
      );
      expect(
        (numContainer.querySelector('[data-element="spacer"]') as HTMLElement).style
          .height,
      ).toBe('40px');
    });
  });

  // Test 8: VideoElement
  describe('8. VideoElement', () => {
    it('renders YouTube video iframe with embed URL', () => {
      const { container } = render(
        <VideoElement
          settings={{
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ratio: '16:9',
          }}
        />,
      );

      const wrapper = container.querySelector('[data-element="video"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('aspect-[16/9]');

      const iframe = wrapper?.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute('src')).toContain(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      );
    });

    it('renders direct video player when given mp4 url', () => {
      const { container } = render(
        <VideoElement
          settings={{
            url: 'https://example.com/demo.mp4',
            poster: 'https://example.com/poster.jpg',
            controls: true,
          }}
        />,
      );

      const video = container.querySelector('video');
      expect(video).toBeTruthy();
      expect(video?.getAttribute('src')).toBe('https://example.com/demo.mp4');
      expect(video?.getAttribute('poster')).toBe('https://example.com/poster.jpg');
    });

    it('renders placeholder when url is missing', () => {
      const { container } = render(<VideoElement settings={{}} />);
      const wrapper = container.querySelector('[data-element="video"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.textContent).toContain('أدخل رابط فيديو');
    });
  });

  // Test 9: Manifest and ComponentRegistry Registration
  describe('9. Manifest and ComponentRegistry Verification', () => {
    const elementTypes = [
      'heading',
      'text',
      'image',
      'button',
      'icon',
      'divider',
      'spacer',
      'video',
    ];

    it.each(elementTypes)('has "%s" defined in STOREFRONT_SECTION_MANIFEST', (type) => {
      expect(isStorefrontSectionKnown(type)).toBe(true);
      const manifest = getStorefrontSectionManifest(type);
      expect(manifest).toBeDefined();
      expect(manifest?.component).toBe(type);
      expect(manifest?.label).toBeTruthy();
      expect(Array.isArray(manifest?.fields)).toBe(true);
      // Empty pages array = available on all pages
      expect(manifest?.pages).toEqual([]);
      expect(isStorefrontSectionAllowedOnPage(type, 'home')).toBe(true);
      expect(isStorefrontSectionAllowedOnPage(type, 'shop')).toBe(true);
      expect(isStorefrontSectionAllowedOnPage(type, 'pdp')).toBe(true);
    });

    it.each(elementTypes)('has "%s" mapped in ComponentRegistry', (type) => {
      expect(ComponentRegistry[type]).toBeDefined();
    });
  });

  // Test 10: StudioElementsPanel Quick Elements
  describe('10. StudioElementsPanel Quick Elements', () => {
    it('renders all 8 primitive elements with true types in StudioElementsPanel', () => {
      const { container } = render(
        <StudioElementsPanel
          onAddSection={() => {}}
          onOpenFullCatalog={() => {}}
          onClose={() => {}}
        />,
      );

      const draggables = Array.from(
        container.querySelectorAll('[data-studio-draggable="true"]'),
      );
      const types = draggables.map((el) => el.getAttribute('data-section-type'));

      // 8 element primitives must be present
      expect(types).toContain('heading');
      expect(types).toContain('text');
      expect(types).toContain('image');
      expect(types).toContain('button');
      expect(types).toContain('icon');
      expect(types).toContain('divider');
      expect(types).toContain('spacer');
      expect(types).toContain('video');

      // Preserved containers & banner
      expect(types).toContain('container');
      expect(types).toContain('hero-banner');

      // Replaced old aliases
      expect(types.filter((t) => t === 'heading').length).toBe(1);
    });
  });

  // Test 11: Backward Compatibility
  describe('11. Backward Compatibility', () => {
    it('preserves existing section types in manifest and registry', () => {
      const legacyTypes = [
        'hero-banner',
        'promo-strip',
        'product-grid',
        'featured-products',
        'newsletter',
        'info-content',
        'richtext',
      ];

      for (const type of legacyTypes) {
        expect(isStorefrontSectionKnown(type)).toBe(true);
        expect(ComponentRegistry[type]).toBeDefined();
      }
    });
  });

  // Test 12: TreeRenderer Container Integration
  describe('12. TreeRenderer Container Integration', () => {
    it('renders element primitives inside a row container correctly', () => {
      const nodes = [
        {
          key: 'row-container',
          type: 'container',
          settings: {
            direction: 'row',
            columns: 3,
            gap: 16,
          },
          children: [
            {
              key: 'heading-leaf',
              type: 'heading',
              settings: { text: 'عنوان داخل حاوية' },
            },
            {
              key: 'button-leaf',
              type: 'button',
              settings: { label: 'زر داخل حاوية' },
            },
            {
              key: 'divider-leaf',
              type: 'divider',
              settings: { width: 'full' },
            },
          ],
        },
      ];

      const { container } = render(
        <TreeRenderer
          nodes={nodes as any}
          renderLeafSection={(node) => {
            const sectionNode = node as any;
            if (sectionNode.type === 'heading') {
              return <HeadingElement key={sectionNode.key} settings={sectionNode.settings} />;
            }
            if (sectionNode.type === 'button') {
              return <ButtonElement key={sectionNode.key} settings={sectionNode.settings} />;
            }
            if (sectionNode.type === 'divider') {
              return <DividerElement key={sectionNode.key} settings={sectionNode.settings} />;
            }
            return null;
          }}
        />,
      );

      const containerEl = container.querySelector('[data-storefront-container="true"]');
      expect(containerEl).toBeTruthy();
      expect(containerEl?.getAttribute('data-direction')).toBe('row');

      expect(container.querySelector('[data-element="heading"]')?.textContent).toBe(
        'عنوان داخل حاوية',
      );
      expect(container.querySelector('[data-element="button"]')?.textContent).toBe(
        'زر داخل حاوية',
      );
      expect(container.querySelector('[data-element="divider"]')).toBeTruthy();
    });
  });
});
