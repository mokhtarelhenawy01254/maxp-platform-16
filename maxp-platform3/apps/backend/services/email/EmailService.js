const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  getStatusLabel(status) {
    const labels = {
      'PENDING': 'قيد الانتظار',
      'CONFIRMED': 'تم التأكيد',
      'PROCESSING': 'جاري التجهيز',
      'SHIPPED': 'تم الشحن',
      'DELIVERED': 'تم التوصيل',
      'SCHEDULED': 'مجدول'
    };
    return labels[status] || status;
  }

  async sendOrderConfirmation(orderData) {
    const { customerEmail, customerName, orderNumber, items, total, status, customerPhone } = orderData;
    const normalizedItems = Array.isArray(items) ? items : [];
    const normalizedTotal = Number(total || 0);

    if (!customerEmail) {
      console.log('[EMAIL] No customer email provided, skipping email notification');
      return { success: false, reason: 'no_email' };
    }

    const itemsHtml = normalizedItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.productColor || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.productSize || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${(item.price * item.quantity).toLocaleString()} ج.م</td>
      </tr>
    `).join('');

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">✅ تم تأكيد طلبك!</h1>
          <p style="margin: 10px 0 0 0;">شكراً لاختيارك متجرنا</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">معلومات الطلب</h2>
            <p><strong>رقم الطلب:</strong> #${orderNumber}</p>
            <p><strong>العميل:</strong> ${customerName}</p>
            <p><strong>رقم الهاتف:</strong> ${customerPhone || '-'}</p>
            <p><strong>تاريخ الطلب:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
            <p><strong>حالة الطلب:</strong> ${this.getStatusLabel(status)}</p>
          </div>

          <h3 style="color: #1f2937;">تفاصيل المنتجات</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: right;">المنتج</th>
                <th style="padding: 10px;">الكمية</th>
                <th style="padding: 10px;">اللون</th>
                <th style="padding: 10px;">المقاس</th>
                <th style="padding: 10px; text-align: left;">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center;">
            <h3 style="margin: 0; color: #059669;">الإجمالي: ${normalizedTotal.toLocaleString()} ج.م</h3>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 10px; text-align: center;">
            <p style="margin: 0; color: #92400e;">💝 شكراً لك على ثقتك بنا! نسعى دائماً لتقديم أفضل خدمة لك</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@store.com',
      to: customerEmail,
      subject: `✅ تأكيد طلبك #${orderNumber}`,
      html: html
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] Order confirmation sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[EMAIL] Failed to send:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
