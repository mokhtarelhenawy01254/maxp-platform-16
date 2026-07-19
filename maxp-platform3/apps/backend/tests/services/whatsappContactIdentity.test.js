const { normalizeWhatsAppContactIdentity } = require('../../services/whatsapp/contactIdentity');

describe('normalizeWhatsAppContactIdentity', () => {
    test('normalizes phone JIDs and strips device suffixes', () => {
        expect(normalizeWhatsAppContactIdentity('201001234567:12@s.whatsapp.net')).toEqual({
            normalizedJid: '201001234567@s.whatsapp.net',
            phoneNumber: '201001234567'
        });
    });

    test('keeps linked device IDs while providing a non-null contact key', () => {
        expect(normalizeWhatsAppContactIdentity('14805138174180@lid')).toEqual({
            normalizedJid: '14805138174180@lid',
            phoneNumber: 'lid:14805138174180'
        });
    });

    test('keeps group JIDs while providing a non-null contact key', () => {
        expect(normalizeWhatsAppContactIdentity('120363012345678901@g.us')).toEqual({
            normalizedJid: '120363012345678901@g.us',
            phoneNumber: 'group:120363012345678901'
        });
    });

    test('normalizes Egyptian local format (01...)', () => {
        expect(normalizeWhatsAppContactIdentity('01550599337')).toEqual({
            normalizedJid: '201550599337@s.whatsapp.net',
            phoneNumber: '201550599337'
        });
    });

    test('normalizes Egyptian extra zero format (2001...)', () => {
        expect(normalizeWhatsAppContactIdentity('2001550599337')).toEqual({
            normalizedJid: '201550599337@s.whatsapp.net',
            phoneNumber: '201550599337'
        });
    });

    test('normalizes Egyptian 0020 format', () => {
        expect(normalizeWhatsAppContactIdentity('00201550599337')).toEqual({
            normalizedJid: '201550599337@s.whatsapp.net',
            phoneNumber: '201550599337'
        });
    });

    test('normalizes Egyptian 10-digit format', () => {
        expect(normalizeWhatsAppContactIdentity('1550599337')).toEqual({
            normalizedJid: '201550599337@s.whatsapp.net',
            phoneNumber: '201550599337'
        });
    });

    test('normalizes Egyptian +20 format', () => {
        expect(normalizeWhatsAppContactIdentity('+201550599337')).toEqual({
            normalizedJid: '201550599337@s.whatsapp.net',
            phoneNumber: '201550599337'
        });
    });

    test('normalizes Egyptian 02 typo format', () => {
        expect(normalizeWhatsAppContactIdentity('021270388115')).toEqual({
            normalizedJid: '201270388115@s.whatsapp.net',
            phoneNumber: '201270388115'
        });
    });
});
