import React, { useState } from "react";
import { KitFragment } from "../merchant-kit/KitFragment";
import { KIT_SCREENS, KIT_STAGES, csbFmt, kitNumbers } from "../merchant-kit/kitData";

const RESPONSES = [
  {
    id: "confirm",
    line: "الأوردر بيتأكد على واتساب قبل ما ياخد مصاريف شحن.",
    fragment: "confirm",
  },
  {
    id: "waybill",
    line: "البوليصة بتصدر من نفس الشاشة وتتسلّم للمندوب.",
    fragment: "waybill",
  },
  { id: "cod", line: "والتحصيل بيفضل منسوب للأوردر لحد الخزنة.", fragment: "cod" },
];

/** الأرقام: الرقم بيتغيّر بالسلايدر ، بحساب حقيقي على أسعار المنصة. */
const PerformsNumbers: React.FC = () => {
  const [orders, setOrders] = useState(900);
  const data = kitNumbers(orders);

  return (
    <section id="pf-numbers" className="pf pf-section">
      <div className="pf-shell grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <h2 className="pf-head">حرّك السلايدر على عدد شغلك</h2>
          <p className="pf-body pf-muted mt-4 max-w-[38ch]">
            الحساب ده بيستخدم أسعار المنصة المعلنة: الباقة بـ
            <span className="pf-num"> {csbFmt(999)} </span>
            ج.م في الشهر مقابل
            <span className="pf-num"> {csbFmt(2936)} </span>
            ج.م لو جبت الـ17 أداة فرادى.
          </p>
          <label className="pf-small mt-8 block font-semibold" htmlFor="pf-orders">
            عدد الأوردرات في الشهر:{" "}
            <span className="pf-num">{orders.toLocaleString("en-US")}</span>
          </label>
          <input
            id="pf-orders"
            className="pf-slider mt-2"
            type="range"
            min={100}
            max={3000}
            step={50}
            value={orders}
            onChange={(event) => setOrders(Number(event.target.value))}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          <dl className="grid gap-px overflow-hidden rounded-xl bg-[#dde4e8] sm:grid-cols-2">
            {[
              { k: "أوردرات متسلّمة", v: data.delivered.toLocaleString("en-US") },
              { k: "متوقع يرجع", v: data.returned.toLocaleString("en-US") },
              { k: "تحصيل COD متوقع", v: `${data.cod.toLocaleString("en-US")} ج.م` },
              { k: "وفر شهري عن الأدوات الفرادى", v: `${csbFmt(data.saving)} ج.م` },
            ].map((row) => (
              <p key={row.k} className="pf-head min-w-0 bg-[#f7f9fa] p-6">
                <span className="pf-num">{row.v}</span>
                <span className="pf-lead pf-muted" style={{ fontWeight: 400, marginInlineStart: 12 }}>
                  {row.k}
                </span>
              </p>
            ))}
          </dl>
          <p className="pf-small pf-muted mt-4">
            الأرقام دي تقدير حسابي على متوسط سلة
            <span className="pf-num"> 900 </span>
            ج.م ، مش وعد بنتيجة، والفاحص بتاع الشاشة بيوريك أرقامك الحقيقية.
          </p>
        </div>
      </div>
    </section>
  );
};

/** الشاشات: بلاطات متفاوتة المقاسات، كل واحدة شريحة حقيقية بمقاسها. */
const PerformsParts: React.FC = () => (
  <section id="pf-parts" className="pf pf-section">
    <div className="pf-shell">
      <h2 className="pf-head mb-10 max-w-[24ch] md:mb-14">
        كل جزء في المنصة بيتصمّم يشتغل لوحده
      </h2>

      <div className="grid gap-4 md:grid-cols-12">
        <figure className="pf-rise m-0 md:col-span-7">
          <div className="pf-stage flex h-[200px] items-center justify-center">
            <KitFragment id="stock" />
          </div>
          <figcaption className="pf-body mt-4 max-w-[34ch]">
            المخزون بالمقاس: الرصيد الحقيقي لكل مقاس قبل ما تبيع.
          </figcaption>
        </figure>

        <figure className="pf-rise m-0 md:col-span-5 md:pt-10">
          <div className="pf-stage flex h-[200px] items-center justify-center">
            <KitFragment id="returns" />
          </div>
          <figcaption className="pf-body mt-4 max-w-[30ch]">
            سبب المرتجع مكتوب: تعرف الرجعة جاية من أنهي مقاس.
          </figcaption>
        </figure>

        <figure className="pf-rise m-0 md:col-span-4">
          <div className="pf-stage flex h-[200px] items-center justify-center">
            <KitFragment id="waybill" />
          </div>
          <figcaption className="pf-body mt-4 max-w-[28ch]">
            بوليصة بنقرة من نفس الأوردر.
          </figcaption>
        </figure>

        <figure className="pf-rise m-0 md:col-span-8 md:pt-6">
          <div className="pf-stage flex h-[200px] items-center justify-center">
            <KitFragment id="profit" />
          </div>
          <figcaption className="pf-body mt-4 max-w-[40ch]">
            صافي الأوردر بعد الشحن والإعلان ، الرقم اللي بيقولك تكبر ولا توقف.
          </figcaption>
        </figure>
        <figure className="pf-rise m-0 md:col-span-7">
          <div className="pf-stage">
            <img
              src={KIT_SCREENS.orders}
              alt="شاشة الطلبات في المنصة"
              loading="lazy"
              className="w-full rounded-lg object-cover"
            />
          </div>
          <figcaption className="pf-body mt-4 max-w-[40ch]">
            وده شكلها الحقيقي جوه المنصة، بنفس الأعمدة اللي بتشتغل بيها كل يوم.
          </figcaption>
        </figure>

        <figure className="pf-rise m-0 md:col-span-5 md:pt-10">
          <div className="pf-stage flex justify-center">
            <img
              src={KIT_SCREENS.ordersMobile}
              alt="نفس الشاشة على الموبايل"
              loading="lazy"
              className="h-[300px] rounded-lg object-cover"
            />
          </div>
          <figcaption className="pf-body mt-4 max-w-[26ch]">
            ونفسها على الموبايل.
          </figcaption>
        </figure>

        <figure className="pf-rise m-0 md:col-span-8">
          <div className="pf-stage">
            <img
              src={KIT_SCREENS.rows}
              alt="صفوف الطلبات في شاشة المنصة"
              loading="lazy"
              className="w-full rounded-lg object-cover"
            />
          </div>
          <figcaption className="pf-body mt-4 max-w-[40ch]">
            كل صف فيه المبلغ والحالة وطريقة الدفع، والفلتر بيقلّل القايمة على طول.
          </figcaption>
        </figure>

        <figure className="pf-rise m-0 md:col-span-4 md:pt-8">
          <div className="pf-stage">
            <img
              src={KIT_SCREENS.filters}
              alt="فلاتر حالات الطلبات في المنصة"
              loading="lazy"
              className="w-full rounded-lg object-cover"
            />
          </div>
          <figcaption className="pf-body mt-4 max-w-[28ch]">
            فلاتر جاهزة للحالات، مش إعدادات.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
);

/** الخطوات: سؤال وجواب ، الشريحة ثابتة والكلام بيتغيّر. */
const PerformsCall: React.FC = () => {
  const [active, setActive] = useState(RESPONSES[0].id);
  const current = RESPONSES.find((item) => item.id === active) || RESPONSES[0];

  return (
    <section className="pf pf-section">
      <div className="pf-shell grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-6">
          <h2 className="pf-head max-w-[18ch]">من الرسالة للكاش</h2>
          <ul className="mt-8 flex flex-col">
            {RESPONSES.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  onMouseEnter={() => setActive(item.id)}
                  aria-pressed={item.id === active}
                  className="pf-body w-full border-0 py-5 text-start font-semibold"
                  style={{
                    background: item.id === active ? "var(--pf-surface)" : "transparent",
                    color: item.id === active ? "var(--pf-ink)" : "var(--pf-muted)",
                    borderRadius: 12,
                    paddingInline: 16,
                    cursor: "pointer",
                  }}
                >
                  <span className="pf-num pf-small me-3 font-bold text-[#0d7480]">
                    {KIT_STAGES[index].duration}
                  </span>
                  {item.line}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-6">
          <div className="pf-stage flex h-[240px] items-center justify-center">
            <KitFragment id={current.fragment} />
          </div>
          <p className="pf-small pf-muted mt-3">
            الشريحة دي بتتغيّر مع الخطوة اللي تختارها ، نفس اللي بيحصل في الشاشة.
          </p>
        </div>
      </div>
    </section>
  );
};

export const PerformsBody: React.FC = () => (
  <>
    <PerformsNumbers />
    <PerformsParts />
    <PerformsCall />
  </>
);

export default PerformsBody;
