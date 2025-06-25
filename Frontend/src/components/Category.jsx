import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import ProductCard from "./ProductCard";
import "../styles/ProductSection.css";
import { API_BASE_URL } from "../constants";

export default function Category() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { categorySlug } = useParams();
  const categoryName = categorySlug.replace(/-/g, " ");

  useEffect(() => {
    const fetchItems = async () => {
      try { 
        const itemRes = await axios.get(`${API_BASE_URL}/category/${categoryName}`);
        setItems(itemRes.data);
      } catch (error) {
        console.log("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [categoryName]);

  return (
    <div className="category-page">
      <h2 className="category-title">{categoryName}</h2>

      {loading ? (
        <p className="loading-text">Loading items...</p>
      ) : Array.isArray(items) && items.length > 0 ? (
        <div className="category-grid">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="loading-text">No items found in this category.</p>
      )}
    </div>
  );
}
