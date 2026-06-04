import { describe, expect, it } from 'vitest';
import {
  localizeBiteRushAttributeEntries,
  localizeBiteRushAttributeRecord,
  localizeBiteRushName,
} from '../utils/biteRushCopy';

describe('biteRushCopy', () => {
  it('localizes known BiteRush product names', () => {
    expect(localizeBiteRushName('Rush Combo')).toBe('راش كومبو');
    expect(localizeBiteRushName('', 'family-rush')).toBe('فاميلي راش ميل');
    expect(localizeBiteRushName('Unknown item')).toBe('Unknown item');
  });

  it('localizes known BiteRush cart attributes', () => {
    expect(
      localizeBiteRushAttributeEntries([
        ['Sauce', 'Rush'],
        ['Drink', 'Cola'],
      ]),
    ).toEqual([
      ['الصوص', 'راش'],
      ['المشروب', 'كولا'],
    ]);

    expect(
      localizeBiteRushAttributeRecord({
        Sauce: 'Rush',
        Drink: 'Cola',
      }),
    ).toEqual({
      'الصوص': 'راش',
      'المشروب': 'كولا',
    });
  });
});
