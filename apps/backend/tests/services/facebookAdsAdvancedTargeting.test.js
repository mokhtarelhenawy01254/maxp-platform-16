const FacebookAdsService = require('../../services/facebookAdsService');
const facebookAdsAiDraftService = require('../../services/facebookAdsAiDraftService');

describe('Facebook Ads Advanced Targeting: GPS Pin-Drop, Negative Geo-Exclusions, & Dynamic Search', () => {
  let service;

  beforeEach(() => {
    service = new FacebookAdsService('fake-token', 'act_123456');
  });

  describe('GPS Map Pin-Drop (Custom Locations)', () => {
    test('normalizes valid GPS coordinates and radius', () => {
      const loc = service.normalizeCustomLocation({
        latitude: 30.0444,
        longitude: 31.2357,
        radius: 7,
        distance_unit: 'kilometer',
        name: 'مول العرب - 6 أكتوبر'
      });

      expect(loc).toEqual({
        latitude: 30.0444,
        longitude: 31.2357,
        radius: 7,
        distance_unit: 'kilometer',
        name: 'مول العرب - 6 أكتوبر'
      });
    });

    test('rejects invalid or out-of-bounds coordinates', () => {
      expect(service.normalizeCustomLocation(null)).toBeNull();
      expect(service.normalizeCustomLocation({})).toBeNull();
      expect(service.normalizeCustomLocation({ latitude: 120.0, longitude: 31.0 })).toBeNull();
      expect(service.normalizeCustomLocation({ latitude: 30.0, longitude: 200.0 })).toBeNull();
      expect(service.normalizeCustomLocation({ latitude: 'invalid', longitude: 31.0 })).toBeNull();
    });

    test('buildTargetingSpec includes custom_locations in geo_locations and scopes country out', () => {
      const spec = service.buildTargetingSpec({
        ageMin: 22,
        ageMax: 50,
        customLocations: [
          { latitude: 30.0131, longitude: 31.4289, radius: 5, name: 'التجمع الخامس' }
        ]
      });

      expect(spec.geo_locations).toBeDefined();
      expect(spec.geo_locations.custom_locations).toBeDefined();
      expect(spec.geo_locations.custom_locations).toHaveLength(1);
      expect(spec.geo_locations.custom_locations[0].latitude).toBe(30.0131);
      expect(spec.geo_locations.custom_locations[0].radius).toBe(5);
      expect(spec.geo_locations.countries).toBeUndefined();
    });
  });

  describe('Excluded Geo Locations (COD Logistics Guard)', () => {
    test('buildTargetingSpec creates excluded_geo_locations with regions and cities', () => {
      const spec = service.buildTargetingSpec({
        ageMin: 20,
        ageMax: 45,
        countries: ['EG'],
        regions: ['القاهرة', 'الجيزة'],
        excludedRegions: ['أسيوط', 'سوهاج', 'قنا'],
        excludedCities: [{ key: '2420605', radius: 10 }]
      });

      expect(spec.geo_locations).toBeDefined();
      expect(spec.geo_locations.regions).toHaveLength(2);

      expect(spec.excluded_geo_locations).toBeDefined();
      expect(spec.excluded_geo_locations.regions).toBeDefined();
      expect(spec.excluded_geo_locations.regions).toHaveLength(3);

      const excludedKeys = spec.excluded_geo_locations.regions.map(r => r.key);
      expect(excludedKeys).toContain('1007');
      expect(excludedKeys).toContain('1014');
      expect(excludedKeys).toContain('1013');

      expect(spec.excluded_geo_locations.cities).toBeDefined();
      expect(spec.excluded_geo_locations.cities[0].key).toBe('2420605');
      expect(spec.excluded_geo_locations.location_types).toEqual(['home']);
    });

    test('supports excluded custom GPS locations (Pin-Drop Exclusions)', () => {
      const spec = service.buildTargetingSpec({
        countries: ['EG'],
        excludedCustomLocations: [
          { latitude: 29.8456, longitude: 31.2987, radius: 3, name: 'منطقة مستبعدة' }
        ]
      });

      expect(spec.excluded_geo_locations).toBeDefined();
      expect(spec.excluded_geo_locations.custom_locations).toHaveLength(1);
      expect(spec.excluded_geo_locations.custom_locations[0].latitude).toBe(29.8456);
      expect(spec.excluded_geo_locations.custom_locations[0].radius).toBe(3);
    });
  });

  describe('Draft Service & Defensive Auto-Hydration with Exclusions', () => {
    test('preparePublishPayload carries customLocations and excludedLocations', () => {
      const mockDraft = {
        id: 'draft_advanced_geo_001',
        campaignName: 'حملة استهداف ذكي',
        adSetName: 'مجموعة إعلانية',
        adName: 'إعلان 1',
        budgetAmount: 500,
        targetCountry: 'EG',
        createFullAdData: JSON.stringify({
          customLocations: [{ latitude: 30.05, longitude: 31.25, radius: 10 }],
          excludedRegions: ['أسيوط', 'سوهاج'],
          excludedCities: ['12345'],
        })
      };

      const payload = facebookAdsAiDraftService.preparePublishPayload(mockDraft);

      expect(payload.targeting).toBeDefined();
      expect(payload.targeting.customLocations).toHaveLength(1);
      expect(payload.targeting.excludedRegions).toEqual(['أسيوط', 'سوهاج']);
      expect(payload.targeting.excludedCities).toEqual(['12345']);

      const spec = service.buildTargetingSpec(payload.targeting);
      expect(spec.geo_locations.custom_locations).toHaveLength(1);
      expect(spec.excluded_geo_locations.regions).toHaveLength(2);
      expect(spec.excluded_geo_locations.regions.map(r => r.key)).toEqual(['1007', '1014']);
    });
  });
});