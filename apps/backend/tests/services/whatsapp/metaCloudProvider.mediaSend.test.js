/**
 * ╪º╪«╪¬╪¿╪º╪▒╪º╪¬ ╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘à┘è╪»┘è╪º ╪╣╪¿╪▒ MetaCloudProvider:
 * - ╪º┘ä┘Ç URLs ╪º┘ä╪»╪º╪«┘ä┘è╪⌐ (localhost/╪«╪º╪╡╪⌐) ┘ä╪º╪▓┘à ╪¬╪¬╪▒┘ü╪╣ ╪¿┘Ç media id ┘ä╪ú┘å ┘à┘è╪¬╪º ┘à╪┤ ┘ç╪¬┘ê╪╡┘ä ┘ä┘ä┘Ç link.
 * - ╪º┘ä┘Ç URLs ╪º┘ä╪╣╪º┘à╪⌐ ╪¬╪¬╪¿╪╣╪¬ ╪¿┘Ç link.
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

describe('MetaCloudProvider.sendMedia ΓÇö internal URL ΓåÆ media id', () => {
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

    // 1) POST ┘ä┘ä┘Ç /media (upload) ΓåÆ ╪¡╪╡┘ä
    const uploadCall = axiosPost.mock.calls.find(([url]) => String(url).includes('/media'));
    expect(uploadCall).toBeTruthy();
    // 2) POST ┘ä┘ä┘à┘Ç /messages ΓåÆ ╪¿┘Ç id ┘à╪┤ link
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
    expect(uploadCall).toBeUndefined(); // ┘à┘ü┘è╪┤ upload ┘ä┘ä┘Ç public link

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

    // 1) ╪¬┘à ╪º┘ä╪¬╪¡┘à┘è┘ä ┘à┘å ╪º┘ä╪▒╪º╪¿╪╖
    expect(axiosGet).toHaveBeenCalled();
    // 2) ╪¡╪╡┘ä upload ╪¿┘Ç media id (┘à╪┤ link)
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
