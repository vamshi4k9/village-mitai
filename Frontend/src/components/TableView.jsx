// TableView.jsx
import axios from "axios";
import React, { useState } from "react";
import "../styles/TableView.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";

function TableView({ invoices = [] }) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [activeTab, setActiveTab] = useState("preparation");

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
    }
  };
  const getStatusClass = (status) => status.toLowerCase().replace("_", "-");

  // Filter invoices based on status
  const preparationInvoices = invoices.filter(invoice => 
    invoice.status === "ORDERED" || invoice.status === "IN_PROGRESS"
  );
  
  const shippingInvoices = invoices.filter(invoice => 
    invoice.status === "SHIPPING"
  );
  
  const deliveryInvoices = invoices.filter(invoice => 
    invoice.status === "OUT_FOR_DELIVERY" || invoice.status === "DELIVERED"
  );

  const getCurrentInvoices = () => {
    switch(activeTab) {
      case "preparation":
        return preparationInvoices;
      case "shipping":
        return shippingInvoices;
      case "delivery":
        return deliveryInvoices;
      default:
        return [];
    }
  };

  const getStatusOptions = () => {
    switch(activeTab) {
      case "preparation":
        return [
          { value: "ORDERED", label: "Ordered" },
          { value: "IN_PROGRESS", label: "Preparing" },
          { value: "SHIPPING", label: "Shipping" },
        ];
      case "shipping":
        return [
          { value: "SHIPPING", label: "Shipping" },
          { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
        ];
      case "delivery":
        return [
          { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
          { value: "DELIVERED", label: "Delivered" },
        ];
      default:
        return [];
    }
  };

  const getTabIcon = (tab) => {
    switch(tab) {
      case "preparation":
        return "👨‍🍳";
      case "shipping":
        return "🚚";
      case "delivery":
        return "📦";
      default:
        return "";
    }
  };

  const getTabTitle = (tab) => {
    switch(tab) {
      case "preparation":
        return "Preparation Management";
      case "shipping":
        return "Shipping Management";
      case "delivery":
        return "Delivery Management";
      default:
        return "";
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
          <p>No invoices in this category</p>
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
                  {getStatusOptions().map(option => (
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
                  <p><strong>Payment Mode:</strong> {invoice.payment_mode}</p>
                  <p><strong>CGST:</strong> ₹{invoice.cgst}</p>
                  <p><strong>SGST:</strong> ₹{invoice.sgst}</p>
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
    <div className="invoice-container">
      <h2>Invoice Management</h2>
      
      {/* Tab Navigation */}
      <div className="flex justify-evenly tab-navigation mb-6">
        <button 
          className={`tab-button ${activeTab === "preparation" ? "active" : ""}`}
          onClick={() => setActiveTab("preparation")}
        >
          Preparation Management
          <span className="tab-count">({preparationInvoices.length})</span>
        </button>
        <button 
          className={`tab-button ${activeTab === "shipping" ? "active" : ""}`}
          onClick={() => setActiveTab("shipping")}
        >
           Shipping Management
          <span className="tab-count">({shippingInvoices.length})</span>
        </button>
        <button 
          className={`tab-button ${activeTab === "delivery" ? "active" : ""}`}
          onClick={() => setActiveTab("delivery")}
        >
           Delivery Management
          <span className="tab-count">({deliveryInvoices.length})</span>
        </button>
      </div>

      {/* Current Tab Content */}
      <div className="tab-content">
        <h3> {getTabTitle(activeTab)}</h3>
        <InvoiceTable invoices={getCurrentInvoices()} />
      </div>
    </div>
  );
}

export default TableView;