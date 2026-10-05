import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import ProductCard from "./ProductCard";
import useAgentId from "./useAgentId";
import { API_BASE_URL} from '../constants';
import "../styles/CategorySection.css";
import "../styles/SearchResults.css";

export default function SearchResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { getUrlWithAgentId } = useAgentId();

  const query = (new URLSearchParams(location.search).get("q") || "").trim();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/search/`, { params: { q: query } });
        setResults(res.data);
      } catch (error) {
        console.log("Error fetching search results:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchResults();
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="container search-page">
      <h2 className="page-title">Search Results</h2>
      {!loading && query && (
        <p className="search-page-summary">
          {results.length > 0
            ? `${results.length} ${results.length === 1 ? "item" : "items"} found for "${query}"`
            : `No items found for "${query}"`}
        </p>
      )}

      {!loading && !query && (
        <p className="search-page-summary">Type an item or category name to search.</p>
      )}

      {!loading && query && results.length === 0 && (
        <div className="search-page-empty">
          <p>Try a shorter word, or browse everything we make.</p>
          <button onClick={() => navigate(getUrlWithAgentId("/items"))}>View All Items</button>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex-grid">
          {results.map((item) => (
            <div key={item.id} className="flex-item">
              <ProductCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
