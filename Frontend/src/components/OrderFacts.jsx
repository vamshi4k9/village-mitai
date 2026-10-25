import "../styles/OrderFacts.css";
import { formatDeliveryDate } from "../utils/deliveryDate";
import { formatRs } from "../utils/orderTotals";

// "24 Oct 2026, 5:50 pm"
const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// When the order was placed, which coupon it used and when it was (or will
// be) delivered. Shared by the order status page and the profile.
export default function OrderFacts({ order }) {
  const saved = Number(order.discount || 0);

  let delivery;
  if (order.status === "DELIVERED") {
    delivery = {
      icon: "bi-check2-circle",
      label: "Delivered",
      // orders delivered before the time was recorded have none
      value: order.delivered_at ? formatDateTime(order.delivered_at) : "Yes",
    };
  } else if (order.status === "CANCELLED") {
    delivery = { icon: "bi-x-circle", label: "Delivery", value: "Cancelled" };
  } else if (order.delivery_date) {
    delivery = {
      icon: "bi-calendar-check",
      label: order.is_scheduled ? "Scheduled for" : "Expected by",
      value: formatDeliveryDate(order.delivery_date),
    };
  }

  return (
    <dl className="ofacts">
      <div className="ofacts-row">
        <dt>
          <i className="bi bi-bag-check" aria-hidden="true"></i> Ordered
        </dt>
        <dd>{formatDateTime(order.order_date)}</dd>
      </div>

      <div className="ofacts-row">
        <dt>
          <i className="bi bi-tag" aria-hidden="true"></i> Coupon
        </dt>
        <dd>
          {order.coupon_code ? (
            <>
              <span className="ofacts-coupon">{order.coupon_code}</span>
              {saved > 0 && <span className="ofacts-saved"> saved {formatRs(saved)}</span>}
            </>
          ) : (
            <span className="ofacts-muted">No coupon used</span>
          )}
        </dd>
      </div>

      {delivery && (
        <div className="ofacts-row">
          <dt>
            <i className={`bi ${delivery.icon}`} aria-hidden="true"></i> {delivery.label}
          </dt>
          <dd>{delivery.value}</dd>
        </div>
      )}
    </dl>
  );
}
