
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/HeaderFooter.css";
import useAgentId from "./useAgentId"; // Import hook to persist agentid

const QUICK_LINKS = [
  { label: "Home", path: "/" },
  { label: "Shop All Items", path: "/items" },
  { label: "About Us", path: "/about" },
];

const SERVICE_LINKS = [
  { label: "My Account & Orders", path: "/profile" },
  { label: "Contact Us", path: "/contact" },
  { label: "Privacy Policy", path: "/privacy" },
];

export default function Footer() {
  const { getUrlWithAgentId } = useAgentId(); // Get function to append agentid

  const renderLinks = (links) => (
    <ul className="site-footer-links">
      {links.map((link) => (
        <li key={link.path}>
          <a href={getUrlWithAgentId(link.path)}>{link.label}</a>
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`} alt="Village Mitai" />
          <p>A Sweet Legacy Since 1972</p>
        </div>

        <div className="site-footer-col">
          <h5>Quick Links</h5>
          {renderLinks(QUICK_LINKS)}
        </div>

        <div className="site-footer-col">
          <h5>Customer Service</h5>
          {renderLinks(SERVICE_LINKS)}
        </div>
      </div>

      <div className="site-footer-bottom">
        © {new Date().getFullYear()} Village Mitai. All rights reserved.
      </div>
    </footer>
  );
}
