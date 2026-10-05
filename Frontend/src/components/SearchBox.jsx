import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import useAgentId from "./useAgentId";
import { API_BASE_URL } from "../constants";
import "../styles/SearchBox.css";

const MAX_SUGGESTIONS = 6;

// The one search box used in the header on both laptop and mobile. Results
// show directly under it while typing; it closes itself after a result is
// picked, after Enter, on Escape, on a click outside and on every page change.
// onClose (optional) lets the mobile header hide the bar it sits in.
export default function SearchBox({ autoFocus = false, onClose }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { getUrlWithAgentId } = useAgentId();

  const query = term.trim();

  // fetch results a moment after the user stops typing
  useEffect(() => {
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/search/`, { params: { q: query } });
        if (!cancelled) {
          setResults(res.data);
          setSearched(true);
        }
      } catch (error) {
        console.log("Error fetching search results:", error);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const close = () => {
    setOpen(false);
    setTerm("");
    if (onClose) onClose();
  };

  // close on any page change
  useEffect(() => {
    setOpen(false);
    setTerm("");
  }, [location.pathname, location.search]);

  // close on a click or tap outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const goTo = (url) => {
    navigate(getUrlWithAgentId(url));
    close();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query) goTo(`/search?q=${encodeURIComponent(query)}`);
  };

  const getPrice = (item) => {
    const price = item.price_quarter ?? item.price_half ?? item.price;
    const discounted =
      item.discounted_price_quarter ?? item.discounted_price_half ?? item.discounted_price;
    return discounted && Number(discounted) > 0 && Number(discounted) < Number(price)
      ? Number(discounted)
      : Number(price);
  };

  return (
    <div className="search-box" ref={boxRef}>
      <form className="search-box-bar" onSubmit={handleSubmit}>
        <i className="bi bi-search" onClick={handleSubmit}></i>
        <input
          type="text"
          enterKeyHint="search"
          placeholder="Search sweets, snacks..."
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        />
        {(term || onClose) && (
          <button type="button" className="search-box-clear" onClick={close} aria-label="Close search">
            ✕
          </button>
        )}
      </form>

      {open && query && searched && (
        <div className="search-box-results">
          {results.length === 0 ? (
            <p className="search-box-empty">No items found for "{query}"</p>
          ) : (
            <>
              {results.slice(0, MAX_SUGGESTIONS).map((item) => (
                <div
                  key={item.id}
                  className={`search-box-item ${item.available === false ? "sold-out" : ""}`}
                  onClick={() => goTo(`/product/${item.id}`)}
                >
                  <img src={item.image} alt={item.name} />
                  <span className="search-box-item-name">{item.name}</span>
                  <span className="search-box-item-price">
                    {item.available === false ? "Sold Out" : `Rs.${getPrice(item)}`}
                  </span>
                </div>
              ))}
              {results.length > MAX_SUGGESTIONS && (
                <div
                  className="search-box-all"
                  onClick={() => goTo(`/search?q=${encodeURIComponent(query)}`)}
                >
                  View all {results.length} results
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
