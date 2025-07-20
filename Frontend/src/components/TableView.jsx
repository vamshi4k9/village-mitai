// TableView.jsx
import axios from "axios";
import React, { useState } from "react";
import "../styles/TableView.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";

function TableView({ invoices = [], userRole }) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [activeTab, setActiveTab] = useState("preparation"); // Default tab for Admin

  const toggleInvoiceDetails = (invoiceId) => {
    setExpandedInvoiceId((prevId) => (prevId === invoiceId ? null : invoiceId));
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/order-detail/${invoiceId}/`, {
        status: newStatus,
      });
      console.log("Status updated:", response.data);

      // Optional: update local state or refresh the invoice list
    } catch (error) {
      console.error("Error updating invoice status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const getStatusClass = (status) => status.toLowerCase().replace("_", "-");

  // Filter invoices based on tabs for Admin or userRole for others
  const preparationInvoices = invoices.filter(
    (invoice) => invoice.status === "ORDERED" || invoice.status === "IN_PROGRESS"
  );

  const shippingInvoices = invoices.filter((invoice) => invoice.status === "SHIPPING");

  const deliveryInvoices = invoices.filter(
    (invoice) => invoice.status === "OUT_FOR_DELIVERY" || invoice.status === "DELIVERED"
  );

  const getCurrentInvoices = () => {
    if (userRole === "Admin") {
      switch (activeTab) {
        case "preparation":
          return preparationInvoices;
        case "shipping":
          return shippingInvoices;
        case "delivery":
          return deliveryInvoices;
        default:
          return [];
      }
    } else if (userRole === "Maker") {
      return preparationInvoices.filter((invoice) => invoice.status === "IN_PROGRESS");
    } else if (userRole === "Delivery") {
      return deliveryInvoices;
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
    } else {
      return [
        { value: "ORDERED", label: "Ordered" },
        { value: "IN_PROGRESS", label: "Preparing" },
        { value: "SHIPPING", label: "Shipping" },
        { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
        { value: "DELIVERED", label: "Delivered" },
      ];
    }
  };

  const InvoiceTable = ({ invoices }) => (
    <div className="invoice-table">
      <div className="invoice-table-header">
        <div></div>
        <div>Invoice Number</div>
        <div>Invoice Amount</div>
        <div>Order Date</div>
        <div>Status</div>
      </div>
      {invoices.length === 0 ? (
        <div className="no-invoices">
          <p>No invoices available</p>
        </div>
      ) : (
        invoices.map((invoice) => (
          <div key={invoice.id} className="invoice-block">
            <div
              className={`invoice-row ${
                expandedInvoiceId === invoice.id ? "expanded" : ""
              }`}
              onClick={() => toggleInvoiceDetails(invoice.id)}
            >
              <button className="expand-btn">
                {expandedInvoiceId === invoice.id ? "▼" : "▶"}
              </button>
              <div>#{invoice.id}</div>
              <div>₹{parseFloat(invoice.net_amount).toFixed(2)}</div>
              <div>{new Date(invoice.order_date).toLocaleString()}</div>
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
                  {getStatusOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {expandedInvoiceId === invoice.id && (
              <div className="invoice-details">
                <div className="invoice-info">
                  <p>
                    <strong>Payment Mode:</strong> {invoice.payment_mode}
                  </p>
                  <p>
                    <strong>CGST:</strong> ₹{invoice.cgst}
                  </p>
                  <p>
                    <strong>SGST:</strong> ₹{invoice.sgst}
                  </p>
                </div>
                <div className="transaction-list">
                  <div className="transaction-header">
                    <span>Image</span>
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Amount</span>
                  </div>
                  {invoice.transactions.map((t, i) => (
                    <div key={i} className="transaction-row">
                      <img
                        src={`${API_BASE_URL_MEDIA}${t.item.image}`}
                        alt={t.item.name}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <div>
                        <strong>{t.item.name}</strong>
                        <p>{t.item.description || "No description"}</p>
                      </div>
                      <span>{t.quantity}</span>
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
  );

  return (
    <div className="invoice-container "> 
      <h2>{userRole} Dashboard</h2>

      {/* Tab Navigation for Admin */}
      {userRole === "Admin" && (
        <div className="tab-navigation flex justify-evenly">
          <button
            className={`tab-button ${activeTab === "preparation" ? "active" : ""}`}
            onClick={() => setActiveTab("preparation")}
          >
            Preparation Management ({preparationInvoices.length})
          </button>
          <button
            className={`tab-button ${activeTab === "shipping" ? "active" : ""}`}
            onClick={() => setActiveTab("shipping")}
          >
            Shipping Management ({shippingInvoices.length})
          </button>
          <button
            className={`tab-button ${activeTab === "delivery" ? "active" : ""}`}
            onClick={() => setActiveTab("delivery")}
          >
            Delivery Management ({deliveryInvoices.length})
          </button>
        </div>
      )}

      {/* Current Tab Content */}
      <InvoiceTable invoices={getCurrentInvoices()} />
    </div>
  );
}

export default TableView;