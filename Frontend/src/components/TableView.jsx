import axios from "axios";
import React, { useState } from "react";
import "../styles/TableView.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";

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

  const getStatusClass = (status) => status.toLowerCase().replace("_", "-");

  const preparationInvoices = invoices.filter(
    (i) => i.status === "ORDERED" || i.status === "IN_PROGRESS"
  );

  const shippingInvoices = invoices.filter((i) => i.status === "SHIPPING");

  const deliveryInvoices = invoices.filter(
    (i) => i.status === "OUT_FOR_DELIVERY" || i.status === "DELIVERED"
  );

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

  return (
    <div className="invoice-container">
      <h2 className="dashboard-title">{userRole} Dashboard</h2>

      {/* Admin Tabs */}
      {userRole === "Admin" && (
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === "preparation" ? "active" : ""}`}
            onClick={() => setActiveTab("preparation")}
          >
            Preparation ({preparationInvoices.length})
          </button>
          <button
            className={`tab-button ${activeTab === "shipping" ? "active" : ""}`}
            onClick={() => setActiveTab("shipping")}
          >
            Shipping ({shippingInvoices.length})
          </button>
          <button
            className={`tab-button ${activeTab === "delivery" ? "active" : ""}`}
            onClick={() => setActiveTab("delivery")}
          >
            Delivery ({deliveryInvoices.length})
          </button>
        </div>
      )}

      {/* Invoice List */}
      <div className="invoice-table">
        {getCurrentInvoices().length === 0 ? (
          <div className="no-invoices">No invoices available</div>
        ) : (
          getCurrentInvoices().map((invoice) => (
            <div key={invoice.id} className="invoice-block">

              {/* Invoice Row */}
              <div
                className="invoice-row"
                onClick={(e) => {
                  if (!e.target.closest("select")) {
                    toggleInvoiceDetails(invoice.id);
                  }
                }}
              >
                <div className="invoice-main">

                  {/* LEFT */}
                  <div className="invoice-left">
                    <div className="invoice-id">Order #{invoice.id}</div>
                    <div className="invoice-date">
                      {new Date(invoice.order_date).toLocaleString()}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="invoice-right">
                    <div className="invoice-amount">
                      ₹{parseFloat(invoice.net_amount).toFixed(2)}
                    </div>

                    <div className="status-wrapper">
                      <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                        {invoice.status}
                      </span>

                      <select
                        className="status-select"
                        value={invoice.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateInvoiceStatus(invoice.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getStatusOptions().map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>
              </div>

              {/* Expanded Details */}
              {expandedInvoiceId === invoice.id && (
                <div className="invoice-details">

                  <div className="invoice-info">
                    <p><strong>Payment:</strong> {invoice.payment_mode}</p>

                    {/* 🔥 SHOW ADDRESS ONLY FOR DELIVERY */}
                    {userRole === "Delivery"  && invoice.address && (
                      <div className="delivery-compact">

                        <div className="delivery-top">
                          <span className="delivery-name">
                            {invoice.address.name}
                          </span>

                          <span className="delivery-phone">
                             {invoice.address.phone_number}
                          </span>
                        </div>

                        <div className="delivery-address">
                          {invoice.address.address1}
                        </div>

                        <div className="delivery-actions">

                          {/* MAP */}
                          {invoice.address.latitude && invoice.address.longitude && (
                            <button
                              className="action-btn map"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${invoice.address.latitude},${invoice.address.longitude}`,
                                  "_blank"
                                );
                              }}
                            >
                               Map
                            </button>
                          )}

                          {/* CALL */}
                          <a
                            href={`tel:${invoice.address.phone_number}`}
                            className="action-btn call"
                            onClick={(e) => e.stopPropagation()}
                          >
                             Call
                          </a>

                        </div>

                      </div>
                    )}
                  </div>

                  <div className="transaction-list">
                    {invoice.transactions.map((t, i) => (
                      <div key={i} className="transaction-row">
                        <img
                          src={`${API_BASE_URL_MEDIA}${t.item.image}`}
                          alt={t.item.name}
                          onError={(e) => (e.target.style.display = "none")}
                        />
                        <div>
                          <strong>{t.item.name}</strong>
                          {/* <p>{t.item.description || "No description"}</p> */}
                        </div>
                        <span>x{t.quantity}</span>
                        <span>
                          ₹{(parseFloat(t.item_amount) * t.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TableView;