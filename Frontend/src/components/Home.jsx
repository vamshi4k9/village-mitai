import React, { useState, useEffect } from "react";
import axios from "axios";
import CategorySection from "./CategorySection";
import { API_BASE_URL } from '../constants';
import { useNavigate } from "react-router-dom";


export default function Home() {
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);

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

  const bannerImages = [
    `${process.env.PUBLIC_URL}/images/top_img_1.webp`,
    `${process.env.PUBLIC_URL}/images/top_img_2.webp`,
    `${process.env.PUBLIC_URL}/images/top_img_3.webp`,
  ];

  return (
    <div className="mt-[6rem]">
      <div
        id="homeCarousel"
        className="carousel slide"
        data-bs-ride="carousel"
        data-bs-interval="3000"
      >
        {/* Indicator dots */}
        <div className="carousel-indicators">
          {bannerImages.map((_, index) => (
            <button
              key={index}
              type="button"
              data-bs-target="#homeCarousel"
              data-bs-slide-to={index}
              className={index === 0 ? "active" : ""}
              aria-current={index === 0 ? "true" : undefined}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
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
      </div>

      {/* Category Sections */}
      {categories.map((cat) => (
        <CategorySection
          key={cat.id}
          categoryName={cat.name}
          categoryImageUrl={cat.image}
        />
      ))}

      {/* Optional sections */}
      {/* <Mid /> */}
      {/* <Bottom /> */}
    </div>
  );
}
