// Order number shown to customers and staff: VM and 10 random hex digits
// (e.g. VM7F3A9C21B4); orders placed before that look like VM2610240007.
// Orders always have one now; the database id is only a fallback.
export const orderLabel = (order) =>
  order?.order_number || (order?.id != null ? `#${order.id}` : "");

// link to an order's status page
export const orderStatusUrl = (order) =>
  `/order_status?order=${encodeURIComponent(order?.order_number || order?.id)}`;
