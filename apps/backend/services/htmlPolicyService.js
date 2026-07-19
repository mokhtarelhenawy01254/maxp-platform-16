class HtmlPolicyService {
  async generatePolicyHtml(orderData, options = {}) {
    return this.generatePreparationSlipHtml(orderData, options);
  }

  async generatePreparationSlipHtml(orderData, options = {}) {
    const settings = this.getPreparationSlipSettings(options.slipSettings);
    const pageMetrics = this.getPageMetrics(
      settings.pageSize,
      settings.pageOrientation,
    );
    const accentColor = settings.accentColor;
    const accentSoft = this.mixHexColor(accentColor, "#ffffff", 0.9);
    const accentSurface = this.mixHexColor(accentColor, "#ffffff", 0.95);
    const accentBorder = this.mixHexColor(accentColor, "#cbd5e1", 0.68);
    const accentStrong = this.mixHexColor(accentColor, "#0f172a", 0.18);
    const companyName = settings.showCompanyName
      ? this.normalizeText(options.companyName)
      : "";
    const orderStatus = this.getStatusText(orderData.status);
    const paymentMethod = this.getPaymentMethodText(orderData.paymentMethod);
    const paymentStatus = this.getPaymentStatusText(orderData.paymentStatus);
    const amountToCollect = this.formatMoney(orderData.amountToCollect || 0);
    const displayAddress = this.normalizeText(orderData.customerAddress);
    const displayCity = this.getDisplayCity(
      orderData.city,
      displayAddress,
      orderData.governorate,
    );
    const displayGovernorate = this.getDisplayGovernorate(
      orderData.governorate,
      displayAddress,
    );
    const chips = [{ label: "حالة الطلب", value: orderStatus }]
      .filter(Boolean)
      .map((chip) => {
        return `<div class="chip">${this.escapeHtml(chip.label)}: ${this.escapeHtml(
          chip.value,
        )}</div>`;
      })
      .join("");

    const customerRows = [
      { label: "اسم العميل", value: orderData.customerName || "غير محدد" },
      { label: "رقم الهاتف", value: orderData.customerPhone || "غير محدد" },
      settings.showCustomerEmail
        ? {
            label: "البريد الإلكتروني",
            value: orderData.customerEmail || "غير محدد",
          }
        : null,
      displayCity ? { label: "المدينة", value: displayCity } : null,
      displayAddress
        ? { label: "العنوان", value: displayAddress }
        : null,
    ]
      .filter(Boolean)
      .map((row) => this.renderInfoRow(row.label, row.value))
      .join("");

    const executionRows = [
      settings.showPaymentSummary
        ? {
            label: "المبلغ المطلوب تحصيله",
            value: amountToCollect,
          }
        : null,
      settings.showPaymentSummary
        ? {
            label: "طريقة الدفع",
            value: paymentMethod,
          }
        : null,
      settings.showPaymentSummary
        ? {
            label: "حالة الدفع",
            value: paymentStatus,
          }
        : null,
      !settings.showFinancialSummary
        ? {
            label: "قيمة الشحن",
            value: this.formatMoney(orderData.shippingCost || 0),
          }
        : null,
      !settings.showFinancialSummary
        ? {
            label: "الإجمالي النهائي",
            value: this.formatMoney(orderData.total || 0),
          }
        : null,
      this.normalizeText(settings.preparationInstructions)
        ? {
            label: "تعليمات التجهيز",
            value: settings.preparationInstructions,
          }
        : null,
    ]
      .filter(Boolean)
      .map((row) => this.renderInfoRow(row.label, row.value))
      .join("");

    const itemColumns = this.buildItemColumns(settings, orderData.items || []);
    const itemsTableHead = itemColumns
      .map((column) => {
        const alignClass = column.align === "center" ? ' class="text-center"' : "";
        return `<th${alignClass}>${this.escapeHtml(column.label)}</th>`;
      })
      .join("");
    const itemsRows = this.generateItemsRows(orderData.items || [], itemColumns);

    const summaryBox = settings.showFinancialSummary
      ? `<div class="summary-box">
        <h3>ملخص القيم</h3>
        ${this.renderSummaryRow(
          "المجموع الفرعي",
          this.formatMoney(orderData.subtotal || 0),
        )}
        ${this.renderSummaryRow(
          "الشحن",
          this.formatMoney(orderData.shippingCost || 0),
        )}
        ${this.renderSummaryRow("الضريبة", this.formatMoney(orderData.tax || 0))}
        ${this.renderSummaryRow(
          "الخصم",
          this.formatMoney(orderData.discount || 0),
        )}
        ${this.renderSummaryRow(
          "الإجمالي",
          this.formatMoney(orderData.total || 0),
          "total",
        )}
      </div>`
      : "";

    const collectionBox = settings.showPaymentSummary
      ? `<div class="collection-box">
        <h3>قيمة التحصيل</h3>
        <div class="amount">${this.escapeHtml(amountToCollect)}</div>
        <div>تُستخدم هذه القيمة عند التسليم أو عند تسليم الطلب لشركة الشحن.</div>
      </div>`
      : "";

    const totalsSection =
      summaryBox || collectionBox
        ? `<div class="totals ${summaryBox && collectionBox ? "two-columns" : "single-column"}">
        ${summaryBox}
        ${collectionBox}
      </div>`
        : "";

    const notesHtml =
      settings.showOrderNotes && this.normalizeText(orderData.notes)
        ? `<div class="notes"><strong>ملاحظات الطلب:</strong> ${this.escapeHtml(
            orderData.notes,
          )}</div>`
        : "";

    const executionCard = executionRows
      ? `<div class="card">
        <h2>ملخص التنفيذ</h2>
        ${executionRows}
      </div>`
      : "";

    const footerNote = this.normalizeText(settings.footerNote);
    const documentTitle = this.normalizeText(settings.documentTitle);
    const documentSubtitle = this.normalizeText(settings.documentSubtitle);

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(documentTitle)} - ${this.escapeHtml(
      orderData.orderNumber,
    )}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

    :root {
      --accent: ${accentColor};
      --accent-strong: ${accentStrong};
      --accent-soft: ${accentSoft};
      --accent-surface: ${accentSurface};
      --accent-border: ${accentBorder};
      --page-width: ${pageMetrics.width};
      --page-height: ${pageMetrics.height};
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Cairo', Arial, sans-serif;
      background: var(--accent-soft);
      color: #172554;
    }

    .page {
      width: var(--page-width);
      min-height: var(--page-height);
      margin: 0 auto;
      background: #ffffff;
      padding: 16mm;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 3px solid var(--accent);
    }

    .header-block h1 {
      margin: 0 0 6px;
      font-size: 30px;
      color: var(--accent-strong);
      line-height: 1.2;
    }

    .company-name {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: 0.02em;
    }

    .header-block p {
      margin: 0;
      color: #475569;
      font-size: 14px;
    }

    .meta-card {
      min-width: 250px;
      border: 1px solid var(--accent-border);
      border-radius: 16px;
      padding: 14px 16px;
      background: linear-gradient(180deg, var(--accent-soft) 0%, #ffffff 100%);
    }

    .meta-card .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .meta-card .row:last-child {
      margin-bottom: 0;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }

    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid var(--accent-border);
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .grid {
      display: grid;
      grid-template-columns: ${executionCard ? "1.15fr 0.85fr" : "1fr"};
      gap: 16px;
      margin-bottom: 18px;
    }

    .card {
      border: 1px solid var(--accent-border);
      border-radius: 18px;
      padding: 16px;
      background: var(--accent-surface);
    }

    .card h2 {
      margin: 0 0 12px;
      font-size: 17px;
      color: var(--accent-strong);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px dashed var(--accent-border);
      font-size: 14px;
    }

    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .info-label {
      color: #475569;
      font-weight: 600;
      white-space: nowrap;
    }

    .info-value {
      text-align: left;
      font-weight: 700;
      color: #0f172a;
      white-space: pre-line;
    }

    .notes {
      margin-top: 12px;
      padding: 12px;
      border-radius: 14px;
      background: #ffffff;
      border: 1px dashed var(--accent-border);
      font-size: 13px;
      color: #334155;
    }

    .table-card {
      border: 1px solid var(--accent-border);
      border-radius: 18px;
      overflow: hidden;
      margin-bottom: 18px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: var(--accent);
      color: #ffffff;
    }

    th,
    td {
      padding: 12px 10px;
      text-align: right;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }

    .text-center {
      text-align: center;
    }

    tbody tr:nth-child(even) {
      background: #f8fbff;
    }

    .bundle-summary-row td {
      background: #ecfdf5;
      border-bottom: 1px solid #bbf7d0;
      font-weight: 700;
    }

    .bundle-item-row td:first-child {
      padding-right: 24px;
    }

    .totals {
      display: grid;
      gap: 16px;
      align-items: start;
    }

    .totals.two-columns {
      grid-template-columns: 1fr 280px;
    }

    .totals.single-column {
      grid-template-columns: 1fr;
    }

    .summary-box {
      border: 1px solid var(--accent-border);
      border-radius: 18px;
      padding: 16px;
      background: var(--accent-surface);
    }

    .summary-box h3 {
      margin: 0 0 12px;
      font-size: 16px;
      color: var(--accent-strong);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px dashed var(--accent-border);
      font-size: 14px;
    }

    .summary-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .summary-row.total {
      margin-top: 6px;
      padding-top: 12px;
      border-top: 2px solid var(--accent-border);
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .collection-box {
      border-radius: 18px;
      padding: 18px;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
      color: #ffffff;
    }

    .collection-box h3 {
      margin: 0 0 10px;
      font-size: 16px;
    }

    .collection-box .amount {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      color: #64748b;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .footer span {
      max-width: 50%;
    }

    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff;
      }

      .page {
        width: 100%;
        min-height: auto;
        padding: 12mm;
      }

      @page {
        size: ${settings.pageSize} ${settings.pageOrientation};
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-block">
        ${companyName ? `<p class="company-name">${this.escapeHtml(companyName)}</p>` : ""}
        <h1>${this.escapeHtml(documentTitle)}</h1>
        <p>${this.escapeHtml(documentSubtitle)}</p>
      </div>

      <div class="meta-card">
        <div class="row">
          <span>رقم الطلب</span>
          <strong>#${this.escapeHtml(orderData.orderNumber || "غير محدد")}</strong>
        </div>
        <div class="row">
          <span>تاريخ الطلب</span>
          <strong>${this.escapeHtml(this.formatDate(orderData.createdAt))}</strong>
        </div>
        <div class="row">
          <span>وقت الطباعة</span>
          <strong>${this.escapeHtml(this.formatDateTime(orderData.printedAt))}</strong>
        </div>
        <div class="row">
          <span>عدد القطع</span>
          <strong>${this.escapeHtml(String(orderData.itemsCount || 0))}</strong>
        </div>
      </div>
    </div>

    ${chips ? `<div class="chips">${chips}</div>` : ""}

    <div class="grid">
      <div class="card">
        <h2>بيانات العميل والشحن</h2>
        ${customerRows}
        ${notesHtml}
      </div>
      ${executionCard}
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            ${itemsTableHead}
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    ${totalsSection}

    <div class="footer">
      <span>${this.escapeHtml(
        footerNote || "تم إنشاء هذا المستند تلقائياً من إدارة الطلبات.",
      )}</span>
      <span>يناسب التجهيز الداخلي ولا يغني عن بوليصة شركة الشحن.</span>
    </div>
  </div>
</body>
</html>`;
  }

  getPreparationSlipSettings(rawSettings) {
    const defaults = this.getDefaultPreparationSlipSettings();
    const safeSettings =
      rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)
        ? rawSettings
        : {};

    return {
      ...defaults,
      ...safeSettings,
      documentTitle: this.normalizeText(safeSettings.documentTitle) || defaults.documentTitle,
      documentSubtitle:
        this.normalizeText(safeSettings.documentSubtitle) ||
        defaults.documentSubtitle,
      accentColor: this.sanitizeHexColor(
        safeSettings.accentColor,
        defaults.accentColor,
      ),
      pageSize: ["A4", "A5"].includes(safeSettings.pageSize)
        ? safeSettings.pageSize
        : defaults.pageSize,
      pageOrientation:
        safeSettings.pageOrientation === "landscape"
          ? "landscape"
          : defaults.pageOrientation,
      preparationInstructions:
        this.normalizeText(safeSettings.preparationInstructions) ||
        defaults.preparationInstructions,
      footerNote:
        this.normalizeText(safeSettings.footerNote) || defaults.footerNote,
      showCompanyName:
        typeof safeSettings.showCompanyName === "boolean"
          ? safeSettings.showCompanyName
          : defaults.showCompanyName,
      showCustomerEmail:
        typeof safeSettings.showCustomerEmail === "boolean"
          ? safeSettings.showCustomerEmail
          : defaults.showCustomerEmail,
      showOrderNotes:
        typeof safeSettings.showOrderNotes === "boolean"
          ? safeSettings.showOrderNotes
          : defaults.showOrderNotes,
      showPaymentSummary:
        typeof safeSettings.showPaymentSummary === "boolean"
          ? safeSettings.showPaymentSummary
          : defaults.showPaymentSummary,
      showFinancialSummary:
        typeof safeSettings.showFinancialSummary === "boolean"
          ? safeSettings.showFinancialSummary
          : defaults.showFinancialSummary,
      showItemSku:
        typeof safeSettings.showItemSku === "boolean"
          ? safeSettings.showItemSku
          : defaults.showItemSku,
      showItemDetails:
        typeof safeSettings.showItemDetails === "boolean"
          ? safeSettings.showItemDetails
          : defaults.showItemDetails,
      showItemColor:
        typeof safeSettings.showItemColor === "boolean"
          ? safeSettings.showItemColor
          : defaults.showItemColor,
      showItemSize:
        typeof safeSettings.showItemSize === "boolean"
          ? safeSettings.showItemSize
          : defaults.showItemSize,
      showItemPrice:
        typeof safeSettings.showItemPrice === "boolean"
          ? safeSettings.showItemPrice
          : defaults.showItemPrice,
      showItemTotal:
        typeof safeSettings.showItemTotal === "boolean"
          ? safeSettings.showItemTotal
          : defaults.showItemTotal,
    };
  }

  getDefaultPreparationSlipSettings() {
    return {
      documentTitle: "ورقة التجهيز",
      documentSubtitle:
        "مستند داخلي لفريق المخزن والتغليف قبل التسليم لشركة الشحن",
      accentColor: "#2563eb",
      pageSize: "A4",
      pageOrientation: "portrait",
      showCompanyName: true,
      showCustomerEmail: false,
      showOrderNotes: true,
      showPaymentSummary: true,
      showFinancialSummary: true,
      showItemSku: true,
      showItemDetails: true,
      showItemColor: true,
      showItemSize: true,
      showItemPrice: true,
      showItemTotal: true,
      preparationInstructions: "راجع الكمية والمقاس واللون قبل التسليم.",
      footerNote: "تم إنشاء هذا المستند تلقائياً من إدارة الطلبات.",
    };
  }

  buildItemColumns(settings, items = []) {
    const columns = [
      {
        key: "product",
        label: "المنتج",
        render: (item) => this.escapeHtml(item.productName || "منتج غير محدد"),
      },
    ];

    const hasSkuOrDetails = items.some((item) =>
      this.hasMeaningfulValue(settings.showItemSku ? item?.sku : "") ||
      this.hasMeaningfulValue(settings.showItemDetails ? item?.details : ""),
    );

    if ((settings.showItemSku || settings.showItemDetails) && hasSkuOrDetails) {
      columns.push({
        key: "skuDetails",
        label:
          settings.showItemSku && settings.showItemDetails
            ? "SKU / التفاصيل"
            : settings.showItemSku
              ? "SKU"
              : "التفاصيل",
        render: (item) =>
          this.renderMultiLineValue([
            settings.showItemSku ? item.sku : "",
            settings.showItemDetails ? item.details : "",
          ]),
      });
    }

    const hasColor = items.some((item) =>
      this.hasMeaningfulValue(item?.color),
    );

    if (settings.showItemColor && hasColor) {
      columns.push({
        key: "color",
        label: "اللون",
        render: (item) => this.escapeHtml(item.color || "-"),
      });
    }

    const hasSize = items.some((item) =>
      this.hasMeaningfulValue(item?.size),
    );

    if (settings.showItemSize && hasSize) {
      columns.push({
        key: "size",
        label: "المقاس",
        render: (item) => this.escapeHtml(item.size || "-"),
      });
    }

    columns.push({
      key: "quantity",
      label: "الكمية",
      align: "center",
      render: (item) => this.escapeHtml(String(item.quantity || 0)),
    });

    if (settings.showItemPrice) {
      columns.push({
        key: "price",
        label: "السعر",
        render: (item) => this.escapeHtml(this.formatMoney(item.price || 0)),
      });
    }

    if (settings.showItemTotal) {
      columns.push({
        key: "total",
        label: "الإجمالي",
        render: (item) => this.escapeHtml(this.formatMoney(item.total || 0)),
      });
    }

    return columns;
  }

  getItemMetadataObject(metadata) {
    if (!metadata) {
      return {};
    }

    if (typeof metadata === "string") {
      return safeParseJson(metadata, {});
    }

    return typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  }

  getItemQuantityOffer(item) {
    if (item?.quantityOffer && typeof item.quantityOffer === "object") {
      return item.quantityOffer;
    }

    const metadata = this.getItemMetadataObject(item?.metadata);
    if (metadata.quantityOffer && typeof metadata.quantityOffer === "object") {
      return metadata.quantityOffer;
    }

    return null;
  }

  getResolvedItemTotal(item) {
    const explicitTotal = Number(item?.total || 0);
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
      return explicitTotal;
    }

    return Number(item?.price || 0) * Number(item?.quantity || 0);
  }

  groupQuantityOfferItems(items = []) {
    const singles = [];
    const groups = new Map();

    items.forEach((item) => {
      const quantityOffer = this.getItemQuantityOffer(item);

      if (!quantityOffer?.groupId) {
        singles.push(item);
        return;
      }

      const metadata = this.getItemMetadataObject(item?.metadata);
      const offerQuantity = Number(quantityOffer.offerQuantity);
      const slotIndex = Number(quantityOffer.slotIndex);
      const existingGroup = groups.get(quantityOffer.groupId);
      const nextGroup =
        existingGroup ||
        {
          groupId: quantityOffer.groupId,
          offerLabel:
            this.normalizeText(quantityOffer.offerLabel) ||
            this.normalizeText(metadata.attributeValues?.["عرض الكمية"]) ||
            "عرض كميات",
          offerQuantity:
            Number.isFinite(offerQuantity) && offerQuantity > 0
              ? offerQuantity
              : Math.max(1, Number(item?.quantity || 1)),
          freeShipping: Boolean(quantityOffer.freeShipping),
          total: 0,
          selectedPieces: 0,
          items: [],
        };

      nextGroup.total += this.getResolvedItemTotal(item);
      nextGroup.selectedPieces += Math.max(0, Number(item?.quantity || 0));
      nextGroup.freeShipping = nextGroup.freeShipping || Boolean(quantityOffer.freeShipping);
      nextGroup.items.push({
        item,
        slotIndex:
          Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : null,
      });

      if (!existingGroup) {
        groups.set(quantityOffer.groupId, nextGroup);
      }
    });

    return {
      groups: Array.from(groups.values()).map((group) => ({
        ...group,
        total: Number(group.total.toFixed(2)),
        items: [...group.items].sort((left, right) => {
          const leftSlot = left.slotIndex ?? Number.MAX_SAFE_INTEGER;
          const rightSlot = right.slotIndex ?? Number.MAX_SAFE_INTEGER;
          return leftSlot - rightSlot;
        }),
      })),
      singles,
    };
  }

  generateItemsRows(items, columns) {
    if (!items || items.length === 0) {
      return `<tr><td colspan="${columns.length}">لا توجد منتجات في هذا الطلب</td></tr>`;
    }

    const groupedItems = this.groupQuantityOfferItems(items);
    const singleRows = groupedItems.singles.map((item) => {
      const cells = columns
        .map((column) => {
          const alignClass = column.align === "center" ? ' class="text-center"' : "";
          return `<td${alignClass}>${column.render(item)}</td>`;
        })
        .join("");

      return `<tr>${cells}</tr>`;
    });

    const groupRows = groupedItems.groups.flatMap((group) => {
      const summaryCells = columns
        .map((column) => {
          const alignClass = column.align === "center" ? ' class="text-center"' : "";

          if (column.key === "product") {
            return `<td${alignClass}>
              <div class="item-name">عرض كميات: ${this.escapeHtml(group.offerLabel)}</div>
              <div class="item-meta">${this.escapeHtml(
                `${group.selectedPieces}/${group.offerQuantity || group.selectedPieces} قطع${group.freeShipping ? " | شحن مجاني" : ""}`,
              )}</div>
            </td>`;
          }

          if (column.key === "quantity") {
            return `<td${alignClass}>${this.escapeHtml(
              String(group.offerQuantity || group.selectedPieces),
            )}</td>`;
          }

          if (column.key === "total") {
            return `<td${alignClass}>${this.escapeHtml(
              this.formatMoney(group.total),
            )}</td>`;
          }

          return `<td${alignClass}>-</td>`;
        })
        .join("");

      const itemRows = group.items.map(({ item, slotIndex }, itemIndex) => {
        const itemCells = columns
          .map((column) => {
            const alignClass = column.align === "center" ? ' class="text-center"' : "";

            if (column.key === "product") {
              return `<td${alignClass}>${this.escapeHtml(
                `القطعة ${slotIndex || itemIndex + 1} - ${item.productName || "منتج غير محدد"}`,
              )}</td>`;
            }

            return `<td${alignClass}>${column.render(item)}</td>`;
          })
          .join("");

        return `<tr class="bundle-item-row">${itemCells}</tr>`;
      });

      return [`<tr class="bundle-summary-row">${summaryCells}</tr>`, ...itemRows];
    });

    return [...groupRows, ...singleRows].join("");
  }

  getPageMetrics(pageSize, pageOrientation) {
    const sizes = {
      A4: { width: 210, height: 297 },
      A5: { width: 148, height: 210 },
    };
    const baseSize = sizes[pageSize] || sizes.A4;
    const width =
      pageOrientation === "landscape" ? baseSize.height : baseSize.width;
    const height =
      pageOrientation === "landscape" ? baseSize.width : baseSize.height;

    return {
      width: `${width}mm`,
      height: `${height}mm`,
    };
  }

  renderInfoRow(label, value) {
    return `<div class="info-row">
      <span class="info-label">${this.escapeHtml(label)}</span>
      <span class="info-value">${this.escapeHtml(value)}</span>
    </div>`;
  }

  renderSummaryRow(label, value, extraClass = "") {
    const className = extraClass ? `summary-row ${extraClass}` : "summary-row";
    return `<div class="${className}">
      <span>${this.escapeHtml(label)}</span>
      <strong>${this.escapeHtml(value)}</strong>
    </div>`;
  }

  renderMultiLineValue(values) {
    const normalizedValues = values
      .map((value) => this.normalizeText(value))
      .filter(Boolean);

    if (normalizedValues.length === 0) {
      return "-";
    }

    return normalizedValues.map((value) => this.escapeHtml(value)).join("<br />");
  }

  hasMeaningfulValue(value) {
    const normalized = this.normalizeText(value);
    return Boolean(normalized && normalized !== "-" && normalized !== "غير محدد");
  }

  getComparableText(value) {
    return this.normalizeText(value).replace(/\s+/g, " ").toLowerCase();
  }

  containsComparableText(haystack, needle) {
    const normalizedHaystack = this.getComparableText(haystack);
    const normalizedNeedle = this.getComparableText(needle);

    if (!normalizedHaystack || !normalizedNeedle) {
      return false;
    }

    return normalizedHaystack.includes(normalizedNeedle);
  }

  getDisplayCity(city, address, governorate) {
    const normalizedCity = this.normalizeText(city);

    if (!this.hasMeaningfulValue(normalizedCity)) {
      return "";
    }

    if (
      this.getComparableText(normalizedCity) === this.getComparableText(governorate) ||
      this.containsComparableText(address, normalizedCity)
    ) {
      return "";
    }

    return normalizedCity;
  }

  getDisplayGovernorate(governorate, address) {
    const normalizedGovernorate = this.normalizeText(governorate);

    if (!this.hasMeaningfulValue(normalizedGovernorate)) {
      return "";
    }

    return normalizedGovernorate;
  }

  formatDate(dateValue) {
    if (!dateValue) {
      return "غير محدد";
    }

    try {
      return new Date(dateValue).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "غير محدد";
    }
  }

  formatDateTime(dateValue) {
    if (!dateValue) {
      return "غير محدد";
    }

    try {
      return new Date(dateValue).toLocaleString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "غير محدد";
    }
  }

  formatMoney(value) {
    return (
      new Intl.NumberFormat("ar-EG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value || 0)) + " ج.م"
    );
  }

  getStatusText(status) {
    const statusMap = {
      PENDING: "قيد الانتظار",
      CONFIRMED: "مؤكد",
      PROCESSING: "قيد التجهيز",
      PREPARING: "قيد التجهيز",
      QUALITY_CHECK: "فحص الجودة",
      PACKAGED: "تم التغليف",
      READY_TO_SHIP: "جاهز للشحن",
      SHIPPED: "تم الشحن",
      DELIVERED: "تم التوصيل",
      CANCELLED: "ملغي",
      DUPLICATE_ORDER: "طلب مكرر",
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      processing: "قيد التجهيز",
      preparing: "قيد التجهيز",
      quality_check: "فحص الجودة",
      packaged: "تم التغليف",
      ready_to_ship: "جاهز للشحن",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };

    return statusMap[status] || status || "غير محدد";
  }

  getPaymentMethodText(method) {
    const paymentMethodMap = {
      CASH: "نقداً عند الاستلام",
      CASH_ON_DELIVERY: "نقداً عند الاستلام",
      COD: "نقداً عند الاستلام",
      ONLINE: "دفع إلكتروني",
      CREDIT_CARD: "بطاقة ائتمان",
      BANK_TRANSFER: "تحويل بنكي",
      WALLET: "محفظة إلكترونية",
      cash: "نقداً عند الاستلام",
      cash_on_delivery: "نقداً عند الاستلام",
      cod: "نقداً عند الاستلام",
      online: "دفع إلكتروني",
      credit_card: "بطاقة ائتمان",
      bank_transfer: "تحويل بنكي",
      wallet: "محفظة إلكترونية",
    };

    return paymentMethodMap[method] || method || "غير محدد";
  }

  getPaymentStatusText(status) {
    const paymentStatusMap = {
      PENDING: "قيد الانتظار",
      COMPLETED: "مدفوع",
      PAID: "مدفوع",
      FAILED: "فشل الدفع",
      CANCELLED: "ملغي",
      REFUNDED: "مسترد",
      pending: "قيد الانتظار",
      completed: "مدفوع",
      paid: "مدفوع",
      failed: "فشل الدفع",
      cancelled: "ملغي",
      refunded: "مسترد",
    };

    return paymentStatusMap[status] || status || "غير محدد";
  }

  normalizeText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  sanitizeHexColor(value, fallback) {
    const normalized = this.normalizeText(value);
    const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

    if (!hexPattern.test(normalized)) {
      return fallback;
    }

    if (normalized.length === 4) {
      return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`.toLowerCase();
    }

    return normalized.toLowerCase();
  }

  mixHexColor(baseColor, mixWithColor, weight) {
    const base = this.hexToRgb(baseColor);
    const mixWith = this.hexToRgb(mixWithColor);

    if (!base || !mixWith) {
      return baseColor;
    }

    const clampWeight = Math.min(Math.max(Number(weight) || 0, 0), 1);
    const mixedColor = {
      r: Math.round(base.r * (1 - clampWeight) + mixWith.r * clampWeight),
      g: Math.round(base.g * (1 - clampWeight) + mixWith.g * clampWeight),
      b: Math.round(base.b * (1 - clampWeight) + mixWith.b * clampWeight),
    };

    return this.rgbToHex(mixedColor.r, mixedColor.g, mixedColor.b);
  }

  hexToRgb(hexColor) {
    const sanitized = this.sanitizeHexColor(hexColor, "");

    if (!sanitized) {
      return null;
    }

    return {
      r: parseInt(sanitized.slice(1, 3), 16),
      g: parseInt(sanitized.slice(3, 5), 16),
      b: parseInt(sanitized.slice(5, 7), 16),
    };
  }

  rgbToHex(red, green, blue) {
    const toHex = (value) => value.toString(16).padStart(2, "0");
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

module.exports = HtmlPolicyService;
