import React, { useState, useEffect, useContext, useRef } from "react";
import { CartContext } from "./CartContext";
import useAgentId from "./useAgentId";
import "../styles/HeaderFooter.css";
import { useNavigate } from "react-router-dom"; // ⬅️ Added useNavigate

import { API_BASE_URL} from '../constants'; 

export default function Header({ toggleCart }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef(null);

  const [error, setError] = useState(null);
  const { totalItems } = useContext(CartContext);
  const { getUrlWithAgentId } = useAgentId();
  const navigate = useNavigate(); // ⬅️ Initialize
  const [showSearch, setShowSearch] = useState(false);


  useEffect(() => {
    fetch(`${API_BASE_URL}/categories/`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch categories");
        return response.json();
      })
      .then((data) => {
        setCategories(data);
        setLoadingCategories(false);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setError(err.message);
        setLoadingCategories(false);
      });
  }, []);



  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      const rawUrl = `/search?q=${encodeURIComponent(searchTerm.trim())}`;
      const fullUrlWithAgent = getUrlWithAgentId(rawUrl); // 🔥 will add agentId param
      navigate(fullUrlWithAgent);
      setIsOpen(false);
      setSearchTerm("");

    }
  };


  return (
    <>
      {/* Header (scrolls normally) */}
      <div className="main-header-wrapper">
        <nav className="navbar navbar-expand-md p-3 px-2 sticky-top" style={{
          position: "fixed",
          width: "100%",
          top: 0,
          zIndex: 1000,
          backgroundColor: "white",
          paddingLeft: '0'
        }}>
          <div className="container-fluid d-flex align-items-center justify-content-between">
            <a className="navbar-brand fw-bold d-none d-md-block" href={getUrlWithAgentId("/")}>
              <img src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`} alt="Partner with us" className="object-scale-down w-40" />
            </a>
            <div className="d-none d-md-flex align-items-center">
              <div className={`search-wrapper ${showSearch ? "expanded" : ""}`}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  style={{ display: showSearch ? "block" : "none" }}

                />
                <i
                  className="bi bi-search search-icon-inside"
                  onClick={() => setShowSearch(!showSearch)}
                ></i>
              </div>

              <a className="nav-link" href={getUrlWithAgentId("/profile")} style={{ marginLeft: '12px', marginRight: '10px' }}>
                <i className="bi bi-person user-icon"></i>
              </a>
              <button className="cart-btn desktop" onClick={toggleCart}>
                {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                <i className="bi bi-cart"></i>
              </button>
            </div>
            {/* Mobile Header */}
            <div className="d-md-none w-100 d-flex justify-content-between align-items-center">
              <button className="navbar-toggler border-0" type="button" onClick={() => setIsOpen(true)} style={{ paddingLeft: 0 }}>
                <span className="navbar-toggler-icon"></span>
              </button>

              <a className="navbar-brand text-center logo-mobile mb-0" href={getUrlWithAgentId("/")}>
                <img src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`} alt="Partner with us" className="object-scale-down w-40" />
              </a>

              <button className="cart-btn mobile" onClick={toggleCart}>
                {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                <i className="bi bi-cart"></i>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Sticky Category Bar */}

      <div className="d-none d-md-flex justify-content-center category-nav-sticky px-3 py-2" style={{
        marginTop: '80px',
        borderTop: '1px solid #f2f2f2',
        position: "fixed",
        width: "100%",
        top: 0,
        zIndex: 1000,
        backgroundColor: "#FFFFFF",
      }}>
        {loadingCategories && <span>Loading...</span>}
        {error && <span className="text-danger">Error: {error}</span>}
        <a className="category-link text-decoration-none px-3 text-dark" href={getUrlWithAgentId("/")}>
          Home
        </a>
        {!loadingCategories &&
          !error &&
          categories.map((cat) => (
            <a
              key={cat.id}
              href={getUrlWithAgentId(`/collections/${cat.name.toLowerCase().replace(/\s+/g, "-")}`)
              }
              className="px-3 text-decoration-none text-dark category-link"
            >
              {cat.name}
            </a>
          ))}




      </div>


      {/* Mobile Sidebar */}
      {isOpen && (
        <>
          <div className="mobile-sidebar">
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              &times;
            </button>
            <div className="mobile-sidebar-main">
              {/* Mobile Search Bar */}
              {/* Mobile Search (always visible) */}
              <div className="d-flex align-items-center w-100 mt-2" style={{ backgroundColor: '#edede9' }}>
                <div className="search-box-wrapper" style={{ position: "relative" }}>
                  <i className="bi bi-search search-icon-inside" />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    style={{
                      padding: '8px 10px',
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              <a className="d-block py-2 text-decoration-none" href={getUrlWithAgentId("/")}>
                Home
              </a>
              {loadingCategories && <p>Loading...</p>}
              {error && <p className="text-danger">Error: {error}</p>}
              {!loadingCategories &&
                !error &&
                categories.map((cat) => (
                  <a
                    key={cat.id}
                    className="d-block py-2 text-decoration-none"
                    href={getUrlWithAgentId(`/collections/${cat.name.toLowerCase().replace(/\s+/g, "-")}`)}
                  >
                    {cat.name}
                  </a>
                ))}
              <a className="d-block py-2 text-decoration-none" href={getUrlWithAgentId("/profile")}>
                Account
              </a>
            </div>
          </div>
          <div className="sidebar-backdrop" onClick={() => setIsOpen(false)}></div>
        </>
      )}
    </>
  );
}
