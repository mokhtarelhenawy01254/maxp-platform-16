jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn(() => ({})),
    safeQuery: jest.fn(async (operation) => operation()),
    executeWithRetry: jest.fn(async (operation) => operation())
}));

jest.mock('../../services/socketService', () => ({
    getIO: jest.fn(() => null)
}));

jest.mock('../../services/whatsapp/DatabaseAuthState', () => ({
    useDatabaseAuthState: jest.fn()
}));

describe('WhatsAppManager message capture helpers', () => {
    const { getSharedPrismaClient } = require('../../services/sharedDatabase');
    const { __testing } = require('../../services/whatsapp/WhatsAppManager');

    test('processes replayed notify messages older than one minute', () => {
        const nowSeconds = 1000;
        const replayedMessage = {
            messageTimestamp: nowSeconds - 10 * 60
        };

        expect(__testing.shouldProcessIncomingMessage(replayedMessage, nowSeconds)).toBe(true);
    });

    test('rejects impossible future timestamps only', () => {
        const nowSeconds = 1000;
        const futureMessage = {
            messageTimestamp: nowSeconds + 10 * 60
        };

        expect(__testing.shouldProcessIncomingMessage(futureMessage, nowSeconds)).toBe(false);
    });

    test('extracts timestamps from Baileys Long-like values', () => {
        expect(__testing.getIncomingMessageTimestampSeconds({
            messageTimestamp: { toNumber: () => 1234 }
        })).toBe(1234);
    });

    test('keeps required contact phoneNumber populated for non-phone JIDs', () => {
        expect(__testing.getContactPhoneNumberForJid('1234567890@lid')).toBe('1234567890');
        expect(__testing.getContactPhoneNumberForJid('120363000000000000@g.us')).toBe('120363000000000000');
        expect(__testing.getContactPhoneNumberForJid('201001112223:12@s.whatsapp.net')).toBe('201001112223');
    });

    test('extracts a real phone JID from Baileys senderPn for LID messages', () => {
        expect(__testing.getPhoneJidFromMessageKey({
            key: {
                remoteJid: '101524504055946@lid',
                senderPn: '201270388115:7@s.whatsapp.net',
                participant: '242477344759810@lid'
            }
        }, { fromMe: true })).toBe('201270388115@s.whatsapp.net');

        expect(__testing.getPhoneJidFromMessageKey({
            key: {
                remoteJid: '101524504055946@lid',
                participant: '242477344759810@s.whatsapp.net'
            }
        }, { fromMe: true })).toBeNull();
    });

    test('resolves outgoing linked-device messages through previous inbound phone mapping', async () => {
        const findFirst = jest.fn().mockResolvedValue({
            remoteJid: '201270388115@s.whatsapp.net'
        });

        getSharedPrismaClient.mockReturnValueOnce({
            whatsAppMessage: {
                findFirst
            }
        });

        await expect(__testing.resolveLinkedDeviceRemoteJid(
            'session-1',
            '101524504055946@lid',
            {
                key: {
                    remoteJid: '101524504055946@lid',
                    fromMe: true,
                    id: '3EB0B33F314F05BC4DB6BC'
                }
            },
            { fromMe: true }
        )).resolves.toBe('201270388115@s.whatsapp.net');

        expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                sessionId: 'session-1',
                metadata: {
                    contains: '"remoteJid":"101524504055946@lid"'
                }
            })
        }));
    });

    test('captures append upserts only for messages sent from the linked account unless history import is enabled', () => {
        expect(__testing.shouldProcessMessageUpsertType('notify', false)).toBe(true);
        expect(__testing.shouldProcessMessageUpsertType('notify', true)).toBe(true);
        expect(__testing.shouldProcessMessageUpsertType('append', true)).toBe(true);
        expect(__testing.shouldProcessMessageUpsertType('append', false)).toBe(false);
        expect(__testing.shouldProcessMessageUpsertType('append', false, { importHistory: true })).toBe(true);
    });

    test('parses history sync flags for new WhatsApp sessions', () => {
        expect(__testing.shouldEnableFullHistorySync({ importHistory: true })).toBe(true);
        expect(__testing.shouldEnableFullHistorySync({ syncFullHistory: 'true' })).toBe(true);
        expect(__testing.shouldEnableFullHistorySync({ syncOldMessages: '1' })).toBe(true);
        expect(__testing.shouldEnableFullHistorySync({ importHistory: false })).toBe(false);
    });

    test('treats forbidden socket closes as relink-required instead of reconnect loops', () => {
        expect(__testing.getDisconnectRecoveryDecision(403, '', false)).toMatchObject({
            isForbidden: true,
            requiresFreshLink: true,
            shouldReconnect: false
        });
        expect(__testing.getDisconnectRecoveryDecision(403, '', true)).toMatchObject({
            isForbidden: true,
            requiresFreshLink: false,
            shouldReconnect: false
        });
    });

    test('keeps transient disconnects on the automatic reconnect path', () => {
        expect(__testing.getDisconnectRecoveryDecision(408, '', false)).toMatchObject({
            requiresFreshLink: false,
            shouldReconnect: true
        });
        expect(__testing.getDisconnectRecoveryDecision(515, 'connection lost', false)).toMatchObject({
            requiresFreshLink: false,
            shouldReconnect: true
        });
    });

    test('moves corrupted auth into fresh-link state without deleting the MaxP session', () => {
        expect(__testing.getDisconnectRecoveryDecision(undefined, 'failed to decrypt message: Bad MAC', false)).toMatchObject({
            isBadMac: true,
            requiresFreshLink: true,
            shouldReconnect: false
        });
        expect(__testing.getDisconnectRecoveryDecision(401, '', true)).toMatchObject({
            isLoggedOut: true,
            requiresFreshLink: false,
            shouldReconnect: false
        });
    });

    test('classifies WhatsApp disconnect alerts by recovery path', () => {
        expect(__testing.getWhatsAppDisconnectAlertCategory({
            requiresFreshLink: true,
            shouldReconnect: false
        })).toBe('RELINK_REQUIRED');

        expect(__testing.getWhatsAppDisconnectAlertCategory({
            requiresFreshLink: false,
            shouldReconnect: true
        })).toBe('AUTO_RECONNECTING');

        expect(__testing.getWhatsAppDisconnectAlertCategory({
            source: 'health_check',
            shouldReconnect: true
        })).toBe('HEALTH_CHECK_DISCONNECT');
    });

    test('throttles duplicate WhatsApp disconnect alerts per session and category', () => {
        __testing.resetWhatsAppDisconnectAlertState();

        expect(__testing.shouldSendWhatsAppDisconnectAlert(
            'session-1',
            'AUTO_RECONNECTING',
            1000,
            60000
        )).toBe(true);

        expect(__testing.shouldSendWhatsAppDisconnectAlert(
            'session-1',
            'AUTO_RECONNECTING',
            2000,
            60000
        )).toBe(false);

        expect(__testing.shouldSendWhatsAppDisconnectAlert(
            'session-1',
            'RELINK_REQUIRED',
            3000,
            60000
        )).toBe(true);

        expect(__testing.shouldSendWhatsAppDisconnectAlert(
            'session-1',
            'AUTO_RECONNECTING',
            62000,
            60000
        )).toBe(true);
    });

    test('builds a Telegram alert for transient WhatsApp disconnects', () => {
        const message = __testing.buildWhatsAppDisconnectAlertMessage({
            sessionId: 'session-1',
            companyId: 'company-1',
            phoneNumber: '201001112223',
            statusCode: 408,
            shouldReconnect: true,
            nextDbStatus: 'CONNECTING'
        });

        expect(message).toContain('WhatsApp Number Disconnected');
        expect(message).toContain('*Phone Number:* `+201001112223`');
        expect(message).toContain('*Status Code:* `408`');
        expect(message).toContain('MaxP is attempting automatic reconnect');
    });

    test('does not downgrade read receipts during replayed status updates', () => {
        expect(__testing.shouldApplyMessageStatus('READ', 'SENT')).toBe(false);
        expect(__testing.shouldApplyMessageStatus('READ', 'DELIVERED')).toBe(false);
        expect(__testing.shouldApplyMessageStatus('SENT', 'DELIVERED')).toBe(true);
        expect(__testing.shouldApplyMessageStatus('DELIVERED', 'READ')).toBe(true);
    });

    test('maps Baileys delivery status values used by message payloads and receipts', () => {
        expect(__testing.getMessageStatusFromBaileysStatus(1)).toBe('PENDING');
        expect(__testing.getMessageStatusFromBaileysStatus(2)).toBe('SENT');
        expect(__testing.getMessageStatusFromBaileysStatus(3)).toBe('DELIVERED');
        expect(__testing.getMessageStatusFromBaileysStatus(4)).toBe('READ');
        expect(__testing.getMessageStatusFromBaileysStatus('DELIVERY_ACK')).toBe('DELIVERED');
        expect(__testing.getMessageStatusFromBaileysStatus('READ')).toBe('READ');
        expect(__testing.getMessageStatusFromBaileysStatus(undefined)).toBeNull();
    });

    test('keeps connected sessions healthy when Baileys hides websocket readyState', () => {
        expect(__testing.classifySessionSocketHealth({
            status: 'connected',
            sock: {}
        })).toEqual({
            alive: true,
            stale: false,
            reason: 'websocket_state_unavailable'
        });
    });
});

describe('WhatsAppInboundService status helpers', () => {
    const { __testing } = require('../../services/whatsapp/WhatsAppInboundService');

    test('does not downgrade existing read status from webhook receipts', () => {
        expect(__testing.shouldApplyMessageStatus('READ', 'SENT')).toBe(false);
        expect(__testing.shouldApplyMessageStatus('READ', 'DELIVERED')).toBe(false);
        expect(__testing.shouldApplyMessageStatus('DELIVERED', 'READ')).toBe(true);
    });
});
