// Price breakdown of a placed order, from what was saved when it was placed
// (never from the items' current prices, which can change later).
//
// Orders placed with the current checkout save every part of the bill: the
// MRP total, the item (sale) discount, the coupon, delivery and packing.
// Older orders saved no delivery charge and had the coupon spread into their
// line prices, so their difference to the total is shown as one
// "Delivery & adjustments" amount. Either way the rows add up to the total
// the customer paid.
const round2 = (n) => Math.round(n * 100) / 100;

export const orderBreakdown = (order) => {
  const lines = order?.transactions || [];
  const linesTotal = lines.reduce(
    (sum, t) => sum + Number(t.item_amount) * t.quantity,
    0
  );
  const itemCount = lines.length ? lines.reduce((sum, t) => sum + t.quantity, 0) : null;
  const total = Number(order?.net_amount || 0);
  const couponCode = order?.coupon_code || "";

  if (order?.delivery_charge != null) {
    // the list API has no lines, so prefer the totals saved on the order
    const itemsTotal = order.items_total != null ? Number(order.items_total) : linesTotal;
    const mrpTotal = order.items_mrp_total != null ? Number(order.items_mrp_total) : itemsTotal;
    const itemDiscount = order.item_discount != null
      ? Number(order.item_discount)
      : Math.max(mrpTotal - itemsTotal, 0);
    const coupon = Number(order.discount || 0);
    const deliveryCharge = Number(order.delivery_charge);
    const packingCharge = Number(order.packing_charge || 0);
    // anything left over (rounding) so the rows always add up to what was paid
    const adjustment = round2(total - (itemsTotal - coupon + deliveryCharge + packingCharge));

    return {
      legacy: false,
      itemCount,
      mrpTotal,
      itemDiscount,
      itemsTotal,
      coupon,
      couponCode,
      deliveryCharge,
      packingCharge,
      adjustment: Math.abs(adjustment) >= 0.01 ? adjustment : 0,
      total,
    };
  }

  return {
    legacy: true,
    // without the lines (profile list) an older order can only show its total
    hasLines: lines.length > 0,
    itemCount,
    mrpTotal: linesTotal,
    itemDiscount: 0,
    itemsTotal: linesTotal,
    coupon: 0,
    couponCode,
    deliveryCharge: null,
    packingCharge: null,
    adjustment: lines.length ? round2(total - linesTotal) : 0,
    total,
  };
};

export const formatRs = (amount) => `Rs.${Number(amount).toFixed(2)}`;
