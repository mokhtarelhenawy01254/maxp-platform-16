/**
 * اختبارات إرسال الميديا عبر MetaCloudProvider:
 * - الـ URLs الداخلية (localhost/خاصة) لازم تترفع بـ media id لأن ميتا مش هتوصل للـ link.
 * - الـ URLs العامة تتبعت بـ link.
 */

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../../config/metaApi', () => ({
  getMetaGraphApiVersion: jest.fn(() => 'v25.0')
}));

jest.mock('../../../utils/fieldEncryption', () => ({
  decryptField: jest.fn((v) => v)
}));

const axios = require('axios');
const { getSharedPrismaClient } = require('../../../services/sharedDatabase');
const MetaCloudProvider = require('../../../services/whatsapp/providers/MetaCloudProvider');

describe('MetaCloudProvider.sendMedia — internal URL → media id', () => {
  let prisma;

  beforeEach(() => {
    prisma = {
      whatsAppSession: {
        findUnique: jest.fn(async () => ({
          id: 'session-1',
          provider: 'META_CLOUD',
          metaAccessToken: 'secret-token',
          metaPhoneNumberId: 'phone-1',
          metaApiVersion: 'v25.0'
        }))
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.clearAllMocks();
  });

  test('localhost URL uploads media and sends by id', async () => {
    const axiosPost = jest.spyOn(axios, 'post').mockImplementation(async () => ({
      data: { id: 'media-id-123' }
    }));
    const axiosGet = jest.spyOn(axios, 'get').mockImplementation(async () => ({
      data: Buffer.from('fake-image-bytes')
    }));

    const result = await MetaCloudProvider.sendMedia(
      'session-1',
      '201123456789',
      { url: 'http://localhost:3007/uploads/booking-branches/branch.jpg' },
      'image'
    );

    // 1) POST للـ /media (upload) → حصل
    const uploadCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/media'));
    expect(uploadCall).toBeTruthy();
    // 2) POST للمـ /messages → بـ id مش link
    const msgCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/messages'));
    expect(msgCall).toBeTruthy();
    const body = msgCall[1];
    expect(body.type).toBe('image');
    expect(body.image.id).toBe('media-id-123');
    expect(body.image.link).toBeUndefined();

    axiosPost.mockRestore();
    axiosGet.mockRestore();
  });

  test('public HTTPS URL is sent by link (no upload)', async () => {
    const axiosPost = jest.spyOn(axios, 'post').mockImplementation(async () => ({
      data: { messages: [{ id: 'wamid-1' }] }
    }));

    const result = await MetaCloudProvider.sendMedia(
      'session-1',
      '201123456789',
      { url: 'https://maxp.online/uploads/booking-branches/branch.jpg' },
      'image'
    );

    const uploadCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/media'));
    expect(uploadCall).toBeUndefined(); // مفيش upload للـ public link

    const msgCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/messages'));
    const body = msgCall[1];
    expect(body.image.link).toBe('https://maxp.online/uploads/booking-branches/branch.jpg');
    expect(body.image.id).toBeUndefined();

    axiosPost.mockRestore();
  });

  test('WEBP image URL is downloaded, converted to JPEG and uploaded by id (not sent as link)', async () => {
    const axiosPost = jest.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (String(url).includes('/media')) return { data: { id: 'media-id-webp' } };
      return { data: { messages: [{ id: 'wamid-webp' }] } };
    });
    const axiosGet = jest.spyOn(axios, 'get').mockImplementation(async () => ({
      data: Buffer.from('fake-webp-bytes')
    }));

    const result = await MetaCloudProvider.sendMedia(
      'session-1',
      '201123456789',
      { url: 'https://maxp.online/uploads/products/photo.webp' },
      'image'
    );

    // 1) تم التحميل من الرابط
    expect(axiosGet).toHaveBeenCalled();
    // 2) حصل upload بـ media id (مش link)
    const uploadCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/media'));
    expect(uploadCall).toBeTruthy();
    const msgCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/messages'));
    const body = msgCall[1];
    expect(body.image.id).toBe('media-id-webp');
    expect(body.image.link).toBeUndefined();

    axiosPost.mockRestore();
    axiosGet.mockRestore();
  });

  test('WEBP internal URL is downloaded, converted and uploaded by id', async () => {
    const axiosPost = jest.spyOn(axios, 'post').mockImplementation(async (url) => {
      if (String(url).includes('/media')) return { data: { id: 'media-id-internal' } };
      return { data: { messages: [{ id: 'wamid-internal' }] } };
    });
    const axiosGet = jest.spyOn(axios, 'get').mockImplementation(async () => ({
      data: Buffer.from('fake-webp-bytes')
    }));

    const result = await MetaCloudProvider.sendMedia(
      'session-1',
      '201123456789',
      { url: 'http://localhost:3007/uploads/whatsapp/images/photo.webp', mimetype: 'image/webp' },
      'image'
    );

    const uploadCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/media'));
    expect(uploadCall).toBeTruthy();
    const msgCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/messages'));
    const body = msgCall[1];
    expect(body.image.id).toBe('media-id-internal');
    expect(body.image.link).toBeUndefined();

    axiosPost.mockRestore();
    axiosGet.mockRestore();
  });
});
