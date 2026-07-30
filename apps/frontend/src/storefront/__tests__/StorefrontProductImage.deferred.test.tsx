// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import StorefrontProductImage from '../components/StorefrontProductImage';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting = true) {
    this.callback(
      [
        {
          isIntersecting,
        } as IntersectionObserverEntry,
      ],
      this as IntersectionObserver,
    );
  }
}

const originalIntersectionObserver = window.IntersectionObserver;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  MockIntersectionObserver.instances = [];
  window.IntersectionObserver = originalIntersectionObserver;
});

describe('StorefrontProductImage deferred loading', () => {
  it('omits the image source until the element approaches the viewport', () => {
    window.IntersectionObserver =
      MockIntersectionObserver as typeof IntersectionObserver;

    render(
      <StorefrontProductImage
        candidates={['/placeholders/luxury-shoes/hero.png?v=test']}
        alt="Deferred shoe"
        deferUntilVisible
        deferRootMargin="700px 0px"
      />,
    );

    const image = screen.getByRole('img', { name: 'Deferred shoe' });

    expect(image).toHaveAttribute('data-storefront-deferred-image', 'true');
    expect(image).not.toHaveAttribute('src');
    expect(MockIntersectionObserver.instances[0]?.options?.rootMargin).toBe(
      '700px 0px',
    );

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger(true);
    });

    expect(image).toHaveAttribute(
      'src',
      '/placeholders/luxury-shoes/hero.png?v=test',
    );
  });

  it('loads immediately when intersection observer is unavailable', () => {
    window.IntersectionObserver = undefined as typeof IntersectionObserver;

    render(
      <StorefrontProductImage
        candidates={['/placeholders/luxury-shoes/flats.png?v=test']}
        alt="Fallback shoe"
        deferUntilVisible
      />,
    );

    expect(screen.getByRole('img', { name: 'Fallback shoe' })).toHaveAttribute(
      'src',
      '/placeholders/luxury-shoes/flats.png?v=test',
    );
  });
});
