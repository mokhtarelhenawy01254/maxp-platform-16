function generateWaybillHTML(waybillData) {
  const {
    orderNumber, turboOrderCode, orderDate, receiverName, receiverPhone, receiverPhone2,
    receiverAddress, receiverCity, receiverState, items = [], totalValue, shippingCost,
    amountToCollect, notes
  } = waybillData;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>بوليصة شحن - ${orderNumber}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f5f5f5; }
.waybill { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
.header h1 { color: #2563eb; font-size: 28px; margin-bottom: 10px; }
.order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 6px; }
.info-item { display: flex; flex-direction: column; }
.info-label { font-weight: bold; color: #64748b; font-size: 12px; margin-bottom: 5px; }
.info-value { color: #1e293b; font-size: 16px; }
.section { margin-bottom: 25px; }
.section-title { background: #2563eb; color: white; padding: 10px 15px; border-radius: 4px; margin-bottom: 15px; font-size: 16px; }
.customer-details { padding: 15px; background: #f8fafc; border-radius: 6px; border-right: 4px solid #2563eb; }
.detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-weight: bold; color: #64748b; min-width: 120px; }
.detail-value { color: #1e293b; flex: 1; }
.items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.items-table th { background: #f1f5f9; padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; }
.items-table td { padding: 10px 12px; border: 1px solid #e2e8f0; text-align: right; }
.totals { margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 6px; }
.total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
.total-row.final { border-top: 2px solid #2563eb; border-bottom: none; font-size: 18px; font-weight: bold; color: #2563eb; margin-top: 10px; padding-top: 15px; }
.notes { margin-top: 20px; padding: 15px; background: #fef3c7; border-right: 4px solid #f59e0b; border-radius: 4px; }
.print-btn { display: block; width: 200px; margin: 30px auto 0; padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
.print-btn:hover { background: #1d4ed8; }
@media print { body { background: white; padding: 0; } .waybill { box-shadow: none; } .print-btn { display: none; } }
</style></head>
<body><div class="waybill">
<div class="header"><h1>🚚 بوليصة شحن</h1><p style="color: #64748b; margin-top: 5px;">Turbo Shipping Waybill</p></div>
<div class="order-info">
<div class="info-item"><span class="info-label">رقم الطلب</span><span class="info-value">${orderNumber || 'غير محدد'}</span></div>
<div class="info-item"><span class="info-label">كود الشحنة</span><span class="info-value">${turboOrderCode || 'غير محدد'}</span></div>
<div class="info-item"><span class="info-label">تاريخ الطلب</span><span class="info-value">${orderDate ? new Date(orderDate).toLocaleDateString('ar-EG') : 'غير محدد'}</span></div>
<div class="info-item"><span class="info-label">عدد المنتجات</span><span class="info-value">${items.length} منتج</span></div>
</div>
<div class="section"><div class="section-title">📍 بيانات المستلم</div>
<div class="customer-details">
<div class="detail-row"><span class="detail-label">الاسم:</span><span class="detail-value">${receiverName || 'غير محدد'}</span></div>
<div class="detail-row"><span class="detail-label">الهاتف:</span><span class="detail-value">${receiverPhone || 'غير محدد'}</span></div>
${receiverPhone2 ? `<div class="detail-row"><span class="detail-label">هاتف بديل:</span><span class="detail-value">${receiverPhone2}</span></div>` : ''}
<div class="detail-row"><span class="detail-label">العنوان:</span><span class="detail-value">${receiverAddress || 'غير محدد'}</span></div>
<div class="detail-row"><span class="detail-label">المدينة:</span><span class="detail-value">${receiverCity || 'غير محدد'}</span></div>
<div class="detail-row"><span class="detail-label">المحافظة:</span><span class="detail-value">${receiverState || 'غير محدد'}</span></div>
</div></div>
<div class="section"><div class="section-title">📦 تفاصيل الشحنة</div>
<table class="items-table"><thead><tr><th>المنتج</th><th style="width:80px;">الكمية</th><th style="width:100px;">السعر</th><th style="width:100px;">الإجمالي</th></tr></thead>
<tbody>${items.map(item => `<tr><td>${item.name || 'منتج'}</td><td>${item.quantity || 0}</td><td>${(item.price || 0).toFixed(2)} ج.م</td><td>${(item.total || 0).toFixed(2)} ج.م</td></tr>`).join('')}</tbody>
</table>
<div class="totals">
<div class="total-row"><span>قيمة المنتجات:</span><span>${(totalValue || 0).toFixed(2)} ج.م</span></div>
<div class="total-row"><span>تكلفة الشحن:</span><span>${(shippingCost || 0).toFixed(2)} ج.م</span></div>
<div class="total-row final"><span>المبلغ المستحق:</span><span>${(amountToCollect || 0).toFixed(2)} ج.م</span></div>
</div></div>
${notes ? `<div class="notes"><strong>📝 ملاحظات:</strong><br>${notes}</div>` : ''}
<button class="print-btn" onclick="window.print()">🖨️ طباعة البوليصة</button>
</div></body></html>`;
}

module.exports = { generateWaybillHTML };
