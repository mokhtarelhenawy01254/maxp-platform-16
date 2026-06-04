const telegramUserbotService = require('../../services/TelegramUserbotService');

describe('TelegramUserbotService chat entity references', () => {
  test('builds InputPeerUser from dialog reference without cache lookup', async () => {
    const client = {
      getInputEntity: jest.fn(),
      getDialogs: jest.fn()
    };

    const entity = await telegramUserbotService._resolveChatEntity(client, '8707909368', {
      inputPeer: {
        className: 'InputPeerUser',
        userId: '8707909368',
        accessHash: '123456789012345'
      }
    });

    expect(entity.className).toBe('InputPeerUser');
    expect(entity.userId.toString()).toBe('8707909368');
    expect(entity.accessHash.toString()).toBe('123456789012345');
    expect(client.getInputEntity).not.toHaveBeenCalled();
    expect(client.getDialogs).not.toHaveBeenCalled();
  });

  test('refreshes dialogs before giving up on cached numeric chat ids', async () => {
    const resolvedEntity = { className: 'InputPeerUser', userId: '8707909368' };
    const client = {
      getInputEntity: jest
        .fn()
        .mockRejectedValueOnce(new Error('missing cache'))
        .mockRejectedValueOnce(new Error('missing cache'))
        .mockResolvedValueOnce(resolvedEntity),
      getDialogs: jest.fn().mockResolvedValue([])
    };

    const entity = await telegramUserbotService._resolveChatEntity(client, '8707909368');

    expect(entity).toBe(resolvedEntity);
    expect(client.getDialogs).toHaveBeenCalledWith({ limit: 100 });
    expect(client.getInputEntity).toHaveBeenCalledTimes(3);
  });

  test('serializes dialogs with reusable input peer metadata', async () => {
    const originalGetClient = telegramUserbotService._getClient;
    const fakeClient = {
      getDialogs: jest.fn().mockResolvedValue([
        {
          id: BigInt('8707909368'),
          entity: {
            id: BigInt('8707909368'),
            firstName: 'swan2'
          },
          inputEntity: {
            className: 'InputPeerUser',
            userId: BigInt('8707909368'),
            accessHash: BigInt('123456789012345')
          },
          unreadCount: 0,
          message: { message: 'latest' },
          date: 1710000000,
          isUser: true,
          isGroup: false,
          isChannel: false
        }
      ])
    };

    telegramUserbotService._getClient = jest.fn().mockResolvedValue(fakeClient);

    try {
      const result = await telegramUserbotService.getDialogs('cfg_1', 'company_1');

      expect(result.success).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: '8707909368',
        legacyId: '8707909368',
        peerType: 'user',
        accessHash: '123456789012345',
        inputPeer: {
          className: 'InputPeerUser',
          userId: '8707909368',
          accessHash: '123456789012345',
          peerType: 'user'
        }
      });
    } finally {
      telegramUserbotService._getClient = originalGetClient;
    }
  });
});
