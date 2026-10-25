import axios from "axios";
import React, { useState } from "react";
import "../styles/TableView.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";
import { isPiece, formatWeight, formatQuantity } from "../utils/pricing";
import { formatDeliveryDate } from "../utils/deliveryDate";
import { orderBreakdown, formatRs } from "../utils/orderTotals";
import { orderLabel } from "../utils/orderNumber";
import { getStaffToken } from "../utils/staffAuth";

// label and badge colour class for each order status
const STATUS_META = {
  ORDERED: { label: "Ordered", className: "ordered" },
  IN_PROGRESS: { label: "Preparing", className: "in-progress" },
  SHIPPING: { label: "Shipping", className: "shipping" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "out-for-delivery" },
  DELIVERED: { label: "Delivered", className: "delivered" },
};

const getStatusMeta = (status) =>
  STATUS_META[status] || { label: status, className: "other" };

const ADMIN_TABS = [
  { key: "preparation", label: "Preparation", icon: "bi-fire" },
  { key: "shipping", label: "Shipping", icon: "bi-box-seam" },
  { key: "delivery", label: "Delivery", icon: "bi-truck" },
];

function TableView({ invoices = [], userRole, setInvoices }) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [activeTab, setActiveTab] = useState("preparation");
  // "" shows every store; staff at one store can pick theirs
  const [storeFilter, setStoreFilter] = useState("");

  const storeNames = [
    ...new Set(invoices.map((i) => i.store?.name).filter(Boolean)),
  ].sort();
  const byStore = (list) =>
    storeFilter ? list.filter((i) => i.store?.name === storeFilter) : list;

  const toggleInvoiceDetails = (invoiceId) => {
    setExpandedInvoiceId((prevId) => (prevId === invoiceId ? null : invoiceId));
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      // staff only: the server checks the login
      const token = getStaffToken();
      await axios.patch(
        `${API_BASE_URL}/order-detail/${invoiceId}/`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv
        )
      );
    } catch (error) {
      console.error("Error updating invoice status:", error);
      alert("Failed to update status.");
    }
  };

  const preparationInvoices = invoices.filter(
    (i) => i.status === "ORDERED" || i.status === "IN_PROGRESS"
  );

  const shippingInvoices = invoices.filter((i) => i.status === "SHIPPING");

  // out for delivery first, then the rest; newest first in each
  const newestFirst = (a, b) => new Date(b.order_date) - new Date(a.order_date);
  const outForDeliveryFirst = (list) => [
    ...list.filter((i) => i.status === "OUT_FOR_DELIVERY").sort(newestFirst),
    ...list.filter((i) => i.status !== "OUT_FOR_DELIVERY").sort(newestFirst),
  ];

  const deliveryInvoices = outForDeliveryFirst(
    invoices.filter((i) => i.status === "OUT_FOR_DELIVERY" || i.status === "DELIVERED")
  );

  const tabCounts = {
    preparation: byStore(preparationInvoices).length,
    shipping: byStore(shippingInvoices).length,
    delivery: byStore(deliveryInvoices).length,
  };

  const getCurrentInvoices = () => {
    if (userRole === "Admin") {
      if (activeTab === "preparation") return preparationInvoices;
      if (activeTab === "shipping") return shippingInvoices;
      if (activeTab === "delivery") return deliveryInvoices;
    } else if (userRole === "Maker") {
      return preparationInvoices.filter((i) => i.status === "IN_PROGRESS");
    } else if (userRole === "Delivery") {
      return outForDeliveryFirst([...deliveryInvoices, ...shippingInvoices]);
    }
    return [];
  };

  const getStatusOptions = () => {
    if (userRole === "Maker") {
      return [
        { value: "IN_PROGRESS", label: "Preparing" },
        { value: "SHIPPING", label: "Shipping" },
      ];
    } else if (userRole === "Delivery") {
      return [
        { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
        { value: "DELIVERED", label: "Delivered" },
      ];
    }
    return [
      { value: "ORDERED", label: "Ordered" },
      { value: "IN_PROGRESS", label: "Preparing" },
      { value: "SHIPPING", label: "Shipping" },
      { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
      { value: "DELIVERED", label: "Delivered" },
    ];
  };

  const currentInvoices = byStore(getCurrentInvoices());
  const statusOptions = getStatusOptions();

  return (
    <div className="odash">
      {/* Admin Tabs */}
      {userRole === "Admin" ? (
        <div className="odash-tabs" role="tablist">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`odash-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon}`} aria-hidden="true"></i>
              <span className="odash-tab-label">{tab.label}</span>
              <span className="odash-tab-count">{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="odash-count">
          {currentInvoices.length} {currentInvoices.length === 1 ? "order" : "orders"}
        </p>
      )}

      {storeNames.length > 1 && (
        <div className="odash-store-filter">
          <label htmlFor="odash-store-select">
            <i className="bi bi-shop" aria-hidden="true"></i> Store
          </label>
          <select
            id="odash-store-select"
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
          >
            <option value="">All stores</option>
            {storeNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Invoice List */}
      {currentInvoices.length === 0 ? (
        <div className="dash-message">
          <i className="bi bi-inbox" aria-hidden="true"></i>
          No invoices available
        </div>
      ) : (
        <div className="odash-list">
          {currentInvoices.map((invoice) => {
            const expanded = expandedInvoiceId === invoice.id;
            const status = getStatusMeta(invoice.status);
            const itemCount = invoice.transactions?.length || 0;
            // a status this role cannot set (e.g. Shipping for Delivery) is still
            // listed, disabled, so the dropdown shows the real status and
            // every option below it can be picked
            const hasCurrentStatus = statusOptions.some(
              (opt) => opt.value === invoice.status
            );

            return (
              <div
                key={invoice.id}
                className={`odash-card ${expanded ? "expanded" : ""}`}
              >
                {/* Invoice Row */}
                <div
                  className="odash-row"
                  onClick={(e) => {
                    if (!e.target.closest("select")) {
                      toggleInvoiceDetails(invoice.id);
                    }
                  }}
                >
                  <div className="odash-id-block">
                    <div className="odash-id">Order {orderLabel(invoice)}</div>
                    <div className="odash-date">
                      {new Date(invoice.order_date).toLocaleString()}
                    </div>
                    {invoice.store && (
                      <div className="odash-store">
                        <i className="bi bi-shop" aria-hidden="true"></i>
                        {invoice.store.name}
                      </div>
                    )}
                    {invoice.delivery_date && (
                      <div className="odash-deliver">
                        <i className="bi bi-calendar-check" aria-hidden="true"></i>
                        Deliver {formatDeliveryDate(invoice.delivery_date)}
                        {invoice.is_scheduled && (
                          <span className="odash-scheduled">Scheduled</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="odash-items-count">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </div>

                  <div className="odash-amount">
                    Rs.{parseFloat(invoice.net_amount).toFixed(2)}
                  </div>

                  <span className={`odash-status ${status.className}`}>
                    {status.label}
                  </span>

                  <select
                    className="odash-status-select"
                    aria-label={`Change status of order ${orderLabel(invoice)}`}
                    value={invoice.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateInvoiceStatus(invoice.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!hasCurrentStatus && (
                      <option value={invoice.status} disabled>
                        {status.label}
                      </option>
                    )}
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="odash-toggle"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Hide order details" : "Show order details"}
                  >
                    <i className="bi bi-chevron-down" aria-hidden="true"></i>
                  </button>
                </div>

                {/* Expanded Details */}
                {expanded && (
                  <div className="odash-details">
                    <p className="odash-payment">
                      <span>Payment</span>
                      {invoice.payment_mode}
                    </p>

                    {/* store the order is made at and picked up from */}
                    {invoice.store && (
                      <div className="odash-delivery odash-pickup">
                        <div className="odash-delivery-text">
                          <div className="odash-delivery-name">
                            <i className="bi bi-shop" aria-hidden="true"></i> Pick up from {invoice.store.name}
                          </div>
                          {invoice.store.address && (
                            <div className="odash-delivery-address">
                              {invoice.store.address}
                            </div>
                          )}
                        </div>

                        {userRole === "Delivery" && (
                          <div className="odash-delivery-actions">
                            <button
                              type="button"
                              className="dash-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${invoice.store.latitude},${invoice.store.longitude}`,
                                  "_blank"
                                );
                              }}
                            >
                              <i className="bi bi-geo-alt" aria-hidden="true"></i>
                              Store map
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 🔥 SHOW ADDRESS ONLY FOR DELIVERY */}
                    {userRole === "Delivery" && invoice.address && (
                      <div className="odash-delivery">
                        <div className="odash-delivery-text">
                          <div className="odash-delivery-name">
                            {invoice.address.name}
                            <span>{invoice.address.phone_number}</span>
                          </div>

                          <div className="odash-delivery-address">
                            {invoice.address.address1}
                          </div>
                        </div>

                        <div className="odash-delivery-actions">
                          {/* MAP */}
                          {invoice.address.latitude && invoice.address.longitude && (
                            <button
                              type="button"
                              className="dash-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                // route from the store to the customer
                                const origin = invoice.store
                                  ? `&origin=${invoice.store.latitude},${invoice.store.longitude}`
                                  : "";
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1${origin}&destination=${invoice.address.latitude},${invoice.address.longitude}`,
                                  "_blank"
                                );
                              }}
                            >
                              <i className="bi bi-geo-alt" aria-hidden="true"></i>
                              Map
                            </button>
                          )}

                          {/* CALL */}
                          <a
                            href={`tel:${invoice.address.phone_number}`}
                            className="dash-btn secondary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="bi bi-telephone" aria-hidden="true"></i>
                            Call
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="odash-items">
                      {invoice.transactions.map((t, i) => (
                        <div key={i} className="odash-item">
                          <img
                            src={`${API_BASE_URL_MEDIA}${t.item.image}`}
                            alt={t.item.name}
                            onError={(e) => (e.target.style.display = "none")}
                          />
                          <div className="odash-item-text">
                            <strong>{t.item.name}</strong>
                            <span>
                              {isPiece(t.weight)
                                ? `By Piece: ${formatQuantity(t.quantity, t.weight)}`
                                : `By Weight: ${formatWeight(t.weight)} x${t.quantity}`}
                            </span>
                          </div>
                          {(() => {
                            // prices as saved when the order was placed
                            const qty = t.quantity;
                            const selling = Number(t.item_amount) * qty;
                            const mrp = t.mrp_price != null ? Number(t.mrp_price) * qty : selling;
                            const couponShare = Number(t.coupon_discount || 0);
                            const free = t.free_quantity || 0;
                            return (
                              <span className="odash-item-price">
                                {mrp > selling && (
                                  <span className="odash-price-old">{formatRs(mrp)}</span>
                                )}
                                <span>{formatRs(selling)}</span>
                                {free > 0 && (
                                  <span className="odash-item-note">{free} free (offer)</span>
                                )}
                                {free === 0 && couponShare > 0 && (
                                  <span className="odash-item-note">Coupon - {formatRs(couponShare)}</span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                      ))}
                    </div>

                    {/* amounts as saved when the order was placed */}
                    <div className="odash-summary">
                      {(() => {
                const b = orderBreakdown(invoice);
                return (
                  <>
                    {/* same rows as the checkout summary */}
                    <div className="odash-summary-row">
                      <span>Items{b.itemCount != null ? ` (${b.itemCount})` : ""}</span>
                      <span>{formatRs(b.mrpTotal)}</span>
                    </div>
                    {b.itemDiscount > 0 && (
                      <div className="odash-summary-row saving">
                        <span>Item Discount</span>
                        <span>- {formatRs(b.itemDiscount)}</span>
                      </div>
                    )}
                    {b.coupon > 0 && (
                      <div className="odash-summary-row saving">
                        <span>
                          Coupon Discount
                          {b.couponCode ? ` (${b.couponCode}${invoice.coupon_type === "bogo" ? ", Buy X Get Y" : ""})` : ""}
                        </span>
                        <span>- {formatRs(b.coupon)}</span>
                      </div>
                    )}
                    {b.coupon === 0 && b.couponCode && (
                      <div className="odash-summary-row">
                        <span>Coupon</span>
                        <span>{b.couponCode}</span>
                      </div>
                    )}
                    {b.deliveryCharge != null && (
                      <div className="odash-summary-row">
                        <span>Delivery Charges</span>
                        <span className={b.deliveryCharge > 0 ? "" : "odash-free"}>
                          {b.deliveryCharge > 0 ? formatRs(b.deliveryCharge) : "FREE"}
                        </span>
                      </div>
                    )}
                    {b.packingCharge != null && (
                      <div className="odash-summary-row">
                        <span>Packing & Handling</span>
                        <span className={b.packingCharge > 0 ? "" : "odash-free"}>
                          {b.packingCharge > 0 ? formatRs(b.packingCharge) : "FREE"}
                        </span>
                      </div>
                    )}
                    {b.adjustment !== 0 && (
                      <div className="odash-summary-row">
                        <span>Delivery & adjustments</span>
                        <span>{b.adjustment < 0 ? "- " : ""}{formatRs(Math.abs(b.adjustment))}</span>
                      </div>
                    )}
                  </>
                );
              })()}
                      <div className="odash-summary-row total">
                        <span>Total</span>
                        <span>{formatRs(invoice.net_amount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TableView;
