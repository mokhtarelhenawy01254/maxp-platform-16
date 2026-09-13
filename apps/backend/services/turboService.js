/**
 * Turbo Shipping Service — Facade
 * يجمع كل خدمات Turbo تحت واجهة واحدة
 * Tue, 11 Feb 2025 23:11:51 +0200
 */

const TurboApiClient = require('./turbo/apiClient');
const ShipmentService = require('./turbo/shipmentService');
const TrackingService = require('./turbo/trackingService');
const LocationService = require('./turbo/locationService');
const LabelService = require('./turbo/labelService');
const TicketService = require('./turbo/ticketService');
const MessageService = require('./turbo/messageService');
const { handleError } = require('../utils/turbo/errorHandler');

class TurboService {
  constructor(apiKey = null, companyId = null) {
    this._client = new TurboApiClient(apiKey, companyId);
    this._shipment = new ShipmentService(this._client);
    this._tracking = new TrackingService(this._client, companyId);
    this._location = new LocationService(this._client);
    this._label = new LabelService(this._client);
    this._ticket = new TicketService(this._client);
    this._message = new MessageService(this._client);

    // Backward compatibility for tests that spy on these
    this.apiKey = apiKey;
    this.companyId = companyId;
    this.baseUrl = process.env.TURBO_API_URL || 'https://backoffice.turbo-eg.com/external-api';
    this.timeout = 30000;
  }

  // ── API Client ──────────────────────────────────────────
  async getApiKey() { return this._client.getApiKey(); }
  async getHeaders(a, b) { return this._client.getHeaders(a, b); }
  async getMainClientCode() { return this._client.getMainClientCode(); }
  async getSenderNumber() { return this._client.getSenderNumber(); }

  // ── Address (via utils) ─────────────────────────────────
  cleanLocationName(l) { return require('../utils/turbo/addressParser').cleanLocationName(l); }
  parseShippingAddress(s) { return require('../utils/turbo/addressParser').parseShippingAddress(s); }
  getShippingAddressFields(s) { return require('../utils/turbo/addressParser').getShippingAddressFields(s); }
  getAddressCompletenessScore(f) { return require('../utils/turbo/addressParser').getAddressCompletenessScore(f); }
  getBestShippingAddressFields(...a) { return require('../utils/turbo/addressParser').getBestShippingAddressFields(...a); }
  extractCleanStreetAddress(a, b, c) { return require('../utils/turbo/addressParser').extractCleanStreetAddress(a, b, c); }

  // ── Governorate (via utils) ─────────────────────────────
  getTurboGovernorateName(g) { return require('../utils/turbo/governorateMapper').getTurboGovernorateName(g); }
  findGovernmentByCity(c, g) { return require('../utils/turbo/governorateMapper').findGovernmentByCity(c, g); }

  // ── Error Handling (via utils) ────────────────────────
  translateTurboErrorToArabic(m) { return require('../utils/turbo/errorHandler').translateTurboErrorToArabic(m); }
  isTurboConfigurationError(e) { return require('../utils/turbo/errorHandler').isTurboConfigurationError(e); }
  isShipmentNotFoundError(m) { return require('../utils/turbo/errorHandler').isShipmentNotFoundError(m); }
  getTurboErrorMessage(e) { return require('../utils/turbo/errorHandler').getTurboErrorMessage(e); }
  handleError(e, o) { return handleError(e, o); }

  // ── Order Formatting (via utils) ───────────────────────
  getNumericInvoiceNumber(o, f) { return require('../utils/turbo/orderFormatter').getNumericInvoiceNumber(o, f); }
  normalizeShipmentSearchKeys(s) { return require('../utils/turbo/orderFormatter').normalizeShipmentSearchKeys(s); }
  calculateTotalWeight(i) { return require('../utils/turbo/orderFormatter').calculateTotalWeight(i); }
  formatOrderForTurbo(o, c, i) { return require('../utils/turbo/orderFormatter').formatOrderForTurbo(o, c, i); }

  // ── Shipment Operations ─────────────────────────────────
  async createShipment(d) { return this._shipment.createShipment(d); }
  async cancelShipment(i, r) { return this._shipment.cancelShipment(i, r); }
  async updateShipment(i, d) { return this._shipment.updateShipment(i, d); }

  // ── Tracking ──────────────────────────────────────────
  async trackShipment(t) { return this._tracking.trackShipment(t); }
  async getShipmentStatus(i) { return this._tracking.getShipmentStatus(i); }
  async fetchAllStatuses(f, t) { return this._tracking.fetchAllStatuses(f, t); }

  // ── Locations ──────────────────────────────────────────
  async getGovernments() { return this._location.getGovernments(); }
  async getAreas(g) { return this._location.getAreas(g); }
  async getBranches(c, g) { return this._location.getBranches(c, g); }
  async searchAreaByText(t, o) { return this._location.searchAreaByText(t, o); }

  // ── Labels ────────────────────────────────────────────
  async printLabel(i) { return this._label.printLabel(i); }
  async printWaybill(i, d) { return this._label.printWaybill(i, d); }
  generateLocalWaybill(o, i) { return this._label.generateLocalWaybill(o, i); }

  // ── Tickets ──────────────────────────────────────────
  async addTicket(...a) { return this._ticket.addTicket(...a); }
  async getInquiriesTypes() { return this._ticket.getInquiriesTypes(); }
  async getTickets(p, pp) { return this._ticket.getTickets(p, pp); }
  async getTicket(i) { return this._ticket.getTicket(i); }
  async getTicketLog(i) { return this._ticket.getTicketLog(i); }
  async replyToTicket(...a) { return this._ticket.replyToTicket(...a); }
  async getUnreadTicketsCount() { return this._ticket.getUnreadTicketsCount(); }

  // ── Shipping Cost ─────────────────────────────────────
  async calculateShippingCost(a, w, d) { return this._shipment.calculateShippingCost(a, w, d); }

  // ── Shipment Messages & Requests ──────────────────────
  async resendRequest(shipmentId) { return this._message.resendRequest(shipmentId); }
  async cancelRequest(shipmentId) { return this._message.cancelRequest(shipmentId); }
  async getConversations(options) { return this._message.getConversations(options); }
  async getShipmentMessages(shipmentCode) { return this._message.getShipmentMessages(shipmentCode); }
  async sendShipmentMessage(shipmentCode, messageText) { return this._message.sendShipmentMessage(shipmentCode, messageText); }
}

module.exports = TurboService;
