const FacebookAdsService = require('../../services/facebookAdsService');
const facebookAdsAiDraftService = require('../../services/facebookAdsAiDraftService');

describe('AI Media Buyer Targeting & Geo-Key Auto-Hydration', () => {
  let service;

  beforeEach(() => {
    service = new FacebookAdsService('fake-token', 'act_123456');
  });

  describe('Egyptian Governorates Geo-Key Resolution', () => {
    test('resolves Arabic governorate names to Meta numeric keys', () => {
      expect(service.normalizeGeoRegion('القاهرة')).toEqual({ key: '1173' });
      expect(service.normalizeGeoRegion('الجيزة')).toEqual({ key: '1174' });
      expect(service.normalizeGeoRegion('الإسكندرية')).toEqual({ key: '1170' });
      expect(service.normalizeGeoRegion('اسكندرية')).toEqual({ key: '1170' });
      expect(service.normalizeGeoRegion('الدقهلية')).toEqual({ key: '1172' });
      expect(service.normalizeGeoRegion('الشرقية')).toEqual({ key: '1185' });
      expect(service.normalizeGeoRegion('الغربية')).toEqual({ key: '1175' });
    });

    test('resolves English governorate names to Meta numeric keys', () => {
      expect(service.normalizeGeoRegion('Cairo')).toEqual({ key: '1173' });
      expect(service.normalizeGeoRegion('Giza')).toEqual({ key: '1174' });
      expect(service.normalizeGeoRegion('Alexandria')).toEqual({ key: '1170' });
    });

    test('expands "الدلتا" bundle to all Delta governorates', () => {
      const deltaResult = service.normalizeGeoRegion('الدلتا');
      expect(Array.isArray(deltaResult)).toBe(true);
      expect(deltaResult.length).toBeGreaterThanOrEqual(9);
      const keys = deltaResult.map(r => r.key);
      expect(keys).toContain('1172'); // Dakahlia
      expect(keys).toContain('1185'); // Sharqia
      expect(keys).toContain('1175'); // Gharbia
      expect(keys).toContain('1182'); // Monufia
      expect(keys).toContain('1180'); // Kafr El Sheikh
      expect(keys).toContain('1171'); // Beheira
      expect(keys).toContain('1176'); // Damietta
      expect(keys).toContain('1184'); // Port Said
      expect(keys).toContain('1177'); // Ismailia
    });

    test('buildTargetingSpec builds deduplicated regions and prevents country collision', () => {
      const spec = service.buildTargetingSpec({
        ageMin: 25,
        ageMax: 45,
        genders: ['female'],
        regions: ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدلتا'],
      });

      expect(spec.age_min).toBe(25);
      expect(spec.age_max).toBe(45);
      expect(spec.genders).toEqual([2]);
      expect(spec.geo_locations).toBeDefined();
      expect(spec.geo_locations.regions).toBeDefined();
      expect(spec.geo_locations.countries).toBeUndefined(); // Must be undefined when child regions are present

      const keys = spec.geo_locations.regions.map(r => r.key);
      expect(keys).toContain('1173'); // Cairo
      expect(keys).toContain('1174'); // Giza
      expect(keys).toContain('1170'); // Alexandria
      expect(keys).toContain('1172'); // Dakahlia (Delta)
      expect(new Set(keys).size).toBe(keys.length); // All keys must be unique
    });
  });

  describe('Draft Service preparePublishPayload', () => {
    test('assembles complete nested targeting object from draft attributes', () => {
      const mockDraft = {
        id: 'draft_test_123',
        campaignName: 'Test Campaign',
        adSetName: 'Test AdSet',
        adName: 'Test Ad',
        primaryText: 'Buy this',
        headline: 'Great offer',
        targetCountry: 'EG',
        targetGenders: 'WOMEN',
        ageMin: 25,
        ageMax: 45,
        budgetAmount: 750,
        createFullAdData: JSON.stringify({
          targetRegions: ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدلتا'],
          targetCities: [],
          targetInterests: ['Fashion', 'Shoes'],
        })
      };

      const payload = facebookAdsAiDraftService.preparePublishPayload(mockDraft);

      expect(payload.targeting).toBeDefined();
      expect(payload.targeting.ageMin).toBe(25);
      expect(payload.targeting.ageMax).toBe(45);
      expect(payload.targeting.genders).toEqual(['female']);
      expect(payload.targeting.regions).toEqual(['القاهرة', 'الجيزة', 'الإسكندرية', 'الدلتا']);
      expect(payload.targeting.interests).toEqual(['Fashion', 'Shoes']);
      expect(payload.targeting.countries).toEqual(['EG']);
    });
  });
});
