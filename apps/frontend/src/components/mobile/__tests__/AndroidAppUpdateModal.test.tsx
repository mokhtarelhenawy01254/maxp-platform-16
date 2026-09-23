import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../config/environment', () => ({
  isCapacitorNative: jest.fn(() => true),
}));

jest.mock('../../../services/appUpdateService', () => {
  const actual = jest.requireActual('../../../services/appUpdateService');
  return {
    ...actual,
    isAndroidAppEnvironment: jest.fn(() => true),
    checkAppUpdate: jest.fn(),
    shouldShowUpdateModal: jest.fn(),
    openUpdateDownload: jest.fn(),
    exitAndroidApp: jest.fn(),
    snoozeUpdate: jest.fn(),
  };
});

import { AndroidAppUpdateModal } from '../AndroidAppUpdateModal';
import * as appUpdateService from '../../../services/appUpdateService';

describe('AndroidAppUpdateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there is no update', async () => {
    (appUpdateService.checkAppUpdate as jest.Mock).mockResolvedValue({
      hasUpdate: false,
      isMandatory: false,
      currentVersion: '1.0.8',
      currentVersionCode: 8,
      versionInfo: null,
    });
    (appUpdateService.shouldShowUpdateModal as jest.Mock).mockReturnValue(false);

    const { container } = render(<AndroidAppUpdateModal />);

    await waitFor(() => {
      expect(appUpdateService.checkAppUpdate).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders mandatory update modal and enforces update without close button', async () => {
    (appUpdateService.checkAppUpdate as jest.Mock).mockResolvedValue({
      hasUpdate: true,
      isMandatory: true,
      currentVersion: '1.0.6',
      currentVersionCode: 6,
      versionInfo: {
        platform: 'android',
        latestVersion: '1.0.8',
        latestVersionCode: 8,
        forceUpdate: true,
        downloadUrl: 'https://maxp.online/download/maxp.apk',
        releaseNotesAr: 'تحديث أمني وإصلاحات هامة',
      },
    });
    (appUpdateService.shouldShowUpdateModal as jest.Mock).mockReturnValue(true);

    render(<AndroidAppUpdateModal />);

    await waitFor(() => {
      expect(screen.getByText('تحديث إلزامي فوري')).toBeInTheDocument();
    });

    expect(screen.getByText('v1.0.6')).toBeInTheDocument();
    expect(screen.getByText('v1.0.8')).toBeInTheDocument();
    expect(screen.getByText('تحديث أمني وإصلاحات هامة')).toBeInTheDocument();

    // Close button should NOT exist in mandatory mode
    expect(screen.queryByLabelText('إغلاق التنبيه')).toBeNull();

    // Clicking download triggers openUpdateDownload
    const downloadBtn = screen.getByText('تحميل وتثبيت التحديث الآن');
    fireEvent.click(downloadBtn);
    expect(appUpdateService.openUpdateDownload).toHaveBeenCalledWith(
      'https://maxp.online/download/maxp.apk'
    );

    // Clicking exit triggers exitAndroidApp
    const exitBtn = screen.getByText('إغلاق التطبيق لعدم الرغبة في التحديث الآن');
    fireEvent.click(exitBtn);
    expect(appUpdateService.exitAndroidApp).toHaveBeenCalled();
  });

  it('renders optional update modal with snooze option and close button', async () => {
    (appUpdateService.checkAppUpdate as jest.Mock).mockResolvedValue({
      hasUpdate: true,
      isMandatory: false,
      currentVersion: '1.0.7',
      currentVersionCode: 7,
      versionInfo: {
        platform: 'android',
        latestVersion: '1.0.8',
        latestVersionCode: 8,
        forceUpdate: false,
        downloadUrl: 'https://maxp.online/download/maxp.apk',
      },
    });
    (appUpdateService.shouldShowUpdateModal as jest.Mock).mockReturnValue(true);

    render(<AndroidAppUpdateModal />);

    await waitFor(() => {
      expect(screen.getByText('تحديث جديد متوفر')).toBeInTheDocument();
    });

    // Close button exists in optional mode
    const closeBtn = screen.getByLabelText('إغلاق التنبيه');
    expect(closeBtn).toBeInTheDocument();

    const snoozeBtn = screen.getByText('تذكيري لاحقاً (غداً)');
    fireEvent.click(snoozeBtn);
    expect(appUpdateService.snoozeUpdate).toHaveBeenCalledWith('1.0.8');
  });
});
