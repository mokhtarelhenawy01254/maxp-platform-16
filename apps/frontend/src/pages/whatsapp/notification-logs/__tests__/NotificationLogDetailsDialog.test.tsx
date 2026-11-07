/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NotificationLogDetailsDialog } from '../NotificationLogDetailsDialog';
import { extractUrlFromMessage, getMetaErrorInfo, META_ERROR_CODES } from '../metaErrorCodes';
import { LogEntry } from '../types';

describe('metaErrorCodes', () => {
  it('translates code 131042 correctly to Arabic with Meta billing guidance', () => {
    const info = getMetaErrorInfo('131042');
    expect(info.code).toBe('131042');
    expect(info.title).toContain('حساب واتساب عليه مدفوعات معلّقة');
    expect(info.actionText).toBe('فتح في Meta');
    expect(info.actionUrl).toContain('billing_hub');
  });

  it('translates code 131047 (outside 24-hour window)', () => {
    const info = getMetaErrorInfo('131047');
    expect(info.title).toContain('خارج نافذة الـ 24 ساعة');
  });

  it('translates code 132000 (template unapproved or non-existent)', () => {
    const info = getMetaErrorInfo('132000');
    expect(info.title).toContain('قالب غير معتمد أو غير موجود');
  });

  it('translates code 132018 (template parameter count mismatch)', () => {
    const info = getMetaErrorInfo('132018');
    expect(info.title).toContain('خطأ في متغيرات القالب');
  });

  it('handles unknown error code with Arabic fallback', () => {
    const info = getMetaErrorInfo('999999');
    expect(info.title).toBe('كود غير معروف — التفاصيل التقنية تحت');
  });

  it('extracts Meta billing URL from failure reason', () => {
    const msg = 'Payment failed. Settle at https://business.facebook.com/billing_hub/account?id=456 to resume.';
    const url = extractUrlFromMessage(msg);
    expect(url).toBe('https://business.facebook.com/billing_hub/account?id=456');

    const info = getMetaErrorInfo('131042', msg);
    expect(info.actionUrl).toBe('https://business.facebook.com/billing_hub/account?id=456');
  });
});

describe('NotificationLogDetailsDialog', () => {
  const formatDate = (val?: string | null) => (val ? `DATE: ${val}` : '');
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const failedLogWith131042: LogEntry = {
    id: 'log-err-1',
    status: 'FAILED',
    messageType: 'TEMPLATE',
    sessionId: 'sess-123',
    sessionName: 'جلسة المبيعات',
    sessionPhone: '+201011112222',
    recipientPhone: '+201099998888',
    recipientName: 'محمود حسن',
    eventType: 'ORDER_CREATED',
    category: 'ORDERS',
    content: 'مرحباً محمود، تفاصيل طلبك مرفقة هنا.',
    failureReason: 'Payment issue: visit business.facebook.com/billing_hub/account?id=999 to resolve unpaid invoices',
    errorCode: '131042',
    whatsappMessageId: 'wamid.HBgLMTIzNDU2',
    createdAt: '2026-11-03T10:00:00.000Z',
    templateName: 'order_update',
    metaTemplateName: 'order_update_v2',
    orderNumber: 'ORD-5544',
  };

  it('renders dialog header, prominent status badge, and Arabic error banner for 131042', () => {
    render(
      <NotificationLogDetailsDialog
        log={failedLogWith131042}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    // Dialog title & header
    expect(screen.getByText('تفاصيل الإشعار المرسل')).toBeInTheDocument();
    // The redesigned dialog now renders the timestamp/status badge in more than one
    // section (header + technical block), so assert presence rather than uniqueness.
    expect(screen.getAllByText('DATE: 2026-11-03T10:00:00.000Z').length).toBeGreaterThan(0);

    // Large status badge
    expect(screen.getAllByText('فشل').length).toBeGreaterThan(0);

    // Arabic translated error block
    expect(
      screen.getByText('حساب واتساب عليه مدفوعات معلّقة — لازم تسوية الدفع في Meta')
    ).toBeInTheDocument();
    expect(screen.getByText('كود 131042')).toBeInTheDocument();

    // Meta Link
    const metaLink = screen.getByRole('link', { name: /فتح في Meta/i });
    expect(metaLink).toBeInTheDocument();
    expect(metaLink).toHaveAttribute('href', 'https://business.facebook.com/billing_hub/account?id=999');

    // WhatsApp bubble message
    expect(screen.getByText('مرحباً محمود، تفاصيل طلبك مرفقة هنا.')).toBeInTheDocument();

    // Order quick action link
    const orderLink = screen.getByRole('link', { name: /فتح الطلب/i });
    expect(orderLink).toHaveAttribute('href', '/orders?search=ORD-5544');

    // Technical details
    expect(screen.getByText(/بيانات تقنية ومعرفات النظام/)).toBeInTheDocument();
    expect(screen.getByText('wamid.HBgLMTIzNDU2')).toBeInTheDocument();
  });

  it('renders unknown error code with fallback headline', () => {
    const unknownLog: LogEntry = {
      id: 'log-unk',
      status: 'FAILED',
      messageType: 'TEXT',
      recipientPhone: '+201000000000',
      eventType: 'WELCOME_MESSAGE',
      category: 'GENERAL',
      errorCode: '888777',
      failureReason: 'Internal vendor failure',
      createdAt: '2026-11-03T11:00:00.000Z',
    };

    render(
      <NotificationLogDetailsDialog
        log={unknownLog}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    expect(screen.getByText('كود غير معروف — التفاصيل التقنية تحت')).toBeInTheDocument();
    expect(screen.getByText('كود 888777')).toBeInTheDocument();
  });

  it('hides empty cards when optional fields are absent', () => {
    const minimalLog: LogEntry = {
      id: 'log-min',
      status: 'SENT',
      messageType: 'TEXT',
      recipientPhone: '+201011112222',
      eventType: 'ORDER_CREATED',
      category: 'ORDERS',
      createdAt: '2026-11-03T12:00:00.000Z',
    };

    render(
      <NotificationLogDetailsDialog
        log={minimalLog}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    // Template card must NOT be present
    expect(screen.queryByText('القالب المستخدم')).not.toBeInTheDocument();
    // Order card must NOT be present
    expect(screen.queryByText('رقم الطلب المرتبط')).not.toBeInTheDocument();
    // Error banner must NOT be present
    expect(screen.queryByText('التفاصيل التقنية للخطأ')).not.toBeInTheDocument();
  });

  it('supports copying message content and raw error', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <NotificationLogDetailsDialog
        log={failedLogWith131042}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    const copyBtn = screen.getByText('نسخ الرسالة');
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith('مرحباً محمود، تفاصيل طلبك مرفقة هنا.');
  });

  it('header shows recipient name, phone and Arabic message type', () => {
    render(
      <NotificationLogDetailsDialog
        log={failedLogWith131042}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    expect(screen.getAllByText('محمود حسن').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+201099998888').length).toBeGreaterThan(0);
    // MESSAGE_TYPE_LABELS.TEMPLATE — never the raw enum
    expect(screen.getAllByText('قالب ميتا').length).toBeGreaterThan(0);
    expect(screen.queryByText('TEMPLATE')).not.toBeInTheDocument();
  });

  it('header falls back when the recipient name is missing', () => {
    const unnamedLog: LogEntry = {
      id: 'log-noname',
      status: 'SENT',
      messageType: 'TEXT',
      recipientPhone: '+201****0001',
      eventType: 'ORDER_CREATED',
      category: 'ORDERS',
      content: 'رسالة اختبار',
      createdAt: '2026-11-03T13:00:00.000Z',
    };

    render(
      <NotificationLogDetailsDialog
        log={unnamedLog}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    expect(screen.getAllByText('مستلم غير معروف').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+201****0001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('نص حر').length).toBeGreaterThan(0);
    expect(screen.queryByText('TEXT')).not.toBeInTheDocument();
  });

  it('does not claim a copy succeeded when the clipboard write rejects', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    render(
      <NotificationLogDetailsDialog
        log={failedLogWith131042}
        formatDate={formatDate}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('نسخ الرسالة'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('تم نسخ الرسالة')).not.toBeInTheDocument();
    expect(screen.getByText('نسخ الرسالة')).toBeInTheDocument();
  });
});
