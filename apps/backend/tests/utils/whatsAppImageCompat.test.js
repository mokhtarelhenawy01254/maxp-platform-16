/**
 * اختبارات وحدة توافق صيغ الصور مع WhatsApp Cloud API
 * (utils/whatsAppImageCompat.js)
 */

const mockSharpInstance = {
  jpeg: jest.fn(),
  toBuffer: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

const sharp = require('sharp');
const { normalizeImageForWhatsApp, WHATSAPP_IMAGE_MIMES } = require('../../utils/whatsAppImageCompat');

describe('normalizeImageForWhatsApp', () => {
  const fakeBuffer = Buffer.from('image-bytes');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharpInstance.jpeg.mockReturnValue(mockSharpInstance);
  });

  test('passes JPEG through unchanged', async () => {
    const result = await normalizeImageForWhatsApp(fakeBuffer, 'image/jpeg');
    expect(result.buffer).toBe(fakeBuffer);
    expect(result.mimetype).toBe('image/jpeg');
    expect(sharp).not.toHaveBeenCalled();
  });

  test('passes PNG through unchanged', async () => {
    const result = await normalizeImageForWhatsApp(fakeBuffer, 'image/png');
    expect(result.buffer).toBe(fakeBuffer);
    expect(result.mimetype).toBe('image/png');
  });

  test('passes GIF through unchanged (stays animated)', async () => {
    const result = await normalizeImageForWhatsApp(fakeBuffer, 'image/gif');
    expect(result.buffer).toBe(fakeBuffer);
    expect(result.mimetype).toBe('image/gif');
  });

  test('converts WEBP to JPEG', async () => {
    const jpegBuffer = Buffer.from('converted-jpeg');
    mockSharpInstance.toBuffer.mockResolvedValueOnce(jpegBuffer);

    const result = await normalizeImageForWhatsApp(fakeBuffer, 'image/webp');
    expect(result.buffer).toBe(jpegBuffer);
    expect(result.mimetype).toBe('image/jpeg');
    expect(sharp).toHaveBeenCalledWith(fakeBuffer);
    expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 });
  });

  test('returns original buffer when conversion throws', async () => {
    mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('decode failed'));

    const result = await normalizeImageForWhatsApp(fakeBuffer, 'image/webp');
    expect(result.buffer).toBe(fakeBuffer);
    expect(result.mimetype).toBe('image/webp');
  });

  test('handles mimetype with parameters', async () => {
    const result = await normalizeImageForWhatsApp(fakeBuffer, 'image/png; charset=binary');
    expect(result.mimetype).toBe('image/png');
  });

  test('exposes supported image mimes', () => {
    expect(WHATSAPP_IMAGE_MIMES).toEqual(['image/jpeg', 'image/png', 'image/gif']);
  });
});
