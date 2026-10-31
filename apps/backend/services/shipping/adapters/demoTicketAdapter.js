class DemoTicketAdapter {
  constructor() {
    this._replyCounter = 1;
  }

  async listTickets({ companyId, code = 'QA-SHIP-001' } = {}) {
    const fixedCode = code || 'QA-SHIP-001';
    return {
      success: true,
      tickets: [
        {
          id: 'demo-ticket-001',
          code: fixedCode,
          externalId: 'demo-ticket-001',
          subject: 'استفسار عن عنوان الشحنة ورقم هاتف العميل',
          status: 'OPEN',
          priority: 'medium',
          unreadCount: 2,
          lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      ],
      pagination: {
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
      },
    };
  }

  async getTicket({ companyId, ticketId = 'demo-ticket-001' } = {}) {
    return {
      success: true,
      ticket: {
        id: ticketId || 'demo-ticket-001',
        externalId: ticketId || 'demo-ticket-001',
        code: 'QA-SHIP-001',
        subject: 'استفسار عن عنوان الشحنة ورقم هاتف العميل',
        status: 'OPEN',
        priority: 'medium',
        content: 'المندوب حاول التسليم ولم يتم الرد. نرجو تأكيد العنوان وموعد التسليم ورقم الهاتف.',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    };
  }

  async getMessages({ companyId, ticketId = 'demo-ticket-001' } = {}) {
    const now = Date.now();
    return {
      success: true,
      messages: [
        {
          externalId: 'demo-msg-001',
          body: 'برجاء تأكيد رقم هاتف العميل وموعد التسليم المفضل وتفاصيل العنوان للتسليم غداً.',
          direction: 'INBOUND',
          authorName: 'خدمة عملاء شركة الشحن (DEMO)',
          sentAt: new Date(now - 15 * 60 * 1000),
        },
        {
          externalId: 'demo-msg-002',
          body: 'تذكير: لم يتم تأكيد العنوان وموعد التسليم من قبلكم حتى الآن، الشحنة معلقة في الفرع.',
          direction: 'INBOUND',
          authorName: 'مندوب الشحن (DEMO)',
          sentAt: new Date(now - 5 * 60 * 1000),
        },
      ],
    };
  }

  async reply({ companyId, ticketId, message } = {}) {
    const seq = this._replyCounter++;
    return {
      success: true,
      ticketId: ticketId || 'demo-ticket-001',
      externalId: `demo-msg-${seq}`,
      message: 'تم إرسال الرد بنجاح (DEMO)',
      sentAt: new Date(),
    };
  }

  async create({ companyId, content, code = 'QA-SHIP-001' } = {}) {
    return {
      success: true,
      ticketId: 'demo-ticket-001',
      code: code || 'QA-SHIP-001',
      message: 'تم إنشاء تذكرة شحن تجريبية بنجاح (DEMO)',
    };
  }
}

module.exports = new DemoTicketAdapter();
