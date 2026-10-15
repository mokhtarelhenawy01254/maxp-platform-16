import React from "react";
import { KIT_ORDERS, KIT_STATUSES } from "./kitData";
import "./kit.css";

/**
 * شرائح واجهة حقيقية (data-ui) ، من مكونات المنصة نفسها، ببيانات تجريبية.
 * مستخدمة في الصفحات الجديدة، وبتشتغل فعلًا لما تكون تفاعلية.
 */

export const KitFragment: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case "waybill":
      return (
        <div className="kit-ui" data-ui="waybill">
          <div className="kit-ui-row">
            <span className="kit-ui-strong">بوسطة</span>
            <span className="kit-num kit-ui-strong">BST-892401</span>
          </div>
          <div className="kit-ui-row">
            <span className="kit-ui-muted">استُلمت من المخزن</span>
            <span className="kit-ui-chip">خارج للتسليم</span>
          </div>
        </div>
      );
    case "cod":
      return (
        <div className="kit-ui" data-ui="cod">
          <div className="kit-ui-row">
            <span className="kit-ui-strong">متحصل النهاردة</span>
            <span className="kit-num kit-ui-strong">18,400</span>
          </div>
          <div className="kit-ui-row">
            <span className="kit-ui-muted">مع المناديب</span>
            <span className="kit-num kit-ui-muted">3,150</span>
          </div>
        </div>
      );
    case "stock":
      return (
        <div className="kit-ui" data-ui="stock">
          <div className="kit-ui-row">
            <span className="kit-ui-strong">مقاس 43</span>
            <span className="kit-num kit-ui-strong">12</span>
          </div>
          <div className="kit-ui-row">
            <span className="kit-ui-muted">مقاس 44</span>
            <span className="kit-num kit-ui-muted">0</span>
          </div>
        </div>
      );
    case "returns":
      return (
        <div className="kit-ui" data-ui="returns">
          <div className="kit-ui-row">
            <span className="kit-ui-strong">السبب: المقاس</span>
            <span className="kit-num kit-ui-strong">7</span>
          </div>
          <div className="kit-ui-row">
            <span className="kit-ui-muted">أوردرات راجعة الأسبوع ده</span>
            <span className="kit-ui-chip">اتصلح</span>
          </div>
        </div>
      );
    case "profit":
      return (
        <div className="kit-ui" data-ui="profit">
          <div className="kit-ui-row">
            <span className="kit-ui-strong">صافي بعد الشحن</span>
            <span className="kit-num kit-ui-strong">9,120</span>
          </div>
          <div className="kit-ui-row">
            <span className="kit-ui-muted">مصاريف الإعلان</span>
            <span className="kit-num kit-ui-muted">4,800</span>
          </div>
        </div>
      );
    default:
      return (
        <div className="kit-ui" data-ui="confirm">
          <div className="kit-ui-row">
            <span className="kit-ui-strong">أوردر جديد</span>
            <span className="kit-ui-chip">مؤكد</span>
          </div>
          <div className="kit-ui-row">
            <span className="kit-ui-muted">كوتشي أسود · مقاس 43</span>
            <span className="kit-num kit-ui-strong">850</span>
          </div>
        </div>
      );
  }
};

/**
 * الشريحة الشغّالة: جدول الطلبات ، فلترة بالحالة، بحث، وصف بيفتح رسالة التأكيد.
 * دي «الكائن الحي» في الصفحة: نفس تفاعل المنصة بمقاسها الحقيقي.
 */
export const KitOrdersWorkbench: React.FC = () => {
  const [status, setStatus] = React.useState(KIT_STATUSES[0]);
  const [query, setQuery] = React.useState("");
  const [openRow, setOpenRow] = React.useState<string | null>("ORD-501201");

  const rows = KIT_ORDERS.filter(
    (order) =>
      (status === KIT_STATUSES[0] || order.s === status) &&
      (query.trim() === "" ||
        order.c.includes(query.trim()) ||
        order.n.includes(query.trim())),
  );

  return (
    <div className="kit-ui kit-ui--table" data-ui="orders">
      <div className="kit-ui-head">
        <span className="kit-ui-strong">الطلبات</span>
        <input
          className="kit-ui-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث برقم الطلب أو اسم العميل…"
          aria-label="ابحث في الطلبات"
        />
      </div>

      <div className="kit-ui-tabs" role="tablist" aria-label="فلترة الطلبات">
        {KIT_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === status}
            className="kit-ui-tab"
            onClick={() => setStatus(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <table className="kit-ui-table">
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>العميل</th>
            <th>المبلغ</th>
            <th>الحالة</th>
            <th>الدفع</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <React.Fragment key={order.n}>
              <tr onClick={() => setOpenRow(openRow === order.n ? null : order.n)}>
                <td className="kit-num">{order.n}</td>
                <td>{order.c}</td>
                <td className="kit-num kit-ui-strong">{order.t.toLocaleString("en-US")}</td>
                <td>
                  <span className={`kit-ui-chip kit-ui-chip--${order.s === "مرتجع" ? "warn" : "ok"}`}>
                    {order.s}
                  </span>
                </td>
                <td className="kit-ui-muted">{order.pay}</td>
              </tr>
              {openRow === order.n && (
                <tr className="kit-ui-detail">
                  <td colSpan={5}>
                    <span className="kit-ui-bubble">
                      أهلاً يا فندم، أوردرك مؤكد: {order.c} · {order.city} · {order.pay}
                    </span>
                    <span className="kit-ui-muted"> ، رسالة التأكيد بتتبعت من نفس الشاشة.</span>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="kit-ui-muted">
                مفيش طلبات بالحالة دي.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KitFragment;
