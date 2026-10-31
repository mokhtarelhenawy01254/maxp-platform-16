class ManualTicketAdapter {
  async listTickets() {
    return { success: false, supported: false, reason: 'MANUAL_PROVIDER' };
  }

  async getTicket() {
    return { success: false, supported: false, reason: 'MANUAL_PROVIDER' };
  }

  async getMessages() {
    return { success: false, supported: false, reason: 'MANUAL_PROVIDER', messages: [] };
  }

  async reply() {
    return { success: false, supported: false, reason: 'MANUAL_PROVIDER' };
  }

  async create() {
    return { success: false, supported: false, reason: 'MANUAL_PROVIDER' };
  }
}

module.exports = new ManualTicketAdapter();
