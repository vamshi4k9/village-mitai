import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import MobilePrompt from "./MobilePrompt";
import WhatsAppButton from "./WhatsAppButton";
import "../styles/CategorySection.css";
import "../styles/Home.css";
import { API_BASE_URL } from '../constants';
import { useNavigate } from "react-router-dom";


export default function Home() {
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState(null);
  useEffect(() => {
    const fetchDeliveryConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/delivery-config/`);
        setFreeDeliveryAmount(res.data.free_delivery_above);
      } catch (error) {
        console.log(error);
      }
    };

    fetchDeliveryConfig();
  }, []);
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/banners/`);
        setBanners(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchBanners();
  }, []);

  const navigate = useNavigate();

  const handleBannerClick = (banner) => {
    if (banner.item_id) {
      navigate(`/product/${banner.item_id}`);
    } else if (banner.category_name) {
      navigate(`/collections/${banner.category_name}`);
    }
  };
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/categories/`);
        setCategories(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchCategories();
  }, []);

  const [items, setItems] = useState([]);
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/items/`);
        setItems(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchItems();
  }, []);

  return (
    <div className="home">
      {/* Banner */}
      {banners.length > 0 && (
        <div className="home-banner">
          <div
            id="homeCarousel"
            className="carousel slide"
            data-bs-ride="carousel"
            data-bs-interval="3000"
          >
            {/* Indicator dots */}
            {banners.length > 1 && (
              <div className="carousel-indicators">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    data-bs-target="#homeCarousel"
                    data-bs-slide-to={index}
                    className={index === 0 ? "active" : ""}
                    aria-current={index === 0 ? "true" : undefined}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
            <div className="carousel-inner">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`carousel-item ${index === 0 ? "active" : ""}`}
                  onClick={() => handleBannerClick(banner)}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={banner.image}
                    className="d-block w-100 carousel-img"
                    alt={`Banner ${index + 1}`}
                  />
                </div>
              ))}
            </div>

            {banners.length > 1 && (
              <>
                <button
                  className="carousel-control-prev"
                  type="button"
                  data-bs-target="#homeCarousel"
                  data-bs-slide="prev"
                >
                  <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                </button>
                <button
                  className="carousel-control-next"
                  type="button"
                  data-bs-target="#homeCarousel"
                  data-bs-slide="next"
                >
                  <span className="carousel-control-next-icon" aria-hidden="true"></span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {freeDeliveryAmount && (
        <div className="home-strip">
          <i className="bi bi-truck"></i>
          <p>Free Delivery on orders above Rs.{freeDeliveryAmount}</p>
        </div>
      )}

      {/* Shop By Category */}
      {categories.length > 0 && (
        <div className="home-section">
          <h2 className="page-title">Shop By Category</h2>

          <div className="home-categories">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigate(`/collections/${cat.name}`)}
                className="home-category"
              >
                <div className="home-category-img">
                  <img src={cat.image} alt={cat.name} />
                </div>
                <p>{cat.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All items in one continuous grid, in the order the backend sends
          (sort order, then bestsellers, out of stock last) */}
      {items.length > 0 && (
        <div className="home-section">
          <h2 className="page-title">Our Collection</h2>

          <div className="container">
            <div className="flex-grid">
              {items.map((item) => (
                <div key={item.id} className="flex-item">
                  <ProductCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <MobilePrompt />
      <WhatsAppButton />
    </div>
  );
}
