import React, { useState, useEffect } from "react";
import axios from "axios";
import CategorySection from "./CategorySection";
import { API_BASE_URL } from '../constants';
import { useNavigate } from "react-router-dom";


export default function Home() {
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);

  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    const completed = localStorage.getItem("mobile_prompt_done");

    if (!completed) {
      setTimeout(() => setShowMobilePopup(true), 1500);
    }
  }, []);
  const [error, setError] = useState("");

const handleSubmitMobile = async () => {
  setError("");

  if (!mobile) {
    setError("Mobile number is required");
    return;
  }

  if (!/^\d+$/.test(mobile)) {
    setError("Only numbers are allowed");
    return;
  }

  if (mobile.length !== 10) {
    setError("Mobile number must be 10 digits");
    return;
  }

  if (!/^[6-9]/.test(mobile)) {
    setError("Enter valid Indian mobile number");
    return;
  }

  try {
    await axios.post(`${API_BASE_URL}/save-mobile/`, {
      mobile: mobile,
    });

    localStorage.setItem("mobile_prompt_done", "true");
    setShowMobilePopup(false);
  } catch (err) {
    if (err.response?.data?.error) {
      setError(err.response.data.error);
    } else {
      setError("Something went wrong. Try again.");
    }
  }
};

  const handleSkipMobile = () => {
    localStorage.setItem("mobile_prompt_done", "true");
    setShowMobilePopup(false);
  };

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
    <div className="mt-[4rem]">
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

      {showMobilePopup && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center px-3">

          {/* Popup */}
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl p-5">

            {/* Skip */}
            <button
              onClick={handleSkipMobile}
              className="absolute top-3 right-4 text-xs text-gray-500 underline"
            >
              Skip
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
                alt="Village Mitai"
                className="w-[120px]"
              />
            </div>

            {/* Heading */}
            <h2 className="text-base font-semibold text-center mb-1 text-[#4b2a0d]">
              Get updates and offers
            </h2>

            <p className="text-gray-600 text-center text-xs mb-4">
              Enter your mobile number to receive updates
            </p>

            {/* Input */}
            <input
              type="tel"
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setError("");
              }}
              className={`w-full border rounded-md px-3 py-2 mb-2 text-sm text-center focus:outline-none ${error
                ? "border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-gray-300 focus:ring-1 focus:ring-[#4b2a0d]"
                }`}
            />
            {error && (
              <p className="text-red-500 text-xs text-center mb-2">
                {error}
              </p>
            )}

            {/* Button */}
            <button
              onClick={handleSubmitMobile}
              className="w-full bg-[#4b2a0d] text-white py-2 rounded-md text-sm hover:bg-[#3a200a]"
            >
              Continue
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
