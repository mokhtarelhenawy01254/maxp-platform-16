// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VariantSelector from '../components/VariantSelector';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VariantSelector', () => {
  it('renders variant options from attributeValues when attributes are missing', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-red-m',
              name: 'Red / M',
              attributeValues: { Color: 'Red', Size: 'M' },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
        />
      </StorefrontThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'اختر اللون Red' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر المقاس M' })).toBeInTheDocument();
  });

  it('renders variant options parsed from the variant name when structured attributes are missing', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-rose-gold-xs',
              name: 'Rose Gold / XS',
              type: 'color',
              attributeValues: {},
            } as any,
            {
              id: 'variant-emerald-s',
              name: 'Emerald / S',
              type: 'color',
              attributeValues: {},
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
        />
      </StorefrontThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'اختر اللون Rose Gold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر المقاس XS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر اللون Emerald' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر المقاس S' })).toBeInTheDocument();
  });

  it('keeps the selected option text readable when the theme foreground is too light', async () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          getPropertyValue: (property: string) => {
            if (property === '--primary') return '40 30% 95%';
            if (property === '--primary-foreground') return '42 60% 97%';
            if (property === '--foreground') return '24 20% 14%';
            return '';
          },
        }) as CSSStyleDeclaration,
    );

    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-39',
              name: 'White / 39',
              attributeValues: { Size: '39' },
            } as any,
          ]}
          selectedAttributes={{ Size: '39' }}
          onChange={vi.fn()}
        />
      </StorefrontThemeProvider>,
    );

    const selectedButton = screen.getByRole('button', { name: 'اختر المقاس 39' });

    await waitFor(() => {
      expect(selectedButton.style.color).toBe('rgb(43, 34, 29)');
    });
  });

  it('renders thumbnail options from variant settings using canonicalized attribute keys', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-red',
              name: 'Red',
              attributeValues: { Color: 'Red' },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
          variantSettings={{
            styles: { اللون: 'thumbnails' },
            attributeImages: {
              اللون: {
                Red: '/uploads/products/red-thumb.jpg',
              },
            },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const thumbnail = screen.getByRole('img', { name: 'اللون Red' });
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', expect.stringContaining('/uploads/products/red-thumb.jpg'));
  });

  it('renders a dropdown selector when configured in variant settings', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-m',
              name: 'M',
              attributeValues: { Size: 'M' },
            } as any,
            {
              id: 'variant-l',
              name: 'L',
              attributeValues: { Size: 'L' },
            } as any,
          ]}
          selectedAttributes={{ Size: 'M' }}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Size: 'dropdown' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const dropdown = screen.getByRole('combobox', { name: 'اختر المقاس' });
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'L' })).toBeInTheDocument();
  });

  it('falls back from thumbnails when no configured or variant images exist', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-black',
              name: 'أسود',
              attributeValues: { Color: 'أسود' },
            } as any,
            {
              id: 'variant-white',
              name: 'أبيض',
              attributeValues: { Color: 'أبيض' },
            } as any,
          ]}
          selectedAttributes={{ Color: 'أسود' }}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'thumbnails' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    expect(screen.queryByRole('img', { name: 'اللون أسود' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر اللون أسود' })).toBeInTheDocument();
  });

  it('ignores variant images when circles are requested so color and size swatches still render as circles', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-white-37',
              name: 'White / 37',
              image: '/uploads/products/white-37.jpg',
              attributeValues: { Color: 'White', Size: '37' },
            } as any,
            {
              id: 'variant-black-38',
              name: 'Black / 38',
              image: '/uploads/products/black-38.jpg',
              attributeValues: { Color: 'Black', Size: '38' },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'circles', Size: 'circles' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const whiteColorButton = screen.getByRole('button', { name: 'اختر اللون White' });
    const sizeButton = screen.getByRole('button', { name: 'اختر المقاس 37' });

    expect(whiteColorButton).toHaveStyle({ backgroundColor: 'rgb(255, 255, 255)' });
    expect(whiteColorButton.style.backgroundImage).toBe('');
    expect(sizeButton).toHaveTextContent('37');
    expect(sizeButton.style.backgroundImage).toBe('');
  });

  it('resolves common Arabic color aliases like زيتي into filled color circles', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-olive',
              name: 'زيتي / L',
              attributeValues: { Color: 'زيتي', Size: 'L' },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'circles' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const oliveColorButton = screen.getByRole('button', { name: 'اختر اللون زيتي' });
    expect(oliveColorButton).toHaveStyle({ backgroundColor: 'rgb(107, 142, 35)' });
    expect(oliveColorButton).not.toHaveTextContent('زي');
  });

  it('uses configured admin color swatches before name-based color guesses', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-burgundy',
              name: 'برجاندي / 37',
              attributeValues: { Color: 'برجاندي', Size: '37' },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'circles' },
            attributeColors: {
              اللون: {
                برجاندي: '#22c55e',
              },
            },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const burgundyButton = screen.getByRole('button', { name: 'اختر اللون برجاندي' });
    expect(burgundyButton).toHaveStyle({ backgroundColor: 'rgb(34, 197, 94)' });
  });

  it('treats Arabic plural color attributes as color swatches and shows every color option', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-black',
              name: 'أسود / 38',
              attributeValues: { الالوان: 'أسود', المقاس: '38' },
            } as any,
            {
              id: 'variant-white',
              name: 'أبيض / 39',
              attributeValues: { الألوان: 'أبيض', المقاس: '39' },
            } as any,
            {
              id: 'variant-beige',
              name: 'بيج / 40',
              metadata: {
                attributes: [{ name: 'ألوان', option: 'بيج' }],
              },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
          variantSettings={{
            styles: { الالوان: 'circles' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const blackButton = screen.getByRole('button', { name: 'اختر اللون أسود' });
    const whiteButton = screen.getByRole('button', { name: 'اختر اللون أبيض' });
    const beigeButton = screen.getByRole('button', { name: 'اختر اللون بيج' });

    expect(blackButton).toHaveStyle({ backgroundColor: 'rgb(0, 0, 0)' });
    expect(whiteButton).toHaveStyle({ backgroundColor: 'rgb(255, 255, 255)' });
    expect(beigeButton).toHaveStyle({ backgroundColor: 'rgb(208, 176, 137)' });
  });

  it('shows a readable fallback label for unknown color names instead of rendering an empty circle', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-unknown-color',
              name: 'ضباب الغروب / L',
              attributeValues: { Color: 'ضباب الغروب', Size: 'L' },
            } as any,
          ]}
          selectedAttributes={{}}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'circles' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const fallbackColorButton = screen.getByRole('button', { name: 'اختر اللون ضباب الغروب' });
    expect(fallbackColorButton).toHaveTextContent('ضا');
  });

  it('renders compact button-based size choices for the khemet luxe theme instead of native radio inputs', () => {
    render(
      <StorefrontThemeProvider initialTheme={{ id: 'khemet-luxe-eg' }}>
        <VariantSelector
          variants={[
            {
              id: 'variant-white-37',
              name: 'White / 37',
              attributeValues: { Size: '37' },
            } as any,
            {
              id: 'variant-white-38',
              name: 'White / 38',
              attributeValues: { Size: '38' },
            } as any,
          ]}
          selectedAttributes={{ Size: '37' }}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Size: 'radio' },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const firstSizeButton = screen.getByRole('button', { name: 'اختر المقاس 37' });
    expect(firstSizeButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختر المقاس 38' })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(firstSizeButton.parentElement).toHaveAttribute('dir', 'rtl');
  });

  it('renders a balanced 3-column grid for 6 thumbnail options with a checkmark badge on the selected item', () => {
    const sixVariants = [
      'الأبيض عالي',
      'الأسود عالي',
      'البيج عالي',
      'الأبيض واطي',
      'البيج واطي',
      'الأسود واطي',
    ].map((colorName, idx) => ({
      id: `variant-${idx}`,
      name: `${colorName} / 38`,
      attributeValues: { Color: colorName },
    }));

    const attributeImages = sixVariants.reduce<Record<string, string>>((acc, v) => {
      acc[v.attributeValues.Color] = `/uploads/${v.id}.jpg`;
      return acc;
    }, {});

    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={sixVariants as any}
          selectedAttributes={{ Color: 'الأبيض عالي' }}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'thumbnails' },
            attributeImages: { Color: attributeImages },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const selectedThumbButton = screen.getByRole('button', { name: 'اختر اللون الأبيض عالي' });
    expect(selectedThumbButton).toBeInTheDocument();
    expect(selectedThumbButton).toHaveTextContent('✓');

    const unselectedThumbButton = screen.getByRole('button', { name: 'اختر اللون الأسود عالي' });
    expect(unselectedThumbButton).not.toHaveTextContent('✓');

    const container = selectedThumbButton.parentElement;
    expect(container).toHaveClass('grid');
    expect(container).toHaveClass('grid-cols-3');
    expect(container).toHaveClass('sm:grid-cols-6');
  });

  it('renders numeric size options in an equal 5-column grid without orphaned buttons', () => {
    const sizeVariants = ['37', '38', '39', '40', '41'].map((sz, idx) => ({
      id: `v-${idx}`,
      name: `Shoe / ${sz}`,
      attributeValues: { المقاس: sz },
    }));

    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={sizeVariants as any}
          selectedAttributes={{ المقاس: '37' }}
          onChange={vi.fn()}
        />
      </StorefrontThemeProvider>,
    );

    const button37 = screen.getByRole('button', { name: 'اختر المقاس 37' });
    expect(button37).toBeInTheDocument();

    const container = button37.parentElement;
    expect(container).toHaveClass('grid');
    expect(container).toHaveClass('grid-cols-5');
  });

  it('deduplicates 3 sneaker colors (أبيض, أسود, بيج) with Arabic Alef variations and links each color to its exact image in saved order', () => {
    const sneakerVariants = [
      {
        id: 'sneaker-white-41',
        name: 'أبيض - 41',
        image: '/uploads/products/sneaker-white.jpg',
        attributeValues: { Color: 'أبيض', Size: '41' },
      },
      {
        id: 'sneaker-white-42',
        name: 'ابيض - 42',
        image: '/uploads/products/sneaker-white.jpg',
        attributeValues: { Color: 'ابيض', Size: '42' },
      },
      {
        id: 'sneaker-black-41',
        name: 'اسود - 41',
        image: '/uploads/products/sneaker-black.jpg',
        attributeValues: { Color: 'اسود', Size: '41' },
      },
      {
        id: 'sneaker-beige-41',
        name: 'بيج - 41',
        image: '/uploads/products/sneaker-beige.jpg',
        attributeValues: { Color: 'بيج', Size: '41' },
      },
    ];

    render(
      <StorefrontThemeProvider initialTheme={{ direction: 'rtl' }}>
        <VariantSelector
          variants={sneakerVariants as any}
          selectedAttributes={{ Color: 'أبيض', Size: '41' }}
          onChange={vi.fn()}
          variantSettings={{
            styles: { Color: 'thumbnails' },
            attributeImages: {
              اللون: {
                أبيض: '/uploads/products/sneaker-white.jpg',
                أسود: '/uploads/products/sneaker-black.jpg',
                بيج: '/uploads/products/sneaker-beige.jpg',
              },
            },
          }}
        />
      </StorefrontThemeProvider>,
    );

    const colorButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-label')?.startsWith('اختر اللون '));

    expect(colorButtons).toHaveLength(3);
    expect(colorButtons.map((btn) => btn.getAttribute('aria-label'))).toEqual([
      'اختر اللون أبيض',
      'اختر اللون اسود',
      'اختر اللون بيج',
    ]);

    const whiteImg = screen.getByRole('img', { name: 'اللون أبيض' });
    const blackImg = screen.getByRole('img', { name: 'اللون اسود' });
    const beigeImg = screen.getByRole('img', { name: 'اللون بيج' });

    expect(whiteImg).toHaveAttribute('src', expect.stringContaining('/uploads/products/sneaker-white.jpg'));
    expect(blackImg).toHaveAttribute('src', expect.stringContaining('/uploads/products/sneaker-black.jpg'));
    expect(beigeImg).toHaveAttribute('src', expect.stringContaining('/uploads/products/sneaker-beige.jpg'));
  });
});


