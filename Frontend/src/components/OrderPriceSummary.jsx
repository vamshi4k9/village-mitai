import "../styles/OrderPriceSummary.css";
import { orderBreakdown, formatRs } from "../utils/orderTotals";

const PAYMENT_LABELS = {
  CASH: "Cash on Delivery",
  UPI: "Paid Online",
};

// cash orders are paid on delivery; a cancelled order was not (or is refunded)
const totalLabel = (order) => {
  if (order.status === "CANCELLED") return "Order Total";
  if (order.payment_mode === "CASH" && order.status !== "DELIVERED") return "To Pay on Delivery";
  return "Total Paid";
};

// The bill of a placed order, laid out like the checkout's Order Summary:
// items at MRP, item discount, coupon, delivery, packing, payment and
// total (the delivery date is shown by OrderFacts above it). Amounts are the ones saved when the order was placed.
// Used on the order status page and in the profile's order list.
export default function OrderPriceSummary({ order, title = "Order Summary" }) {
  const b = orderBreakdown(order);
  const showRows = !b.legacy || b.hasLines;

  return (
    <div className="ops">
      {title && <h3 className="ops-title">{title}</h3>}

      {showRows && (
        <>
          <div className="ops-row">
            <span>Items{b.itemCount != null ? ` (${b.itemCount})` : ""}</span>
            <span>{formatRs(b.mrpTotal)}</span>
          </div>

          {b.itemDiscount > 0 && (
            <div className="ops-row saving">
              <span>Item Discount</span>
              <span>- {formatRs(b.itemDiscount)}</span>
            </div>
          )}

          {/* shown whenever a coupon was used, even one that took nothing off */}
          {(b.coupon > 0 || b.couponCode) && (
            <div className="ops-row saving">
              <span>
                Coupon Discount
                {b.couponCode && <span className="ops-code">{b.couponCode}</span>}
              </span>
              <span>{b.coupon > 0 ? `- ${formatRs(b.coupon)}` : "Applied"}</span>
            </div>
          )}

          {b.deliveryCharge != null && (
            <div className="ops-row">
              <span>Delivery Charges</span>
              {b.deliveryCharge > 0 ? (
                <span>{formatRs(b.deliveryCharge)}</span>
              ) : (
                <span className="ops-free">FREE</span>
              )}
            </div>
          )}

          {b.packingCharge != null && (
            <div className="ops-row">
              <span>Packing & Handling</span>
              {b.packingCharge > 0 ? (
                <span>{formatRs(b.packingCharge)}</span>
              ) : (
                <span className="ops-free">FREE</span>
              )}
            </div>
          )}

          {b.adjustment !== 0 && (
            <div className="ops-row">
              <span>{b.legacy ? "Delivery & adjustments" : "Adjustment"}</span>
              <span>{b.adjustment < 0 ? "- " : ""}{formatRs(Math.abs(b.adjustment))}</span>
            </div>
          )}
        </>
      )}

      {/* an older order without its lines: at least show the coupon it used */}
      {!showRows && b.couponCode && (
        <div className="ops-row saving">
          <span>Coupon<span className="ops-code">{b.couponCode}</span></span>
          <span>Applied</span>
        </div>
      )}

      {order.payment_mode && (
        <div className="ops-row">
          <span>Payment</span>
          <span>{PAYMENT_LABELS[order.payment_mode] || order.payment_mode}</span>
        </div>
      )}

      <div className="ops-row total">
        <span>{totalLabel(order)}</span>
        <span>{formatRs(b.total)}</span>
      </div>

      {(b.itemDiscount + b.coupon) > 0 && (
        <p className="ops-saved">
          <i className="bi bi-piggy-bank" aria-hidden="true"></i>
          You saved {formatRs(b.itemDiscount + b.coupon)} on this order
        </p>
      )}
    </div>
  );
}
