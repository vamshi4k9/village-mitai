import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AgentDashboard.css";
import { API_BASE_URL } from "../constants";

export default function AgentDashboard() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    registered_count: 0,
    total_orders_before: 0,
    total_orders_after: 0,
    total_orders: 0,
  });

  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const agentId = localStorage.getItem("agent_id") || 1;

  const fetchDashboard = async () => {
    setLoading(true);

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
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [page]); // ✅ Fetch again when page changes

  return (
    <div className="dash-container">
      <div className="dash-card">

        <h2 className="dash-title">Agent Dashboard</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* ✅ Summary Stats */}
            <div className="summary-grid">
              <div className="summary-box">
                <h3>{stats.registered_count}</h3>
                <p>Customers Registered</p>
              </div>

              <div className="summary-box">
                <h3>{stats.total_orders_before}</h3>
                <p>Orders Before Registration</p>
              </div>

              <div className="summary-box">
                <h3>{stats.total_orders_after}</h3>
                <p>Orders After Registration</p>
              </div>

              <div className="summary-box">
                <h3>{stats.total_orders}</h3>
                <p>Total Orders</p>
              </div>
            </div>

<h3 className="section-title">Registered Customers</h3>

<div className="table-wrap">
  <table className="customer-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Phone</th>
        <th>Area</th>
        <th>Pincode</th>
        <th>Before</th>
        <th>After</th>
        <th>Total</th>
        <th>Added On</th>
      </tr>
    </thead>
    <tbody>
      {entries.length === 0 ? (
        <tr>
          <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
            No customers found.
          </td>
        </tr>
      ) : (
        entries.map((item) => (
          <tr key={item.id}>
            <td data-label="Name">{item.customer_name}</td>
            <td data-label="Phone">{item.customer_phone}</td>
            <td data-label="Area">{item.area}</td>
            <td data-label="Pincode">{item.pincode}</td>
            <td data-label="Before">{item.orders_before}</td>
            <td data-label="After">{item.orders_after}</td>
            <td data-label="Total">{item.total_orders}</td>
            <td data-label="Added On">{item.created_at}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>


            {/* ✅ Pagination */}
            <div className="pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>

              <span>
                Page {page} of {pageCount}
              </span>

              <button
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
