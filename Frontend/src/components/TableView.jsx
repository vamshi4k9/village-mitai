import axios from "axios";
import React, { useState } from "react";
import "../styles/TableView.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";
import { isPiece, formatWeight, formatQuantity } from "../utils/pricing";

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

  const toggleInvoiceDetails = (invoiceId) => {
    setExpandedInvoiceId((prevId) => (prevId === invoiceId ? null : invoiceId));
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/order-detail/${invoiceId}/`, {
        status: newStatus,
      });
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

  const deliveryInvoices = invoices.filter(
    (i) => i.status === "OUT_FOR_DELIVERY" || i.status === "DELIVERED"
  );

  const tabCounts = {
    preparation: preparationInvoices.length,
    shipping: shippingInvoices.length,
    delivery: deliveryInvoices.length,
  };

  const getCurrentInvoices = () => {
    if (userRole === "Admin") {
      if (activeTab === "preparation") return preparationInvoices;
      if (activeTab === "shipping") return shippingInvoices;
      if (activeTab === "delivery") return deliveryInvoices;
    } else if (userRole === "Maker") {
      return preparationInvoices.filter((i) => i.status === "IN_PROGRESS");
    } else if (userRole === "Delivery") {
      return [...deliveryInvoices, ...shippingInvoices];
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

  const currentInvoices = getCurrentInvoices();
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
                    <div className="odash-id">Order #{invoice.id}</div>
                    <div className="odash-date">
                      {new Date(invoice.order_date).toLocaleString()}
                    </div>
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
                    aria-label={`Change status of order ${invoice.id}`}
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
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${invoice.address.latitude},${invoice.address.longitude}`,
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
                          <span className="odash-item-price">
                            Rs.{(parseFloat(t.item_amount) * t.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
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
