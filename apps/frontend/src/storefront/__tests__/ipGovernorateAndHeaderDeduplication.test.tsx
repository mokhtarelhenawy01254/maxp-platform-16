// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIpGovernorateDetection } from '../hooks/useIpGovernorateDetection';
import { useCheckoutStore } from '../store/useCheckoutStore';
import * as ipGovUtil from '../utils/ipGovernorate';

describe('useIpGovernorateDetection', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useCheckoutStore.getState().resetCheckout();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates checkout store with detected governorate when IP resolves to Alexandria', async () => {
    vi.spyOn(ipGovUtil, 'detectGovernorateByIp').mockResolvedValue({
      governorate: 'Alexandria',
      city: 'Alexandria',
    });

    renderHook(() => useIpGovernorateDetection());

    await waitFor(() => {
      expect(useCheckoutStore.getState().formData.governorate).toBe('Alexandria');
      expect(useCheckoutStore.getState().formData.city).toBe('Alexandria');
    });
  });

  it('does NOT force Cairo when IP detection returns null', async () => {
    vi.spyOn(ipGovUtil, 'detectGovernorateByIp').mockResolvedValue({
      governorate: null,
      city: null,
    });

    renderHook(() => useIpGovernorateDetection());

    // Give microtasks time to run
    await new Promise((r) => setTimeout(r, 50));

    expect(useCheckoutStore.getState().formData.governorate).toBe('');
  });

  it('overwrites legacy Cairo default if the user did not manually choose Cairo and IP says Alexandria', async () => {
    useCheckoutStore.getState().updateFormData({ governorate: 'Cairo' });
    vi.spyOn(ipGovUtil, 'detectGovernorateByIp').mockResolvedValue({
      governorate: 'Alexandria',
      city: 'Alexandria',
    });

    renderHook(() => useIpGovernorateDetection());

    await waitFor(() => {
      expect(useCheckoutStore.getState().formData.governorate).toBe('Alexandria');
    });
  });

  it('overwrites legacy Arabic القاهرة default if the user did not manually choose it and IP says Alexandria', async () => {
    useCheckoutStore.getState().updateFormData({ governorate: 'القاهرة' });
    vi.spyOn(ipGovUtil, 'detectGovernorateByIp').mockResolvedValue({
      governorate: 'Alexandria',
      city: 'Alexandria',
    });

    renderHook(() => useIpGovernorateDetection());

    await waitFor(() => {
      expect(useCheckoutStore.getState().formData.governorate).toBe('Alexandria');
    });
  });

  it('preserves user manual selection if sf-gov-manual-selection flag is present', async () => {
    sessionStorage.setItem('sf-gov-manual-selection', 'true');
    useCheckoutStore.getState().updateFormData({ governorate: 'Cairo' });
    vi.spyOn(ipGovUtil, 'detectGovernorateByIp').mockResolvedValue({
      governorate: 'Alexandria',
      city: 'Alexandria',
    });

    renderHook(() => useIpGovernorateDetection());

    await new Promise((r) => setTimeout(r, 50));

    expect(useCheckoutStore.getState().formData.governorate).toBe('Cairo');
  });
});

