const {
  HR_API_SCOPES,
  credentialHasScope,
  logExternalApiAction
} = require('../../services/hrIntegrationService');
const { TokenBucket } = require('../../middleware/externalHrRateLimiter');
const openApiSpec = require('../../config/openapi-hr.json');
const express = require('express');

describe('HR External API V2 Comprehensive Test Suite', () => {
  describe('D3: Scopes Consistency & Route Table-Driven Verification', () => {
    test('All documented scopes exist in HR_API_SCOPES', () => {
      const requiredScopes = [
        '*',
        'hr:read',
        'hr:write',
        'hr:departments:read',
        'hr:positions:read',
        'hr:employees:read',
        'hr:employees:write',
        'hr:attendance:ingest',
        'hr:attendance:read',
        'hr:leaves:read',
        'hr:leaves:write',
        'hr:leaves:approve',
        'hr:payroll:read',
        'hr:advances:read',
        'hr:deductions:read',
        'hr:warnings:read',
        'hr:resignations:read'
      ];

      for (const scope of requiredScopes) {
        expect(HR_API_SCOPES).toContain(scope);
      }
    });

    test('credentialHasScope correctly respects umbrellas and granular permissions', () => {
      // Umbrella *
      expect(credentialHasScope({ scopes: JSON.stringify(['*']) }, 'hr:departments:read')).toBe(true);
      expect(credentialHasScope({ scopes: JSON.stringify(['*']) }, 'hr:leaves:approve')).toBe(true);
      expect(credentialHasScope({ scopes: JSON.stringify(['*']) }, 'hr:advances:read')).toBe(true);

      // Umbrella hr:read
      const readCred = { scopes: JSON.stringify(['hr:read']) };
      expect(credentialHasScope(readCred, 'hr:departments:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:positions:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:employees:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:attendance:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:leaves:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:payroll:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:advances:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:deductions:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:warnings:read')).toBe(true);
      expect(credentialHasScope(readCred, 'hr:resignations:read')).toBe(true);

      // hr:read should NOT grant write or approve
      expect(credentialHasScope(readCred, 'hr:leaves:approve')).toBe(false);
      expect(credentialHasScope(readCred, 'hr:leaves:write')).toBe(false);
      expect(credentialHasScope(readCred, 'hr:employees:write')).toBe(false);

      // Umbrella hr:write
      const writeCred = { scopes: JSON.stringify(['hr:write']) };
      expect(credentialHasScope(writeCred, 'hr:employees:write')).toBe(true);
      expect(credentialHasScope(writeCred, 'hr:attendance:ingest')).toBe(true);
      expect(credentialHasScope(writeCred, 'hr:leaves:write')).toBe(true);
      expect(credentialHasScope(writeCred, 'hr:leaves:approve')).toBe(true);

      // Granular scopes
      const advCred = { scopes: JSON.stringify(['hr:advances:read']) };
      expect(credentialHasScope(advCred, 'hr:advances:read')).toBe(true);
      expect(credentialHasScope(advCred, 'hr:deductions:read')).toBe(false);

      const dedCred = { scopes: JSON.stringify(['hr:deductions:read']) };
      expect(credentialHasScope(dedCred, 'hr:deductions:read')).toBe(true);
      expect(credentialHasScope(dedCred, 'hr:advances:read')).toBe(false);

      const warnCred = { scopes: JSON.stringify(['hr:warnings:read']) };
      expect(credentialHasScope(warnCred, 'hr:warnings:read')).toBe(true);
      expect(credentialHasScope(warnCred, 'hr:resignations:read')).toBe(false);

      const resigCred = { scopes: JSON.stringify(['hr:resignations:read']) };
      expect(credentialHasScope(resigCred, 'hr:resignations:read')).toBe(true);
      expect(credentialHasScope(resigCred, 'hr:warnings:read')).toBe(false);
    });

    test('OpenAPI spec contains all required V2 endpoints', () => {
      const endpoints = [
        '/employees',
        '/employees/stats',
        '/employees/organization-chart',
        '/employees/{id}',
        '/employees/upsert',
        '/departments',
        '/positions',
        '/attendance/punches/batch',
        '/attendance/today',
        '/attendance/summary',
        '/leaves',
        '/leaves/balances',
        '/leaves/{id}/decision',
        '/payroll/runs',
        '/payroll/runs/{id}/items',
        '/advances',
        '/deductions',
        '/warnings',
        '/resignations',
        '/webhooks'
      ];

      for (const endpoint of endpoints) {
        expect(openApiSpec.paths).toHaveProperty(endpoint);
      }
    });

    test('All OpenAPI path operations define x-required-scope and describe it in description', () => {
      for (const [pathKey, methods] of Object.entries(openApiSpec.paths)) {
        for (const [method, op] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            expect(op['x-required-scope']).toBeDefined();
            expect(typeof op['x-required-scope']).toBe('string');
            expect(op.description).toContain('Required Scope:');
          }
        }
      }
    });

    test('OpenAPI spec defines all required error codes in components', () => {
      const unauthorizedCodes = openApiSpec.components.responses.Unauthorized.content['application/json'].schema.properties.error.properties.code.enum;
      const expectedCodes = [
        'AUTH_KEY_REQUIRED',
        'INVALID_KEY_FORMAT',
        'INVALID_CREDENTIALS',
        'KEY_REVOKED',
        'KEY_EXPIRED',
        'COMPANY_INACTIVE'
      ];
      for (const code of expectedCodes) {
        expect(unauthorizedCodes).toContain(code);
      }

      expect(openApiSpec.components.responses.Forbidden.content['application/json'].schema.properties.error.properties.code.example).toBe('FORBIDDEN_SCOPE');
      expect(openApiSpec.components.responses.RateLimited.content['application/json'].schema.properties.error.properties.code.example).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('D4: Rate Limiting & Token Bucket Guard', () => {
    test('TokenBucket allows up to capacity and rejects when exhausted', () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 1, maxPerSecond: 10 });
      for (let i = 0; i < 5; i++) {
        const res = bucket.tryConsume();
        expect(res.allowed).toBe(true);
      }

      const rejected = bucket.tryConsume();
      expect(rejected.allowed).toBe(false);
      expect(rejected.retryAfter).toBeGreaterThanOrEqual(1);
    });

    test('TokenBucket enforces 1-second burst ceiling', () => {
      const bucket = new TokenBucket({ capacity: 30, refillRate: 2, maxPerSecond: 3 });
      expect(bucket.tryConsume().allowed).toBe(true);
      expect(bucket.tryConsume().allowed).toBe(true);
      expect(bucket.tryConsume().allowed).toBe(true);

      const burstLimitHit = bucket.tryConsume();
      expect(burstLimitHit.allowed).toBe(false);
      expect(burstLimitHit.retryAfter).toBeGreaterThanOrEqual(1);
    });
  });

  describe('D5: Attribution & Audit Logging Hygiene', () => {
    test('logExternalApiAction does NOT include raw api key', async () => {
      const mockPrisma = {
        activityLog: {
          create: jest.fn().mockResolvedValue({})
        }
      };

      await logExternalApiAction(mockPrisma, {
        companyId: 'comp_123',
        credentialId: 'cred_456',
        credentialName: 'ZKTeco Main Gate',
        action: 'UPSERT_EMPLOYEE',
        targetId: 'emp_789',
        details: { employeeNumber: '101' }
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalled();
      const callArg = mockPrisma.activityLog.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('comp_123');
      expect(callArg.userName).toBe('External Agent: ZKTeco Main Gate');
      expect(callArg.metadata).not.toContain('hrk_');
      expect(callArg.action).toBe('UPSERT_EMPLOYEE');
    });
  });
});
