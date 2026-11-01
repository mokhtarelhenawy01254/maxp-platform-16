const path = require('path');
const PDFDocument = require('pdfkit');
const { shapeArabic } = require('../utils/arabicShaping');

const FONT_PATH = path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf');

const AR = (s) => shapeArabic(String(s ?? ''));

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const fmtMoney = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const TYPE_LABELS = {
  INVOICE: 'فاتورة مبيعات',
  PAYMENT: 'سداد دفعة',
  CREDIT_NOTE: 'إشعار دائن',
  ADJUSTMENT: 'تسوية رصيد',
  DEBIT_NOTE: 'إشعار مدين'
};

/**
 * 📄 إنشاء ملف PDF احترافي لكشف حساب تاجر جملة / موزع
 * @param {Object} statementData البيانات الناتجة من generateStatement
 * @param {Object} [company] بيانات الشركة المصدرة للكشف
 * @returns {Promise<Buffer>} مصفوفة بايتات ملف الـ PDF
 */
function generateStatementPdf(statementData, company = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // تسجيل خط NotoSansArabic لدعم العربية المتصلة
      doc.registerFont('Noto', FONT_PATH);
      doc.font('Noto');

      const pageWidth = doc.page.width - 80; // 515pt
      const tableX = 40;

      // ── 1. ترويسة الشركة ─────────────────────────────────────
      const companyName = company.name || 'الشركة';
      doc.fontSize(18).fillColor('#0f766e').text(AR(companyName), 40, 40, { align: 'right', width: pageWidth });

      const fromStr = fmtDate(statementData.fromDate);
      const toStr = fmtDate(statementData.toDate);
      const todayStr = fmtDate(new Date());

      doc.fontSize(9).fillColor('#64748b').text(
        `${AR('تاريخ الطباعة:')} ${AR(todayStr)}   |   ${AR('الفترة:')} ${AR(fromStr)} ${AR('إلى')} ${AR(toStr)}`,
        40, 68, { align: 'right', width: pageWidth }
      );

      // خط فاصل علوي
      doc.moveTo(40, 88).lineTo(40 + pageWidth, 88).strokeColor('#0f766e').lineWidth(2).stroke();

      // ── 2. عنوان المستند ────────────────────────────────────
      doc.fontSize(14).fillColor('#1e293b').text(AR('كشف حساب تاجر جملة / موزع'), 40, 98, { align: 'center', width: pageWidth });

      // ── 3. بيانات العميل / الموزع ───────────────────────────
      const customerBoxY = 124;
      const customerBoxH = 46;
      doc.rect(tableX, customerBoxY, pageWidth, customerBoxH).fill('#f8fafc').stroke('#e2e8f0');

      doc.fontSize(9).fillColor('#475569');
      doc.text(AR('اسم التاجر / الموزع:'), 48, customerBoxY + 8);
      doc.fontSize(10).fillColor('#0f172a').text(AR(statementData.customerName || 'تاجر جملة'), 160, customerBoxY + 7);

      doc.fontSize(9).fillColor('#475569');
      doc.text(AR('رقم الهاتف:'), 48, customerBoxY + 26);
      doc.fontSize(10).fillColor('#0f172a').text(AR(statementData.customerPhone || '—'), 160, customerBoxY + 25);

      if (statementData.statement?.id) {
        doc.fontSize(8).fillColor('#94a3b8').text(`${AR('رقم الكشف:')} ${AR(statementData.statement.id.slice(-8))}`, 360, customerBoxY + 8, { align: 'right', width: 185 });
      }

      // ── 4. بطاقات ملخص الأرصدة (Summary KPIs) ───────────────
      const kpiY = customerBoxY + customerBoxH + 10;
      const kpiW = (pageWidth - 18) / 4; // 4 cards with 6pt gaps
      const kpiH = 46;

      const kpis = [
        { label: 'الرصيد الافتتاحي', value: fmtMoney(statementData.openingBalance), bg: '#f1f5f9', border: '#cbd5e1', textCol: '#334155' },
        { label: 'إجمالي الفواتير (مدين)', value: fmtMoney(statementData.totalInvoiced), bg: '#fef2f2', border: '#fecaca', textCol: '#dc2626' },
        { label: 'إجمالي المسدد (دائن)', value: fmtMoney(statementData.totalPaid), bg: '#f0fdf4', border: '#bbf7d0', textCol: '#16a34a' },
        { label: 'الرصيد النهائي المستحق', value: fmtMoney(statementData.closingBalance), bg: '#f0fdfa', border: '#99f6e4', textCol: '#0f766e' },
      ];

      kpis.forEach((kpi, idx) => {
        const kx = tableX + idx * (kpiW + 6);
        doc.rect(kx, kpiY, kpiW, kpiH).fill(kpi.bg).stroke(kpi.border);
        doc.fontSize(8).fillColor('#64748b').text(AR(kpi.label), kx + 4, kpiY + 8, { align: 'center', width: kpiW - 8 });
        doc.fontSize(11).fillColor(kpi.textCol).text(`${kpi.value} ${AR('ج.م')}`, kx + 4, kpiY + 24, { align: 'center', width: kpiW - 8 });
      });

      // ── 5. جدول حركات الحساب ────────────────────────────────
      let y = kpiY + kpiH + 16;
      const colW = [80, 75, 80, 130, 50, 50, 50]; // Total = 515pt

      const drawTableHeader = (currY) => {
        doc.rect(tableX, currY, pageWidth, 22).fill('#0f766e').stroke('#0d9488');
        const headers = [
          AR('التاريخ'),
          AR('النوع'),
          AR('المرجع'),
          AR('البيان / الملاحظات'),
          AR('مدين (+)'),
          AR('دائن (-)'),
          AR('الرصيد')
        ];
        let hx = tableX;
        doc.fontSize(8).fillColor('#ffffff');
        headers.forEach((h, i) => {
          doc.text(h, hx + 3, currY + 6, { width: colW[i] - 6, align: i >= 4 ? 'center' : 'right' });
          hx += colW[i];
        });
        return currY + 22;
      };

      y = drawTableHeader(y);

      const lines = Array.isArray(statementData.lines) && statementData.lines.length > 0
        ? statementData.lines
        : (Array.isArray(statementData.transactions) ? statementData.transactions.map((t) => ({
            date: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
            type: t.type,
            reference: t.referenceId || t.id,
            description: t.notes || TYPE_LABELS[t.type] || t.type,
            debit: t.type === 'INVOICE' ? Number(t.amount) : 0,
            credit: t.type === 'PAYMENT' || t.type === 'CREDIT_NOTE' ? Number(t.amount) : 0,
            balance: Number(t.balanceAfter || 0),
          })) : []);

      if (lines.length === 0) {
        doc.rect(tableX, y, pageWidth, 28).fill('#fafafa').stroke('#e2e8f0');
        doc.fontSize(9).fillColor('#94a3b8').text(AR('لا توجد حركات مسجلة خلال الفترة المحددة'), tableX, y + 9, { align: 'center', width: pageWidth });
        y += 28;
      } else {
        lines.forEach((line, index) => {
          if (y + 22 > doc.page.height - 60) {
            doc.addPage();
            doc.font('Noto');
            y = drawTableHeader(40);
          }

          const isAlt = index % 2 === 1;
          const rowH = 20;
          if (isAlt) {
            doc.rect(tableX, y, pageWidth, rowH).fill('#f8fafc');
          }
          doc.rect(tableX, y, pageWidth, rowH).stroke('#f1f5f9');

          const typeName = TYPE_LABELS[line.type] || line.type;
          const debitStr = Number(line.debit) > 0 ? fmtMoney(line.debit) : '—';
          const creditStr = Number(line.credit) > 0 ? fmtMoney(line.credit) : '—';
          const balanceStr = fmtMoney(line.balance);

          const cells = [
            { text: AR(fmtDate(line.date)), align: 'right', color: '#475569' },
            { text: AR(typeName), align: 'right', color: line.type === 'PAYMENT' ? '#16a34a' : line.type === 'INVOICE' ? '#dc2626' : '#2563eb' },
            { text: AR(String(line.reference || '—').slice(-12)), align: 'right', color: '#0f172a' },
            { text: AR(String(line.description || '—').slice(0, 35)), align: 'right', color: '#334155' },
            { text: debitStr, align: 'center', color: Number(line.debit) > 0 ? '#dc2626' : '#94a3b8' },
            { text: creditStr, align: 'center', color: Number(line.credit) > 0 ? '#16a34a' : '#94a3b8' },
            { text: balanceStr, align: 'center', color: '#0f766e' },
          ];

          let cx = tableX;
          doc.fontSize(8);
          cells.forEach((cell, i) => {
            doc.fillColor(cell.color).text(cell.text, cx + 3, y + 5, { width: colW[i] - 6, align: cell.align });
            cx += colW[i];
          });

          y += rowH;
        });
      }

      // ── 6. شريط التوقيع والاعتماد ───────────────────────────
      const signY = Math.min(y + 25, doc.page.height - 95);
      if (signY > doc.page.height - 90) {
        doc.addPage();
        doc.font('Noto');
      }

      const safeSignY = signY > doc.page.height - 90 ? 50 : signY;
      doc.moveTo(40, safeSignY).lineTo(180, safeSignY).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fontSize(8).fillColor('#64748b').text(AR('توقيع المحاسب / الإدارة'), 40, safeSignY + 4, { width: 140, align: 'center' });

      doc.moveTo(pageWidth - 140 + 40, safeSignY).lineTo(40 + pageWidth, safeSignY).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fontSize(8).fillColor('#64748b').text(AR('توقيع وختم المستلم / الموزع'), pageWidth - 140 + 40, safeSignY + 4, { width: 140, align: 'center' });

      // ── 7. تذييل الصفحات برقم الصفحة ─────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#94a3b8').text(
          `${AR('تم استخراج هذا الكشف آلياً بواسطة نظام إدارة التجارة والجملة')} • ${AR('صفحة')} ${i + 1} ${AR('من')} ${range.count}`,
          40,
          doc.page.height - 30,
          { align: 'center', width: pageWidth }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateStatementPdf };
