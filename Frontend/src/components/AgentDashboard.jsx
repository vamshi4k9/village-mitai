import React, { useEffect, useState } from "react";
import axios from "axios";
import DashboardShell from "./DashboardShell";
import "../styles/AgentDashboard.css";
import { API_BASE_URL } from "../constants";
import { getStaffToken } from "../utils/staffAuth";

const COMMISSION_STATS = [
  { key: "coupon_orders", label: "Orders With Your Coupons", icon: "bi-ticket-perforated" },
  { key: "coupon_sales", label: "Sales (items paid)", icon: "bi-cash-stack", money: true },
  { key: "commission_percent", label: "Your Commission Rate", icon: "bi-percent", percent: true },
  { key: "commission_earned", label: "Commission Earned", icon: "bi-wallet2", money: true },
];

const REGISTRATION_STATS = [
  { key: "registration_orders", label: "Orders From Your Customers", icon: "bi-person-check" },
  { key: "registration_sales", label: "Sales (items paid)", icon: "bi-cash-stack", money: true },
  { key: "registration_commission_percent", label: "Your Registration Rate", icon: "bi-percent", percent: true },
  { key: "registration_commission_earned", label: "Registration Commission", icon: "bi-wallet2", money: true },
];

const formatStat = (stat, value) => {
  if (stat.money) return `Rs.${Number(value || 0).toFixed(2)}`;
  if (stat.percent) return `${Number(value || 0)}%`;
  return value ?? 0;
};

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
  const [coupons, setCoupons] = useState([]);
  const [couponOrders, setCouponOrders] = useState([]);
  const [registrationOrders, setRegistrationOrders] = useState([]);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(false);
    setNeedsLogin(false);

    try {
      const token = getStaffToken();
      if (!token) {
        setNeedsLogin(true);
        setError(true);
        setLoading(false);
        return;
      }

      const res = await axios.get(
        // the server works out the agent from the login
        `${API_BASE_URL}/agent-dashboard/?page=${page}`,
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
      setCoupons(res.data.coupons || []);
      setCouponOrders(res.data.coupon_orders || []);
      setRegistrationOrders(res.data.registration_orders || []);
      setStats(res.data.stats);
      setPage(res.data.page);
      setPageCount(res.data.page_count);
    } catch (error) {
      console.log("Error loading dashboard:", error);
      const code = error.response?.status;
      if (code === 401 || code === 403) setNeedsLogin(true);
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
      subtitle="Your coupon orders, commission and the customers you registered"
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
          {needsLogin
            ? "Please log in with your agent account to see your dashboard."
            : "Could not load the dashboard. Please try again."}
          <div>
            {needsLogin ? (
              <a className="dash-btn" href="/admin-login">Log In</a>
            ) : (
              <button type="button" className="dash-btn" onClick={fetchDashboard}>
                Try Again
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* everything earned, both kinds of commission */}
          <div className="agent-total">
            <span className="agent-total-label">Total Commission Earned</span>
            <span className="agent-total-value">{formatStat({ money: true }, stats.total_commission_earned)}</span>
            <span className="agent-total-split">
              Coupons {formatStat({ money: true }, stats.commission_earned)} · Registrations{" "}
              {formatStat({ money: true }, stats.registration_commission_earned)}
            </span>
          </div>

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

          <h2 className="dash-section-title">
            Your Coupons{coupons.length > 0 ? `: ${coupons.join(", ")}` : ""}
          </h2>

          <div className="dash-stats">
            {COMMISSION_STATS.map((stat) => (
              <div key={stat.key} className="dash-stat">
                <span className="dash-stat-icon">
                  <i className={`bi ${stat.icon}`} aria-hidden="true"></i>
                </span>
                <div>
                  <p className="dash-stat-value">{formatStat(stat, stats[stat.key])}</p>
                  <p className="dash-stat-label">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {couponOrders.length === 0 ? (
            <div className="dash-message">
              <i className="bi bi-ticket-perforated" aria-hidden="true"></i>
              {coupons.length === 0
                ? "No coupons are linked to you yet."
                : "No orders with your coupons yet."}
            </div>
          ) : (
            <div className={`dash-panel agent-table-wrap ${loading ? "is-loading" : ""}`}>
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Coupon</th>
                    <th>Status</th>
                    <th className="num">Items Paid</th>
                    <th className="num">Rate</th>
                    <th className="num">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {couponOrders.map((o) => (
                    <tr key={o.order_number}>
                      <td data-label="Order" className="agent-name">{o.order_number}</td>
                      <td data-label="Date">{o.order_date}</td>
                      <td data-label="Coupon">{o.coupon_code}</td>
                      <td data-label="Status">{o.status === "CANCELLED" ? "Cancelled" : o.status.replace(/_/g, " ").toLowerCase()}</td>
                      <td data-label="Items Paid" className="num">Rs.{Number(o.commission_base || 0).toFixed(2)}</td>
                      <td data-label="Rate" className="num">{Number(o.commission_percent || 0)}%</td>
                      <td data-label="Commission" className="num">
                        Rs.{Number(o.commission || 0).toFixed(2)}
                        {o.paid_as_registration && (
                          <span className="agent-note">paid as registration</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="dash-section-title">Registration Commission</h2>
          <p className="agent-rule">
            On orders from customers you registered, matched by their email or mobile number
            {stats.registration_commission_days
              ? `, for ${stats.registration_commission_days} days after registration`
              : ""}
            . If an order also uses your coupon, the higher commission is paid.
          </p>

          <div className="dash-stats">
            {REGISTRATION_STATS.map((stat) => (
              <div key={stat.key} className="dash-stat">
                <span className="dash-stat-icon">
                  <i className={`bi ${stat.icon}`} aria-hidden="true"></i>
                </span>
                <div>
                  <p className="dash-stat-value">{formatStat(stat, stats[stat.key])}</p>
                  <p className="dash-stat-label">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {registrationOrders.length === 0 ? (
            <div className="dash-message">
              <i className="bi bi-person-check" aria-hidden="true"></i>
              No orders from your registered customers yet.
            </div>
          ) : (
            <div className={`dash-panel agent-table-wrap ${loading ? "is-loading" : ""}`}>
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="num">Items Paid</th>
                    <th className="num">Rate</th>
                    <th className="num">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationOrders.map((o) => (
                    <tr key={o.order_number}>
                      <td data-label="Order" className="agent-name">{o.order_number}</td>
                      <td data-label="Date">{o.order_date}</td>
                      <td data-label="Customer">{o.customer}</td>
                      <td data-label="Status">{o.status === "CANCELLED" ? "Cancelled" : o.status.replace(/_/g, " ").toLowerCase()}</td>
                      <td data-label="Items Paid" className="num">Rs.{Number(o.commission_base || 0).toFixed(2)}</td>
                      <td data-label="Rate" className="num">{Number(o.commission_percent || 0)}%</td>
                      <td data-label="Commission" className="num">
                        Rs.{Number(o.commission || 0).toFixed(2)}
                        {o.paid_as_coupon && <span className="agent-note">paid as coupon</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                    <th>Email</th>
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
                      <td data-label="Email">{item.customer_email || "-"}</td>
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
