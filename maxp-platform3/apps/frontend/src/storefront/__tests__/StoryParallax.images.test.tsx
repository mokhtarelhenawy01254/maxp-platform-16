// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StoryParallax from '../sections/StoryParallax';

const googleStoryImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA_Jk0j_story';

afterEach(() => {
  cleanup();
});

describe('StoryParallax storefront imagery', () => {
  it('lazy-loads split editorial images through the storefront proxy', () => {
    render(
      <BrowserRouter>
        <StoryParallax
          section={{ variant: 'split-editorial' }}
          settings={{
            title: 'Craft story',
            badge: 'Atelier',
            content: 'A quieter image-led story block.',
            image: googleStoryImage,
            imageAlt: 'Workshop craft',
          }}
        />
      </BrowserRouter>,
    );

    const image = screen.getByRole('img', { name: 'Workshop craft' });

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('/api/proxy-image?url=https%3A%2F%2Flh3.googleusercontent.com'),
    );
    expect(image).toHaveAttribute('srcset', expect.stringContaining('&w=360&'));
    expect(image).toHaveAttribute(
      'sizes',
      '(min-width: 768px) 48vw, calc(100vw - 4rem)',
    );
  });

  it('uses an optimized proxy URL for standard background stories', () => {
    const { container } = render(
      <BrowserRouter>
        <StoryParallax
          section={{ variant: 'standard' }}
          settings={{
            title: 'Craft story',
            image: googleStoryImage,
          }}
        />
      </BrowserRouter>,
    );

    const background = container.querySelector('[data-storefront-story-background]');

    expect(background?.getAttribute('style')).toContain(
      '/api/proxy-image?url=https%3A%2F%2Flh3.googleusercontent.com',
    );
  });
});
