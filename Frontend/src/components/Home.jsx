import React, { useState, useEffect } from "react";
import axios from "axios";
import CategorySection from "./CategorySection";
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

  const getColumns = (count) => {
    if (count <= 4) return count;
    if (count <= 8) return Math.ceil(count / 2);
    if (count <= 15) return 5;
    return 6;
  };

  const columns = getColumns(categories.length);

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

      {freeDeliveryAmount && (
        <div className="w-full bg-[#4b2a0d] text-white px-4 py-1 text-center shadow-sm">
          <p className="m-0 text-sm md:text-base font-medium">
            Free Delivery on orders above Rs.{freeDeliveryAmount}
          </p>
        </div>
      )}
      {/* Shop By Category */}
      <div className="py-2 bg-[#fffaf5]">
        <h2 className="text-xl md:text-2xl font-bold text-center text-[#4b2a0d] mb-4">
          Shop By Category
        </h2>

        <div
          className="grid gap-4 px-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/collections/${cat.name}`)}
              className="cursor-pointer text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-[#f3e3d3] shadow-sm">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="mt-2 text-sm font-medium text-[#4b2a0d]">
                {cat.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Sections */}
      {categories.map((cat) => (
        <CategorySection
          key={cat.id}
          categoryName={cat.name}
          categoryImageUrl={cat.image}
        />
      ))}

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
