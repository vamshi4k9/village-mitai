import React from "react";
import DashboardShell from "./DashboardShell";
import "../styles/AppCatalogue.css";

// Hardcoded list — edit this only!
const CATALOGUE = [
  {
    title: "Order Dashboards",
    items: [
      { name: "Admin Dashboard", url: "/admin/dashboard", icon: "bi-speedometer2" },
      { name: "Maker Dashboard", url: "/maker/dashboard", icon: "bi-fire" },
      { name: "Delivery Dashboard", url: "/delivery/dashboard", icon: "bi-truck" },
    ],
  },
  {
    title: "Agents & Field Sales",
    items: [
      { name: "Agent Dashboard", url: "/agent-dashboard", icon: "bi-bar-chart" },
      { name: "Agent Page", url: "/agent-page", icon: "bi-person-badge" },
      { name: "Recruit Page", url: "/recruit", icon: "bi-person-plus" },
      { name: "Offline order", url: "/offline-order", icon: "bi-receipt" },
    ],
  },
  {
    title: "Sign In & Accounts",
    items: [
      { name: "Admin Login", url: "/admin-login", icon: "bi-shield-lock" },
      { name: "Login Page", url: "/login", icon: "bi-box-arrow-in-right" },
      { name: "Register User", url: "/register", icon: "bi-person-add" },
      { name: "Order Status", url: "/order_status", icon: "bi-geo" },
    ],
  },
  {
    title: "Admin Tools",
    items: [
      { name: "Django Admin Login", url: "/admin/", icon: "bi-gear" },
      { name: "MetaBase Login", url: "/metabase/", icon: "bi-pie-chart" },
    ],
  },
];

export default function AppCatalogue() {
  return (
    <DashboardShell title="Catalogue" subtitle="Every staff and agent page in one place">
      {CATALOGUE.map((group) => (
        <section key={group.title} className="catalogue-group">
          <h2 className="dash-section-title">{group.title}</h2>

          <div className="catalogue-grid">
            {group.items.map((item) => (
              // plain links: some of these (Django admin, Metabase) are served
              // outside the React app and need a full page load
              <a key={item.url} href={item.url} className="catalogue-card">
                <span className="dash-stat-icon">
                  <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                </span>
                <span className="catalogue-text">
                  <span className="catalogue-name">{item.name}</span>
                  <span className="catalogue-url">{item.url}</span>
                </span>
                <i className="bi bi-chevron-right catalogue-arrow" aria-hidden="true"></i>
              </a>
            ))}
          </div>
        </section>
      ))}
    </DashboardShell>
  );
}
