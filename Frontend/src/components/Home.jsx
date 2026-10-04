import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import "../styles/CategorySection.css";
import "../styles/Home.css";
import { API_BASE_URL } from '../constants';
import { useNavigate } from "react-router-dom";


export default function Home() {
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState(null);
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const [mobile, setMobile] = useState("");
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

  const [whatsappNumber, setWhatsappNumber] = useState("");
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/site-config/`);
        setWhatsappNumber(res.data.whatsapp_number);
      } catch (err) {
        console.log(err);
      }
    };
    fetchSiteConfig();
  }, []);

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      "Hi Village Mitai, I need a help."
    )}`
    : "#";

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

      {showMobilePopup && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center px-3">

          {/* Popup */}
          <div className="relative w-full max-w-sm bg-white rounded-md shadow-xl p-5">

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
      {whatsappNumber && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-[9998] rounded-full shadow-lg p-2 hover:scale-110 transition-transform"
        >
          <img
            src={`${process.env.PUBLIC_URL}/images/whatsapplogo.png`}
            alt="WhatsApp"
            className="w-8 h-8"
          />
        </a>
      )}
    </div>
  );
}
