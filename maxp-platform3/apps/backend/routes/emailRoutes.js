const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const EmailService = require('../services/email/EmailService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Send order confirmation via email
router.post('/send-order-confirmation', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderId, email } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const prisma = getSharedPrismaClient();
    
    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Use provided email or order customer email
    const customerEmail = email || order.customer?.email;
    
    if (!customerEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'No email address available for this order' 
      });
    }

    // Send email
    const result = await EmailService.sendOrderConfirmation({
      customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderNumber: order.orderNumber,
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        productColor: item.productColor,
        productSize: item.productSize
      })),
      total: parseFloat(order.total),
      status: order.status
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Order confirmation sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to send email' 
      });
    }

  } catch (error) {
    console.error('[EMAIL-ROUTE] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
