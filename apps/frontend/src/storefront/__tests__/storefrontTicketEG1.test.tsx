// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Egypt Integrations Elements
import WhatsAppCtaElement, {
  cleanWhatsAppPhone,
  buildWhatsAppUrl,
} from '../sections/elements/WhatsAppCtaElement';
import PaymentMethodsElement, {
  parsePaymentMethods,
} from '../sections/elements/PaymentMethodsElement';
import ShippingPartnersElement, {
  parseShippingPartners,
} from '../sections/elements/ShippingPartnersElement';
import CodBadgeElement from '../sections/elements/CodBadgeElement';

// Manifest & Registry
import {
  STOREFRONT_SECTION_MANIFEST,
  isStorefrontSectionKnown,
  isStorefrontSectionAllowedOnPage,
} from '../sections/manifest';
import { ComponentRegistry } from '../engine/ComponentRegistry';

describe('Storefront Ticket EG-1 — Egypt Integrations Elements', () => {
  // Test 1: cleanWhatsAppPhone utility
  describe('1. WhatsApp Phone Sanitization & URL Builder', () => {
    it('cleans international phone with plus sign and spaces', () => {
      expect(cleanWhatsAppPhone('+20 100 123 4567')).toBe('201001234567');
      expect(cleanWhatsAppPhone('+20 (10) 9876-5432')).toBe('201098765432');
    });

    it('converts Egyptian local 11-digit numbers (010, 011, 012, 015) to international prefix 20', () => {
      expect(cleanWhatsAppPhone('01001234567')).toBe('201001234567');
      expect(cleanWhatsAppPhone('01112223334')).toBe('201112223334');
      expect(cleanWhatsAppPhone('01234567890')).toBe('201234567890');
      expect(cleanWhatsAppPhone('01599887766')).toBe('201599887766');
    });

    it('handles 00 international prefix cleanly', () => {
      expect(cleanWhatsAppPhone('00201001234567')).toBe('201001234567');
    });

    it('returns empty string on null, undefined, or empty values', () => {
      expect(cleanWhatsAppPhone('')).toBe('');
      expect(cleanWhatsAppPhone(undefined)).toBe('');
      expect(cleanWhatsAppPhone(null as any)).toBe('');
    });

    it('builds wa.me URL with clean digits and properly encoded Arabic message', () => {
      const url = buildWhatsAppUrl('01001234567', 'مرحباً، أود الاستفسار عن كود العرض');
      expect(url).toContain('https://wa.me/201001234567?text=');
      expect(url).toContain(encodeURIComponent('مرحباً، أود الاستفسار عن كود العرض'));
    });
  });

  // Test 2: WhatsAppCtaElement Component
  describe('2. WhatsAppCtaElement Component', () => {
    it('renders with valid target, rel, href, and data attributes', () => {
      const { container } = render(
        <WhatsAppCtaElement
          settings={{
            phone: '+20 100 123 4567',
            message: 'طلب استفسار',
            label: 'تواصل عبر واتساب',
            subtitle: 'رد فوري خلال دقائق',
            variant: 'green',
          }}
        />,
      );

      const wrapper = container.querySelector('[data-storefront-element="whatsapp-cta"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.getAttribute('data-clean-phone')).toBe('201001234567');
      expect(wrapper?.getAttribute('data-whatsapp-variant')).toBe('green');

      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.getAttribute('href')).toContain('https://wa.me/201001234567?text=');
      expect(link?.getAttribute('href')).toContain(encodeURIComponent('طلب استفسار'));

      expect(container.textContent).toContain('تواصل عبر واتساب');
      expect(container.textContent).toContain('رد فوري خلال دقائق');

      // Verify inline SVG exists (no external image assets)
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(container.querySelectorAll('img').length).toBe(0);
    });

    it('supports primary and outline variants and safe defaults when fields are missing', () => {
      const { container: outlineContainer } = render(
        <WhatsAppCtaElement settings={{ variant: 'outline' }} />,
      );
      const outlineLink = outlineContainer.querySelector('a');
      expect(outlineLink?.className).toContain('border-2');

      const { container: emptyContainer } = render(<WhatsAppCtaElement />);
      const defaultLink = emptyContainer.querySelector('a');
      expect(defaultLink).toBeTruthy();
      expect(emptyContainer.textContent).toContain('تواصل عبر واتساب');
    });

    it('respects section prop wrapper if provided', () => {
      const { container } = render(
        <WhatsAppCtaElement
          section={{
            type: 'whatsapp-cta',
            settings: {
              phone: '01099887766',
              label: 'محادثة المبيعات',
            },
          }}
        />,
      );
      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toContain('https://wa.me/201099887766');
      expect(container.textContent).toContain('محادثة المبيعات');
    });
  });

  // Test 3: PaymentMethodsElement Component
  describe('3. PaymentMethodsElement Component', () => {
    it('displays only the selected payment methods', () => {
      const { container } = render(
        <PaymentMethodsElement
          settings={{
            title: 'طرق الدفع المعتمدة',
            methods: ['cod', 'visa', 'instapay'],
            note: 'جميع المدفوعات مشفرة وآمنة',
          }}
        />,
      );

      const wrapper = container.querySelector('[data-storefront-element="payment-methods"]');
      expect(wrapper).toBeTruthy();
      expect(container.textContent).toContain('طرق الدفع المعتمدة');
      expect(container.textContent).toContain('جميع المدفوعات مشفرة وآمنة');

      // COD, Visa, InstaPay should be present
      expect(container.querySelector('[data-payment-method="cod"]')).toBeTruthy();
      expect(container.querySelector('[data-payment-method="visa"]')).toBeTruthy();
      expect(container.querySelector('[data-payment-method="instapay"]')).toBeTruthy();

      // Unselected methods should NOT be present
      expect(container.querySelector('[data-payment-method="mastercard"]')).toBeNull();
      expect(container.querySelector('[data-payment-method="fawry"]')).toBeNull();
      expect(container.querySelector('[data-payment-method="paymob"]')).toBeNull();

      // ZERO external image assets
      expect(container.querySelectorAll('img').length).toBe(0);
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
    });

    it('highlights Cash on Delivery (COD) as a prominent featured option', () => {
      const { container } = render(
        <PaymentMethodsElement settings={{ methods: ['cod', 'mastercard'] }} />,
      );

      const codBadge = container.querySelector('[data-payment-method="cod"]');
      expect(codBadge).toBeTruthy();
      expect(codBadge?.className).toContain('bg-emerald-50');
      expect(codBadge?.textContent).toContain('الدفع عند الاستلام');
    });

    it('parses comma-separated string input cleanly', () => {
      const parsed = parsePaymentMethods('cod, visa, fawry, wallet');
      expect(parsed).toEqual(['cod', 'visa', 'fawry', 'wallet']);

      const defaultParsed = parsePaymentMethods();
      expect(defaultParsed).toContain('cod');
      expect(defaultParsed).toContain('visa');
    });
  });

  // Test 4: ShippingPartnersElement Component
  describe('4. ShippingPartnersElement Component', () => {
    it('displays only selected shipping partners with Arabic names', () => {
      const { container } = render(
        <ShippingPartnersElement
          settings={{
            title: 'شركاء الشحن',
            partners: ['bosta', 'aramex'],
            note: 'الشحن خلال 48 ساعة لمعظم المحافظات',
          }}
        />,
      );

      const wrapper = container.querySelector('[data-storefront-element="shipping-partners"]');
      expect(wrapper).toBeTruthy();
      expect(container.textContent).toContain('شركاء الشحن');
      expect(container.textContent).toContain('الشحن خلال 48 ساعة لمعظم المحافظات');

      // Bosta & Aramex present
      expect(container.querySelector('[data-shipping-partner="bosta"]')).toBeTruthy();
      expect(container.querySelector('[data-shipping-partner="aramex"]')).toBeTruthy();
      expect(container.textContent).toContain('بوسطة Bosta');
      expect(container.textContent).toContain('أرامكس Aramex');

      // Egypt post & Courier not present
      expect(container.querySelector('[data-shipping-partner="egypt-post"]')).toBeNull();
      expect(container.querySelector('[data-shipping-partner="courier"]')).toBeNull();

      // ZERO external image assets
      expect(container.querySelectorAll('img').length).toBe(0);
    });

    it('parses comma-separated string of partners', () => {
      const parsed = parseShippingPartners('bosta, egypt-post');
      expect(parsed).toEqual(['bosta', 'egypt-post']);
    });
  });

  // Test 5: CodBadgeElement Component
  describe('5. CodBadgeElement Component', () => {
    it('renders with default Arabic text and soft style', () => {
      const { container } = render(<CodBadgeElement />);

      const wrapper = container.querySelector('[data-storefront-element="cod-badge"]');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.getAttribute('data-cod-style')).toBe('soft');
      expect(container.textContent).toContain('الدفع عند الاستلام متاح');
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('supports custom text and bold/outline styles', () => {
      const { container: boldContainer } = render(
        <CodBadgeElement
          settings={{
            text: 'متاح الدفع نقداً عند المعاينة',
            style: 'bold',
          }}
        />,
      );

      const boldBadge = boldContainer.querySelector('[data-storefront-element="cod-badge"]');
      expect(boldBadge?.getAttribute('data-cod-style')).toBe('bold');
      expect(boldContainer.textContent).toContain('متاح الدفع نقداً عند المعاينة');
      expect(boldContainer.querySelector('.bg-emerald-600')).toBeTruthy();

      const { container: outlineContainer } = render(
        <CodBadgeElement settings={{ style: 'outline' }} />,
      );
      const outlineBadge = outlineContainer.querySelector('[data-storefront-element="cod-badge"]');
      expect(outlineBadge?.getAttribute('data-cod-style')).toBe('outline');
      expect(outlineContainer.querySelector('.border-2')).toBeTruthy();
    });
  });

  // Test 6: Manifest & ComponentRegistry Integration
  describe('6. Manifest & ComponentRegistry Integration', () => {
    const egyptIntegrationElements = [
      'whatsapp-cta',
      'payment-methods',
      'shipping-partners',
      'cod-badge',
    ];

    it('registers all 4 elements in STOREFRONT_SECTION_MANIFEST with pages: []', () => {
      for (const elementKey of egyptIntegrationElements) {
        expect(isStorefrontSectionKnown(elementKey)).toBe(true);

        const manifestEntry = (STOREFRONT_SECTION_MANIFEST as any)[elementKey];
        expect(manifestEntry).toBeDefined();
        expect(manifestEntry.component).toBe(elementKey);
        expect(manifestEntry.pages).toEqual([]);
        expect(manifestEntry.fields.length).toBeGreaterThan(0);

        // Should be allowed on any storefront page (home, pdp, cart, custom)
        expect(isStorefrontSectionAllowedOnPage(elementKey, 'home')).toBe(true);
        expect(isStorefrontSectionAllowedOnPage(elementKey, 'pdp')).toBe(true);
        expect(isStorefrontSectionAllowedOnPage(elementKey, 'cart')).toBe(true);
      }
    });

    it('registers all 4 elements in ComponentRegistry', () => {
      for (const elementKey of egyptIntegrationElements) {
        expect(ComponentRegistry[elementKey]).toBeDefined();
        expect(typeof ComponentRegistry[elementKey]).toBe('object'); // React.lazy returns object with $$typeof
      }
    });
  });
});
