const { __testing } = require('../../services/whatsapp/DatabaseAuthState');

describe('DatabaseAuthState key updates', () => {
  it('removes Baileys keys when set receives null values', () => {
    const keysData = {
      session: {
        a: { value: 1 },
        b: { value: 2 }
      }
    };

    __testing.applyKeyUpdates(keysData, {
      session: {
        a: null,
        c: { value: 3 }
      }
    });

    expect(keysData).toEqual({
      session: {
        b: { value: 2 },
        c: { value: 3 }
      }
    });
  });
});
