import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { CartContext } from "./CartContext";
import useAgentId from "./useAgentId";
import SearchBox from "./SearchBox";
import "../styles/HeaderFooter.css";

import { API_BASE_URL } from '../constants';

const slugify = (name) => name.toLowerCase().replace(/\s+/g, "-");

export default function Header({ toggleCart }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [error, setError] = useState(null);
  const { totalItems } = useContext(CartContext);
  const { getUrlWithAgentId } = useAgentId();
  const [showSearch, setShowSearch] = useState(false); // mobile search bar
  const location = useLocation();

  useEffect(() => {
    // axios (not fetch) so the route loader waits for the categories too
    axios.get(`${API_BASE_URL}/categories/`)
      .then((response) => {
        setCategories(response.data);
        setLoadingCategories(false);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setError(err.message);
        setLoadingCategories(false);
      });
  }, []);

  // the side menu closes itself when the page changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // used to highlight the page you are on in both menus
  const currentPath = slugify(decodeURIComponent(location.pathname));
  const activeClass = (path) => (currentPath === path ? "active" : "");

  const links = [
    { key: "home", label: "Home", path: "/", icon: "bi-house" },
    ...(!loadingCategories && !error
      ? categories.map((cat) => ({
          key: cat.id,
          label: cat.name,
          path: `/collections/${slugify(cat.name)}`,
          image: cat.image,
        }))
      : []),
  ];

  const logo = `${process.env.PUBLIC_URL}/images/villageLogoLong.png`;

  return (
    <>
      {/* Top bar */}
      <nav className="site-nav">
        {/* Laptop: logo | search | account + cart */}
        <div className="site-nav-row d-none d-md-flex">
          <a className="site-nav-logo" href={getUrlWithAgentId("/")}>
            <img src={logo} alt="Village Mitai" />
          </a>

          <div className="site-nav-search">
            <SearchBox />
          </div>

          <div className="site-nav-actions">
            <a className="site-nav-btn" href={getUrlWithAgentId("/profile")} aria-label="Account">
              <i className="bi bi-person"></i>
              <span className="site-nav-btn-label">Account</span>
            </a>
            <button className="site-nav-btn" onClick={toggleCart} aria-label="Cart">
              <span className="site-nav-icon">
                <i className="bi bi-cart"></i>
                {totalItems > 0 && <span className="site-nav-count">{totalItems}</span>}
              </span>
              <span className="site-nav-btn-label">Cart</span>
            </button>
          </div>
        </div>

        {/* Mobile: menu | logo | search + cart */}
        <div className="site-nav-row d-md-none">
          <div className="site-nav-side">
            <button className="site-nav-btn" onClick={() => setIsOpen(true)} aria-label="Menu">
              <i className="bi bi-list"></i>
            </button>
          </div>

          <a className="site-nav-logo" href={getUrlWithAgentId("/")}>
            <img src={logo} alt="Village Mitai" />
          </a>

          <div className="site-nav-side end">
            <button className="site-nav-btn" onClick={() => setShowSearch(true)} aria-label="Search">
              <i className="bi bi-search"></i>
            </button>
            <button className="site-nav-btn" onClick={toggleCart} aria-label="Cart">
              <span className="site-nav-icon">
                <i className="bi bi-cart"></i>
                {totalItems > 0 && <span className="site-nav-count">{totalItems}</span>}
              </span>
            </button>
          </div>

          {/* Mobile search: the same box, laid over the header. It closes
              itself after a search, and on a tap outside */}
          {showSearch && (
            <>
              <div
                className="mobile-search-backdrop"
                onClick={() => setShowSearch(false)}
              ></div>
              <div className="mobile-search-overlay">
                <SearchBox autoFocus onClose={() => setShowSearch(false)} />
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Category bar (laptop) */}
      <div className="d-none d-md-block category-nav-sticky">
        <div className="category-nav-inner">
          {error && <span className="text-danger">Error: {error}</span>}
          {links.map((link) => (
            <a
              key={link.key}
              href={getUrlWithAgentId(link.path)}
              className={`category-link ${activeClass(link.path)}`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Side menu (mobile) */}
      {isOpen && (
        <>
          <div className="mobile-sidebar">
            <div className="mobile-sidebar-head">
              <img src={logo} alt="Village Mitai" />
              <button className="site-nav-btn" onClick={() => setIsOpen(false)} aria-label="Close menu">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="mobile-sidebar-main">
              <p className="mobile-sidebar-title">Shop</p>
              {error && <p className="text-danger px-3">Error: {error}</p>}
              {links.map((link) => (
                <a
                  key={link.key}
                  className={`mobile-sidebar-link ${activeClass(link.path)}`}
                  href={getUrlWithAgentId(link.path)}
                >
                  {link.image ? (
                    <img src={link.image} alt="" className="mobile-sidebar-thumb" />
                  ) : (
                    <span className="mobile-sidebar-thumb">
                      <i className={`bi ${link.icon}`}></i>
                    </span>
                  )}
                  <span className="mobile-sidebar-label">{link.label}</span>
                  <i className="bi bi-chevron-right"></i>
                </a>
              ))}
            </div>

            <div className="mobile-sidebar-foot">
              <a
                className={`mobile-sidebar-link ${activeClass("/profile")}`}
                href={getUrlWithAgentId("/profile")}
              >
                <span className="mobile-sidebar-thumb">
                  <i className="bi bi-person"></i>
                </span>
                <span className="mobile-sidebar-label">My Account</span>
                <i className="bi bi-chevron-right"></i>
              </a>
            </div>
          </div>
          <div className="sidebar-backdrop" onClick={() => setIsOpen(false)}></div>
        </>
      )}
    </>
  );
}
