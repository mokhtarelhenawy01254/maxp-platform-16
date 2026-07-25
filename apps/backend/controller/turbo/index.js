const { getRecords } = require('./recordsHandler');
const { createShipment, bulkCreateShipments, cancelShipment, unlinkShipment, updateShipment, updateShipmentLegacy } = require('./shipmentHandlers');
const { trackShipment, syncShipmentStatus } = require('./trackingHandlers');
const { calculateShippingCost, getShippingComparison } = require('./shippingHandlers');
const { printLabel, printWaybill } = require('./labelHandlers');
const { getGovernments, getAreas, getBranches } = require('./locationHandlers');
const { addTicket, getInquiriesTypes, getTickets, getTicket, getTicketLog, replyToTicket, getUnreadTicketsCount } = require('./ticketHandlers');

module.exports = {
  getRecords,
  createShipment,
  bulkCreateShipments,
  trackShipment,
  syncShipmentStatus,
  calculateShippingCost,
  getShippingComparison,
  cancelShipment,
  unlinkShipment,
  printLabel,
  printWaybill,
  getBranches,
  getGovernments,
  getAreas,
  updateShipment,
  addTicket,
  getInquiriesTypes,
  getTickets,
  getTicket,
  getTicketLog,
  replyToTicket,
  getUnreadTicketsCount
};
