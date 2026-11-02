import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { redactActionParams } from '../redactActionParams';
import { CopilotActionCard } from '../CopilotActionCard';
import type { ActionCardData } from '../types';

describe('redactActionParams unit tests (Task 0bb2afa9)', () => {
  it('strips user_id and preserves order_id', () => {
    const input = { user_id: 'u1', order_id: '#49201' };
    const result = redactActionParams(input);
    expect(result).toEqual({ order_id: '#49201' });
    expect(result.user_id).toBeUndefined();
  });

  it('redacts all sensitive identifier keys ending with id variants', () => {
    const input = {
      user_id: 'u_123',
      userId: 'u_456',
      company_id: 'c_123',
      companyId: 'c_456',
      tenant_id: 't_123',
      tenantId: 't_456',
      session_id: 's_123',
      sessionId: 's_456',
      employee_id: 'emp_123',
      employeeId: 'emp_456',
      member_id: 'm_123',
      memberId: 'm_456',
      product_name: 'Classic T-Shirt',
      price: 250,
      is_active: true,
    };
    const result = redactActionParams(input);
    expect(result).toEqual({
      product_name: 'Classic T-Shirt',
      price: '250',
      is_active: 'true',
    });
  });

  it('handles null, undefined, and empty objects safely', () => {
    expect(redactActionParams(null)).toEqual({});
    expect(redactActionParams(undefined)).toEqual({});
    expect(redactActionParams({})).toEqual({});
  });

  it('preserves nested objects without stringifying them prematurely', () => {
    const input = {
      meta: { nested: true },
      user_id: 'secret_user',
    };
    const result = redactActionParams(input);
    expect(result).toEqual({ meta: { nested: true } });
  });
});

describe('CopilotActionCard parameter redaction (Task 0bb2afa9)', () => {
  const baseCard: ActionCardData = {
    id: 'card_1',
    title: 'تأكيد العملية',
    actionType: 'generic',
    summary: 'إجراء يتطلب الاعتماد',
    parameters: {},
    status: 'pending',
  };

  it('renders parameters with sensitive user_id stripped from text content', () => {
    const card: ActionCardData = {
      ...baseCard,
      parameters: { user_id: 'u1', order_id: '#49201' },
    };

    const { container } = render(
      <CopilotActionCard card={card} onDecision={async () => {}} />
    );

    expect(container.textContent).not.toContain('u1');
    expect(container.textContent).toContain('#49201');
    expect(container.textContent).toContain('order_id:');
  });

  it('renders no parameters container when all parameters are sensitive', () => {
    const card: ActionCardData = {
      ...baseCard,
      parameters: { user_id: 'u1', company_id: 'c1' },
    };

    const { container } = render(
      <CopilotActionCard card={card} onDecision={async () => {}} />
    );

    expect(container.textContent).not.toContain('u1');
    expect(container.textContent).not.toContain('c1');
    expect(container.textContent).not.toContain('{}');
    expect(container.querySelector('.space-y-1\\.5')).toBeNull();
  });
});
