import React from "react";

/**
 * شاشات حقيقية مبنيّة بـHTML بحجمها الطبيعي ، من جوه المنصة (تُكبَّر 300–400% في القسم).
 * كل جذر عليه data-ui عشان قواعد الاتجاه تعتبره واجهة منتج لا عنصر تصميم.
 * الأرقام هنا مثال تشغيلي (مذكورة في التقرير)، والأسماء والحالات من شاشات المنصة.
 */

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="md-ui-row">{children}</div>
);

export const MdFragment: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case "confirm":
      return (
        <div className="md-ui" data-ui="order-confirm" style={{ width: 300 }}>
          <Row>
            <span className="md-ui-strong">أوردر جديد</span>
            <span className="md-ui-chip">مؤكد</span>
          </Row>
          <Row>
            <span className="md-muted">كوتشي أسود · مقاس 43</span>
            <span className="md-num md-ui-strong">850</span>
          </Row>
        </div>
      );
    case "waybill":
      return (
        <div className="md-ui" data-ui="waybill" style={{ width: 280 }}>
          <Row>
            <span className="md-ui-strong">بوسطة</span>
            <span className="md-num md-ui-strong">BST-892401</span>
          </Row>
          <Row>
            <span className="md-muted">استُلمت من المخزن</span>
            <span className="md-ui-chip">خارج للتسليم</span>
          </Row>
        </div>
      );
    case "stock":
      return (
        <div className="md-ui" data-ui="stock-matrix" style={{ width: 240 }}>
          <Row>
            <span className="md-ui-strong">مقاس 43</span>
            <span className="md-num md-ui-strong">12</span>
          </Row>
          <Row>
            <span className="md-muted">مقاس 44</span>
            <span className="md-num md-muted">0</span>
          </Row>
        </div>
      );
    case "reorder":
      return (
        <div className="md-ui" data-ui="reorder-point" style={{ width: 250 }}>
          <Row>
            <span className="md-ui-strong">نقطة إعادة الطلب</span>
            <span className="md-num md-ui-strong">4</span>
          </Row>
          <Row>
            <span className="md-muted">عندك 3 ، تحت الحد</span>
            <span className="md-ui-chip">نبّهني</span>
          </Row>
        </div>
      );
    case "returns":
      return (
        <div className="md-ui" data-ui="return-reason" style={{ width: 300 }}>
          <Row>
            <span className="md-ui-strong">سبب المرتجع: المقاس</span>
            <span className="md-num md-ui-strong">7</span>
          </Row>
          <Row>
            <span className="md-muted">أوردرات راجعة الأسبوع ده</span>
            <span className="md-ui-chip">اتصلح</span>
          </Row>
        </div>
      );
    case "cod":
      return (
        <div className="md-ui" data-ui="cod-collection" style={{ width: 250 }}>
          <Row>
            <span className="md-ui-strong">متحصل النهاردة</span>
            <span className="md-num md-ui-strong">18,400</span>
          </Row>
          <Row>
            <span className="md-muted">مع المناديب</span>
            <span className="md-num md-muted">3,150</span>
          </Row>
        </div>
      );
    case "profit":
      return (
        <div className="md-ui" data-ui="order-profit" style={{ width: 260 }}>
          <Row>
            <span className="md-ui-strong">صافي بعد الشحن</span>
            <span className="md-num md-ui-strong">9,120</span>
          </Row>
          <Row>
            <span className="md-muted">مصاريف الإعلان</span>
            <span className="md-num md-muted">4,800</span>
          </Row>
        </div>
      );
    case "campaign":
      return (
        <div className="md-ui" data-ui="campaign-attribution" style={{ width: 300 }}>
          <Row>
            <span className="md-ui-strong">حملة صيف</span>
            <span className="md-num md-ui-strong">42</span>
          </Row>
          <Row>
            <span className="md-muted">أوردرات منسوبة للإعلان</span>
            <span className="md-ui-chip">ROAS 3.1</span>
          </Row>
        </div>
      );
    default:
      return null;
  }
};

export default MdFragment;
