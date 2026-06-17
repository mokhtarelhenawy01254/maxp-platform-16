const express = require('express');
const router = express.Router();
const {
  upload,
  createTicket,
  getUserTickets,
  getTicketDetails,
  addMessage,
  updateTicket,
  updateTicketStatus,
  rateTicket,
  getAllTickets,
  getUserTicketHistory,
  getSupportStaff
} = require('../controller/supportTicketController');

const {
  getFAQs,
  getFAQCategories,
  rateFAQ,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getAllFAQsForAdmin
} = require('../controller/faqController');

const verifyToken = require("../utils/verifyToken");

// Support Ticket Routes
router.post('/tickets', verifyToken.authenticateToken, upload.array('attachments', 5), createTicket);
router.get('/tickets', verifyToken.authenticateToken, getUserTickets);
router.get('/tickets/:ticketId', verifyToken.authenticateToken, getTicketDetails);
router.post('/tickets/:ticketId/messages', verifyToken.authenticateToken, upload.array('attachments', 5), addMessage);
router.patch('/tickets/:ticketId', verifyToken.authenticateToken, updateTicket);
router.patch('/tickets/:ticketId/status', verifyToken.authenticateToken, updateTicketStatus);
router.post('/tickets/:ticketId/rate', verifyToken.authenticateToken, rateTicket);

// Admin Routes for Tickets
router.get('/admin/tickets', verifyToken.authenticateToken, getAllTickets);
router.get('/admin/users/:userId/tickets', verifyToken.authenticateToken, getUserTicketHistory);
router.get('/admin/staff', verifyToken.authenticateToken, getSupportStaff);

// FAQ Routes (Public)
router.get('/faq', getFAQs);
router.get('/faq/categories', getFAQCategories);
router.post('/faq/:faqId/rate', rateFAQ);

// Admin Routes for FAQ
router.post('/admin/faq', verifyToken.authenticateToken, createFAQ);
router.put('/admin/faq/:faqId', verifyToken.authenticateToken, updateFAQ);
router.delete('/admin/faq/:faqId', verifyToken.authenticateToken, deleteFAQ);
router.get('/admin/faq', verifyToken.authenticateToken, getAllFAQsForAdmin);

module.exports = router;
