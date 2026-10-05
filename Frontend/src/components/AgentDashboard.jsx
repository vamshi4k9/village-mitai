import React, { useEffect, useState } from "react";
import axios from "axios";
import DashboardShell from "./DashboardShell";
import "../styles/AgentDashboard.css";
import { API_BASE_URL } from "../constants";

const STATS = [
  { key: "registered_count", label: "Customers Registered", icon: "bi-people" },
  { key: "total_orders_before", label: "Orders Before Registration", icon: "bi-clock-history" },
  { key: "total_orders_after", label: "Orders After Registration", icon: "bi-graph-up-arrow" },
  { key: "total_orders", label: "Total Orders", icon: "bi-bag-check" },
];

export default function AgentDashboard() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    registered_count: 0,
    total_orders_before: 0,
    total_orders_after: 0,
    total_orders: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const agentId = localStorage.getItem("agent_id") || 1;

  const fetchDashboard = async () => {
    setLoading(true);
    setError(false);

    try {
      const token = localStorage.getItem("access_token");

      const res = await axios.get(
        `${API_BASE_URL}/agent-dashboard/?agent_id=${agentId}&page=${page}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      // ✅ Expected response structure:
      // {
      //   "entries": [...],
      //   "stats": {...},
      //   "page": 1,
      //   "page_count": 5
      // }

      setEntries(res.data.entries);
      setStats(res.data.stats);
      setPage(res.data.page);
      setPageCount(res.data.page_count);
    } catch (error) {
      console.log("Error loading dashboard:", error);
      setError(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // ✅ Fetch again when page changes

  return (
    <DashboardShell
      title="Agent Dashboard"
      subtitle="Customers you registered and their orders"
      actions={
        <button
          type="button"
          className="dash-btn secondary"
          onClick={fetchDashboard}
          disabled={loading}
          aria-label="Refresh"
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true"></i>
          <span>Refresh</span>
        </button>
      }
    >
      {error ? (
        <div className="dash-message error">
          <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
          Could not load the dashboard. Please try again.
          <div>
            <button type="button" className="dash-btn" onClick={fetchDashboard}>
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-stats">
            {STATS.map((stat) => (
              <div key={stat.key} className="dash-stat">
                <span className="dash-stat-icon">
                  <i className={`bi ${stat.icon}`} aria-hidden="true"></i>
                </span>
                <div>
                  <p className="dash-stat-value">{stats[stat.key]}</p>
                  <p className="dash-stat-label">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="dash-section-title">Registered Customers</h2>

          {entries.length === 0 ? (
            <div className="dash-message">
              <i
                className={`bi ${loading ? "bi-hourglass-split" : "bi-people"}`}
                aria-hidden="true"
              ></i>
              {loading ? "Loading customers..." : "No customers found."}
            </div>
          ) : (
            <div className={`dash-panel agent-table-wrap ${loading ? "is-loading" : ""}`}>
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Area</th>
                    <th>Pincode</th>
                    <th className="num">Before</th>
                    <th className="num">After</th>
                    <th className="num">Total</th>
                    <th>Added On</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Name" className="agent-name">{item.customer_name}</td>
                      <td data-label="Phone">{item.customer_phone}</td>
                      <td data-label="Area">{item.area}</td>
                      <td data-label="Pincode">{item.pincode}</td>
                      <td data-label="Before" className="num">{item.orders_before}</td>
                      <td data-label="After" className="num">{item.orders_after}</td>
                      <td data-label="Total" className="num">{item.total_orders}</td>
                      <td data-label="Added On">{item.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="agent-pagination">
              <button
                type="button"
                className="dash-btn secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                <i className="bi bi-chevron-left" aria-hidden="true"></i>
                Previous
              </button>

              <span>
                Page {page} of {pageCount}
              </span>

              <button
                type="button"
                className="dash-btn secondary"
                disabled={page >= pageCount || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
                <i className="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
