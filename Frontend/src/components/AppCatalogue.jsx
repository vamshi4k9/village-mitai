import React from "react";
import "../styles/AppCatalogue.css";

export default function AppCatalogue() {
  // Hardcoded list — edit this only!
  const catalogueItems = [
    { name: "Agent Dashboard", url: "/agent-dashboard" },
    { name: "Admin Dashboard", url: "/admin/dashboard" },
    { name: "Admin Login", url: "/admin-login" },
    { name: "Django Admin Login", url: "/admin/" },
    { name: "MetaBase Login", url: "/metabase/" },
    { name: "Maker Dashboard", url: "/maker/dashboard" },
    { name: "Delivey Dashboard", url: "/delivery/dashboard" },
    { name: "Login Page", url: "/login" },
    { name: "Register User", url: "/register" },
    { name: "Order Status", url: "/order_status" },
    { name: "Agent Page", url: "/agent-page" },
    ];

  return (
    <div className="dash-container mt-20">
      <div className="dash-card">

        <h2 className="dash-title">Catalogue</h2>

        <div className="catalogue-grid">
          {catalogueItems.map((item, idx) => (
            <button
              key={idx}
              className="catalogue-btn"
              onClick={() => (window.location.href = item.url)}
            >
              {item.name}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
