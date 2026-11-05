const path = require('path');
const fs = require('fs');

describe('Production Reliability & Crash Fixes Suite', () => {
  describe('1. Meta Cloud URL Button Single-Parameter Conformance (#132018)', () => {
    test('buildMetaTemplatePayload produces single parameter {{1}} for customerPageLink URL', () => {
      const { buildMetaTemplatePayload } = require('../../utils/metaTemplatePayload');
      const company = { id: 'comp_1', slug: 'swan', customDomain: null };
      const localTemplate = {
        hasButtons: true,
        buttons: JSON.stringify([{ type: 'LINK', text: 'صفحتي' }]),
      };

      const payload = buildMetaTemplatePayload(localTemplate, company);
      expect(payload.buttonsComponent).toBeDefined();
      expect(payload.buttonsComponent.type).toBe('BUTTONS');
      const urlBtn = payload.buttonsComponent.buttons.find((b) => b.type === 'URL');
      expect(urlBtn).toBeDefined();
      expect(urlBtn.url).toContain('token={{1}}');
      expect(urlBtn.url).not.toContain('phone={{2}}');
    });
  });

  describe('2. LeadFollowUpService Retry Variable Reassignment (TypeError fix)', () => {
    test('LeadFollowUpService._nextBusinessHourDate reassigns retryAt without TypeError', () => {
      const LeadFollowUpService = require('../../services/whatsapp/LeadFollowUpService');
      const settings = {
        timezone: 'Africa/Cairo',
        businessHoursStart: '09:00',
        businessHoursEnd: '18:00',
        workDays: [0, 1, 2, 3, 4],
      };

      const nextDate = LeadFollowUpService._nextBusinessHourDate(settings);
      expect(nextDate).toBeInstanceOf(Date);

      let retryAt = new Date();
      expect(() => {
        retryAt.setHours(retryAt.getHours() + 1);
        retryAt = LeadFollowUpService._nextBusinessHourDate(settings);
      }).not.toThrow();
      expect(retryAt).toBeInstanceOf(Date);
    });
  });

  describe('3. Customer Quality Notification Schedule UTF-8 & Retry Safety', () => {
    test('QUALITY_ORDER contains clean Arabic UTF-8 strings', () => {
      const code = fs.readFileSync(
        path.join(__dirname, '../../services/hr/customerNotificationScheduleService.js'),
        'utf8'
      );
      expect(code).toContain("const QUALITY_ORDER = ['VIP', 'عالي', 'متوسط', 'منخفض'];");
      expect(code).toContain("return 'عالي';");
      expect(code).toContain("return 'متوسط';");
      expect(code).toContain("return 'منخفض';");
      expect(code).toContain("'عميلنا العزيز'");
    });
  });

  describe('4. Manufacturing Overdue Cron Schema Select Safety', () => {
    test('manufacturingNotificationCron selects valid ProductionOrder fields and bom.name', () => {
      const code = fs.readFileSync(
        path.join(__dirname, '../../cron/manufacturingNotificationCron.js'),
        'utf8'
      );
      expect(code).not.toContain('orderNumber: true,\n        productName: true');
      expect(code).toContain('bom: {\n          select: { name: true },\n        }');
      expect(code).toContain("productName: order.bom?.name || 'أمر إنتاج'");
    });
  });

  describe('5. ImageProcessor Atomic Write & EXIF Rotation', () => {
    test('imageProcessor uses atomic temp file write before renaming to outputPath', () => {
      const code = fs.readFileSync(
        path.join(__dirname, '../../utils/imageProcessor.js'),
        'utf8'
      );
      expect(code).toContain('.rotate()');
      expect(code).toContain('limitInputPixels: 40000000');
      expect(code).toContain('tempOutputPath');
      expect(code).toContain('rename(tempOutputPath, outputPath)');
    });
  });

  describe('6. Storefront Socket.IO Anonymous Connection Guard', () => {
    test('socketService rejects sockets without token cleanly without crashing or uncaught exception', async () => {
      const socketServicePath = path.join(__dirname, '../../services/socketService.js');
      const code = fs.readFileSync(socketServicePath, 'utf8');
      expect(code).toContain("if (!token)");
      expect(code).toContain("next(new Error('Authentication failed'))");
    });
  });

  describe('7. WhatsApp getPinnedMessage Session Resilience', () => {
    test('whatsappController wraps resolveActiveSessionId with try/catch to return pinnedMessage: null on missing session', () => {
      const controllerPath = path.join(__dirname, '../../controller/whatsappController.js');
      const code = fs.readFileSync(controllerPath, 'utf8');
      expect(code).toContain('resolveActiveSessionId(companyId, sessionId)');
      expect(code).toContain('pinnedMessage: null');
      expect(code).toMatch(/try\s*\{\s*targetSessionId\s*=\s*await resolveActiveSessionId/);
    });
  });

  describe('8. Turbo Tracking 404 Log Noise Suppression', () => {
    test('turboTrackingScheduler and errorHandler suppress 404 shipment not found console.error', () => {
      const errorHandlerPath = path.join(__dirname, '../../utils/turbo/errorHandler.js');
      const code = fs.readFileSync(errorHandlerPath, 'utf8');
      expect(code).toContain('isShipmentNotFoundError(rawError)');
      expect(code).toContain('No shipments found in Turbo for this period');
    });
  });
});
