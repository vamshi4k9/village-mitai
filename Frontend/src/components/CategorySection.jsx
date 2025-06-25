import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import "../styles/CategorySection.css";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL} from '../constants'; 

export default function CategorySection({ categoryName, categoryImageUrl }) {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/category/${categoryName}`);
        setItems(res.data.slice(0, 9)); // Now showing 9 instead of 10
      } catch (error) {
        console.log("Error fetching items:", error);
      }
    };
    fetchItems();
  }, [categoryName]);

  return (
    <div className="container mt-5">
     

      <div className="flex-grid">
        {/* Category image card */}
        <div className="flex-item category-banner" onClick={() => navigate(`/collections/${categoryName}`)}>
          <img src={categoryImageUrl} alt={categoryName} className="category-banner-img" />
          <div className="category-banner-overlay">
            <div className="category-banner-text">{categoryName}</div>
            <div className="category-banner-button">View All</div>
          </div>
        </div>

        {/* Items */}
        {items.map((item) => (
          <div key={item.id} className="flex-item">
            <ProductCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

