const {
  evaluateConversationMessages
} = require('../../services/agentInboxFacebookService');

describe('agentInboxFacebookService.evaluateConversationMessages', () => {
  test('flags a Facebook conversation that has no reply after the last customer message', () => {
    const customerMessageAt = new Date(Date.now() - 90 * 60 * 1000);
    const evaluation = evaluateConversationMessages(
      {
        id: 'conversation-1',
        metadata: JSON.stringify({ pageId: 'page-1' })
      },
      [
        {
          id: 'msg-1',
          content: 'السعر كام؟',
          type: 'TEXT',
          isFromCustomer: true,
          isRead: false,
          createdAt: customerMessageAt,
          metadata: '{}'
        }
      ]
    );

    expect(evaluation.status).toBe('needs_reply');
    expect(evaluation.severity).toBe('high');
    expect(evaluation.detectedIntent).toBe('price');
    expect(evaluation.issueCodes).toContain('missing_reply_after_last_customer_message');
  });

  test('flags Facebook send errors stored on the conversation metadata', () => {
    const now = new Date();
    const evaluation = evaluateConversationMessages(
      {
        id: 'conversation-2',
        metadata: JSON.stringify({
          pageId: 'page-1',
          facebookSendError: 'RECIPIENT_NOT_AVAILABLE',
          facebookErrorMessage: 'هذا الشخص غير متاح حالياً',
          notMessageable: true
        })
      },
      [
        {
          id: 'msg-1',
          content: 'عايز اطلب',
          type: 'TEXT',
          isFromCustomer: true,
          isRead: false,
          createdAt: new Date(now.getTime() - 10 * 60 * 1000),
          metadata: '{}'
        },
        {
          id: 'msg-2',
          content: 'حاضر',
          type: 'TEXT',
          isFromCustomer: false,
          isRead: true,
          createdAt: now,
          metadata: '{}'
        }
      ]
    );

    expect(evaluation.status).toBe('send_blocked');
    expect(evaluation.severity).toBe('high');
    expect(evaluation.issueCodes).toContain('RECIPIENT_NOT_AVAILABLE');
    expect(evaluation.facebookDiagnostics.notMessageable).toBe(true);
  });

  test('detects generic replies to specific customer questions', () => {
    const now = new Date();
    const evaluation = evaluateConversationMessages(
      {
        id: 'conversation-3',
        metadata: JSON.stringify({ pageId: 'page-1' })
      },
      [
        {
          id: 'msg-1',
          content: 'الشحن للقاهرة بكام؟',
          type: 'TEXT',
          isFromCustomer: true,
          isRead: false,
          createdAt: new Date(now.getTime() - 3 * 60 * 1000),
          metadata: '{}'
        },
        {
          id: 'msg-2',
          content: 'تمام',
          type: 'TEXT',
          isFromCustomer: false,
          isRead: true,
          createdAt: now,
          metadata: '{}'
        }
      ]
    );

    expect(evaluation.status).toBe('weak_reply');
    expect(evaluation.detectedIntent).toBe('price');
    expect(evaluation.issueCodes).toContain('reply_too_generic_for_detected_intent');
  });
});
