// Price breakdown of a placed order, from what was saved when it was placed
// (never from the items' current prices, which can change later).
//
// Orders placed with the current checkout save the delivery charge, and their
// line prices are before the coupon, which is saved once as the discount.
// Older orders saved no delivery charge and had the coupon spread into their
// line prices, so their difference to the total is shown as one
// "Delivery & adjustments" amount. Either way the rows add up to the total
// the customer paid.
export const orderBreakdown = (order) => {
  const itemsTotal = (order?.transactions || []).reduce(
    (sum, t) => sum + Number(t.item_amount) * t.quantity,
    0
  );
  const total = Number(order?.net_amount || 0);

  if (order?.delivery_charge != null) {
    return {
      itemsTotal,
      coupon: Number(order.discount || 0),
      couponCode: order.coupon_code || "",
      deliveryCharge: Number(order.delivery_charge),
      adjustment: 0,
      total,
    };
  }

  return {
    itemsTotal,
    coupon: 0,
    couponCode: order?.coupon_code || "",
    deliveryCharge: null,
    adjustment: Number((total - itemsTotal).toFixed(2)),
    total,
  };
};

export const formatRs = (amount) => `Rs.${Number(amount).toFixed(2)}`;
