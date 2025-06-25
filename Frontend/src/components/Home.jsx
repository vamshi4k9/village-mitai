import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Mid from "./Mid";
import Bottom from "./Bottom";
import CategorySection from "./CategorySection";
import useAgentId from "./useAgentId";
import { API_BASE_URL} from '../constants'; 

export default function Home() {
  const [categories, setCategories] = useState([]);
  const { getUrlWithAgentId } = useAgentId();

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
    <div className="App">
      {/* Bootstrap Carousel */}
      <div
        id="homeCarousel"
        className="carousel slide"
        data-bs-ride="carousel"
        data-bs-interval="3000" // auto-slide every 3s
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
          {bannerImages.map((img, index) => (
            <div
              key={index}
              className={`carousel-item ${index === 0 ? "active" : ""}`}
            >
              <img
                src={img}
                className="d-block w-100 carousel-img"
                alt={`Banner ${index + 1}`}
              />
              <div
                className="carousel-caption d-flex flex-column justify-content-center align-items-center"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                }}
              >
                {/* {index === 1 && (
                  // <div className="text-white text-center">
                  //   <p style={{ fontSize: "1.5rem" }}>Our Collection</p>
                  //   <Link
                  //     to={getUrlWithAgentId("/items")}
                  //     className="btn btn-outline-light mt-3 px-4 py-2"
                  //     style={{ textTransform: "uppercase", fontSize: "0.9rem" }}
                  //   >
                  //     View Menu
                  //   </Link>
                  // </div>
                )} */}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
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
