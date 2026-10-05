import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../constants";
import DashboardShell from "../DashboardShell";
import TableView from "../TableView"; // Import the table view component
import "../../styles/Ordering.css";

const SUBTITLES = {
  Admin: "All orders, from preparation to delivery",
  Maker: "Orders being prepared",
  Delivery: "Orders to ship and deliver",
};

// The order page behind the Admin, Maker and Delivery dashboards. All three
// load the same orders; TableView decides what each role sees and can change.
function OrdersDashboard({ userRole }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  // "" | "login" | "failed"
  const [error, setError] = useState("");

  const fetchInvoices = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("login");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/all-transactions-invoices/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(response.data);
    } catch (error) {
      console.error("Failed to fetch invoices", error);
      setError("failed");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSignOut = () => {
    // the same keys the admin login stores
    ["access_token", "refresh_token", "user_role", "user_id", "user_info"].forEach(
      (key) => localStorage.removeItem(key)
    );
    window.location.href = "/admin-login";
  };

  return (
    <DashboardShell
      title={`${userRole} Dashboard`}
      subtitle={SUBTITLES[userRole]}
      actions={
        <>
          <button
            type="button"
            className="dash-btn secondary"
            onClick={fetchInvoices}
            disabled={loading}
            aria-label="Refresh"
          >
            <i className="bi bi-arrow-clockwise" aria-hidden="true"></i>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="dash-btn"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
            <span>Sign Out</span>
          </button>
        </>
      }
    >
      {error === "login" ? (
        <div className="dash-message">
          <i className="bi bi-lock" aria-hidden="true"></i>
          Please log in to view orders.
          <div>
            <a href="/admin-login" className="dash-btn">Log In</a>
          </div>
        </div>
      ) : error === "failed" ? (
        <div className="dash-message error">
          <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
          Failed to fetch data. Please try again.
          <div>
            <button type="button" className="dash-btn" onClick={fetchInvoices}>
              Try Again
            </button>
          </div>
        </div>
      ) : loading && invoices.length === 0 ? (
        <div className="dash-message">
          <i className="bi bi-hourglass-split" aria-hidden="true"></i>
          Loading orders...
        </div>
      ) : (
        <TableView invoices={invoices} setInvoices={setInvoices} userRole={userRole} />
      )}
    </DashboardShell>
  );
}

export default OrdersDashboard;
