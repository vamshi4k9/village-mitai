import { useParams } from "react-router-dom";
import { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { CartContext } from "./CartContext";
import ProductReviews from "./ProductPage/ProductReviews";
import SimilarItems from "./ProductPage/SimilarItems";

import { API_BASE_URL } from '../constants';
import { PIECE, isPiece, hasPieceOption } from '../utils/pricing';

import '../styles/ProductDetail.css'
import { VegMark, DeliveryIcon } from "./FoodIcons";
import { cartConfig } from '../utils/cartApi';

const ProductDetail = ({ productId }) => {
  const [refresh, setRefresh] = useState(false);
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const { cart, setCart, triggerToast } = useContext(CartContext);
  const [quantity, setQuantity] = useState(1); // Local quantity state
  const [descOpen, setDescOpen] = useState(true); // Toggle for description
  const [selectedWeight, setSelectedWeight] = useState(250); // default 250g
  const [activeImage, setActiveImage] = useState(0); // photo shown in the gallery
  const galleryRef = useRef(null);
  const buyRef = useRef(null); // weight + quantity + add to cart section
  const addBtnRef = useRef(null); // the Add to Cart button inside that section
  const stickyRef = useRef(null); // pinned phone bar
  const stickyBtnRef = useRef(null); // the button inside it
  const [addBtnVisible, setAddBtnVisible] = useState(false);
  const [justAdded, setJustAdded] = useState(false); // shows "Added ✓" on the button
  const addedTimer = useRef(null);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // the pinned phone button only shows until the real one reaches its spot
  // at the bottom of the screen; then they swap, so only one is ever in view
  useEffect(() => {
    const btn = addBtnRef.current;
    const bar = stickyRef.current;
    if (!btn || !bar) return;
    // distance from the screen bottom to the top of the pinned button
    const dockLine = bar.offsetHeight - bar.firstElementChild.offsetTop - 2;
    const observer = new IntersectionObserver(
      ([entry]) => setAddBtnVisible(entry.isIntersecting),
      { rootMargin: `0px 0px -${Math.max(dockLine, 0)}px 0px` }
    );
    observer.observe(btn);
    return () => observer.disconnect();
  }, [product]);


  useEffect(() => {
    // opening another item (e.g. from Similar Items) starts at the top, fresh
    window.scrollTo(0, 0);
    setQuantity(1);
    setActiveImage(0);
    if (galleryRef.current) galleryRef.current.scrollLeft = 0;
    axios.get(`${API_BASE_URL}/items/${id}/`)
      .then((response) => setProduct(response.data))
      .catch((error) => console.log("Error fetching product:", error));
  }, [id]);

  const weightOptions = product
    ? [
      { value: 250, label: '250g', price: product.price_quarter },
      { value: 500, label: '500g', price: product.price_half },
      { value: 1000, label: '1 KG', price: product.price },
      // sold by the piece only when both piece fields are filled in the admin
      ...(hasPieceOption(product)
        ? [{ value: PIECE, label: 'By Piece', price: product.piece_price }]
        : []),
    ]
    : [];

  const isSoldOut = product && product.available === false;

  // keep only available weights
  const availableWeights = weightOptions.filter(w => w.price !== null);
  useEffect(() => {
    if (
      availableWeights.length > 0 &&
      !availableWeights.some(w => w.value === selectedWeight)
    ) {
      setSelectedWeight(availableWeights[0].value);
    }
  }, [availableWeights]);

  if (!product) return null;
  // Increase quantity locally
  const increaseQuantity = () => setQuantity((Number(quantity) || 0) + 1);

  const toNumber = (val) =>
    val !== null && val !== undefined ? Number(val) : null;

  const getPriceByWeight = () => {
    if (!product) return { price: 0, discounted: null };

    switch (selectedWeight) {
      case PIECE:
        return {
          price: toNumber(product.piece_price),
          discounted: null,
        };

      case 250:
        return {
          price: toNumber(product.price_quarter),
          discounted: toNumber(product.discounted_price_quarter),
        };

      case 500:
        return {
          price: toNumber(product.price_half),
          discounted: toNumber(product.discounted_price_half),
        };

      case 1000:
        return {
          price: toNumber(product.price),
          discounted: toNumber(product.discounted_price),
        };

      default:
        return {
          price: toNumber(product.price),
          discounted: toNumber(product.discounted_price),
        };
    }
  };

  const { price, discounted } = getPriceByWeight();

  const hasDiscount =
    typeof price === "number" &&
    typeof discounted === "number" &&
    discounted > 0 &&
    discounted < price;


  const discountPercent = hasDiscount
    ? Math.round(((price - discounted) / price) * 100)
    : 0;


  // Decrease quantity locally, but not below 1
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const byPiece = isPiece(selectedWeight);
  const totalWeight = quantity * (byPiece ? Number(product.piece_weight) : selectedWeight);

  // typed piece count: digits only, at least 1
  const handleQuantityInput = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setQuantity(digits === "" ? "" : Math.max(1, parseInt(digits, 10)));
  };
  const handleQuantityBlur = () => {
    if (quantity === "" || quantity < 1) setQuantity(1);
  };
  const getSessionKey = () => {
    let sessionKey = localStorage.getItem('cart_session_key');
    if (!sessionKey) {
      sessionKey = `anon_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cart_session_key', sessionKey);
    }
    return sessionKey;
  };
  // Handle add to cart
  const handleCart = async () => {
    if (isSoldOut) return;
    if (!quantity || quantity < 1) {
      triggerToast("Please enter how many you need", 2000);
      return;
    }

    const config = {
      headers: (await cartConfig()).headers
    };
    try {
      const cartItem = cart.find(
        (cItem) => cItem.item.id === product.id && cItem.weight == selectedWeight
      );
      if (cartItem) {
        const updatedQuantity = cartItem.quantity + quantity;
        const token = localStorage.getItem('access_token');
        const res = await axios.patch(`${API_BASE_URL}/cart/${cartItem.id}/`, { quantity: updatedQuantity, weight: selectedWeight }, config);
        // the response carries the new line total as well as the quantity
        setCart(cart.map(item =>
          item.id === cartItem.id ? res.data : item
        ));
      } else {
        const payload = { item: product.id, quantity: quantity, weight: selectedWeight };
        const token = localStorage.getItem('access_token');
        const res = await axios.post(`${API_BASE_URL}/cart/`, payload, config);
        setCart([...cart, res.data]);
      }
      // the button itself confirms the add instead of a pop-up message
      setJustAdded(true);
      clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setJustAdded(false), 1600);
    } catch (error) {
      console.log(error);
      alert("Couldn't add to cart");
    }
  };

  // every photo of the item (main image first); older API responses only have `image`
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);

  // keep the dots / thumbnails in step with swiping
  const handleGalleryScroll = (e) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== activeImage) setActiveImage(index);
  };

  const showImage = (index) => {
    const el = galleryRef.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActiveImage(index);
  };

  // phone button: smoothly scrolls until the real Add to Cart sits exactly where
  // the pinned one is, with the weight / quantity options right above it
  const handleStickyAdd = () => {
    const real = addBtnRef.current;
    const pinned = stickyBtnRef.current;
    if (!real || !pinned) return;
    const distance = real.getBoundingClientRect().top - pinned.getBoundingClientRect().top;
    window.scrollTo({ top: window.scrollY + distance, behavior: "smooth" });
  };

  const formatWeight = (grams) =>
    grams >= 1000 ? `${grams / 1000} KG` : `${grams} g`;

  return (
    <>
    <div className={`pd-page ${isSoldOut ? "sold-out-page" : ""}`}>
      <div className="pd-layout">
        {/* Image */}
        <div className="pd-media">
          <div className="pd-gallery-wrap">
            <div className="pd-gallery" ref={galleryRef} onScroll={handleGalleryScroll}>
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={images.length > 1 ? `${product.name} – photo ${i + 1}` : product.name}
                  className="pd-image"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ))}
            </div>
            {isSoldOut && <span className="pd-soldout">SOLD OUT</span>}
            {images.length > 1 && (
              <>
                <button
                  className="pd-gallery-arrow prev"
                  onClick={() => showImage(Math.max(0, activeImage - 1))}
                  disabled={activeImage === 0}
                  aria-label="Previous photo"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button
                  className="pd-gallery-arrow next"
                  onClick={() => showImage(Math.min(images.length - 1, activeImage + 1))}
                  disabled={activeImage === images.length - 1}
                  aria-label="Next photo"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <div className="pd-dots">
                  {images.map((src, i) => (
                    <span key={i} className={i === activeImage ? "active" : ""} />
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Details */}
        <div className="pd-info">
          <div className="pd-head">
            <h1 className="pd-name">{product.name}</h1>
            {product.total_reviews > 0 && (
              <div className="pd-rating">
                ⭐ {product.avg_rating}
                <span>({product.total_reviews})</span>
              </div>
            )}
          </div>

          <div className="pd-price">
            {hasDiscount ? (
              <>
                <span className="pd-price-new discounted">Rs.{discounted}</span>
                <span className="pd-price-old">Rs.{price}</span>
                <span className="pd-price-off">({discountPercent}% OFF)</span>
              </>
            ) : (
              <span className="pd-price-new">Rs.{price}</span>
            )}
            {byPiece && <span className="pd-price-unit">per piece</span>}
          </div>
          <p className="pd-tax">Tax included. Shipping calculated at checkout.</p>

          {/* Key features */}
          <div className="pd-features">
            {product.veg !== null && (
              <div className="pd-feature">
                <VegMark veg={product.veg} />
                <span className="pd-long">{product.veg ? 'Vegetarian' : 'Non-Vegetarian'}</span>
                <span className="pd-short">{product.veg ? 'Veg' : 'Non-Veg'}</span>
              </div>
            )}

            <div className="pd-feature">
              <div className="pd-shelf">{product.shelf_life}</div>
              <span>Days Shelf Life</span>
            </div>

            <div className="pd-feature">
              <DeliveryIcon className="pd-delivery-icon" />
              <span>
                {product.delivery_time === 0
                  ? 'Instant Delivery'
                  : `${product.delivery_time} Day${product.delivery_time > 1 ? 's' : ''} Delivery`}
              </span>
            </div>
          </div>

          <div ref={buyRef} className="pd-buy">
          {/* Weight */}
          <div className="pd-option">
            <p className="pd-label">{hasPieceOption(product) ? "Weight / Pieces" : "Weight"}</p>
            <div className="pd-weights">
              {availableWeights.map((w) => (
                <button
                  key={w.value}
                  className={`pd-weight ${selectedWeight === w.value ? "selected" : ""}`}
                  onClick={() => setSelectedWeight(w.value)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity: a typed number of pieces, or a count of packs */}
          <div className="pd-option">
            <p className="pd-label">{byPiece ? "How many pieces?" : "Quantity"}</p>
            {byPiece && (
              <p className="pd-piece-note">
                Rs.{price} per piece · each piece is about {product.piece_weight} g
              </p>
            )}
            <div className="pd-qty-row">
              <div className="pd-qty">
                <button onClick={decreaseQuantity} aria-label="Decrease quantity">-</button>
                {byPiece ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    className="pd-qty-input"
                    value={quantity}
                    onChange={handleQuantityInput}
                    onBlur={handleQuantityBlur}
                    aria-label="Number of pieces"
                  />
                ) : (
                  <span>{quantity}</span>
                )}
                <button onClick={increaseQuantity} aria-label="Increase quantity">+</button>
              </div>
              <span className="pd-total-weight">
                {byPiece
                  ? `${quantity || 0} ${quantity === 1 ? "piece" : "pieces"} · about ${formatWeight(totalWeight)} · Rs.${(Number(price) * (quantity || 0)).toFixed(2)}`
                  : `Total Weight: ${formatWeight(totalWeight)}`}
              </span>
            </div>
          </div>

          <button
            ref={addBtnRef}
            className={`pd-add ${isSoldOut ? "disabled-btn" : ""} ${justAdded ? "added" : ""}`}
            onClick={handleCart}
            disabled={isSoldOut}
            aria-live="polite"
          >
            {isSoldOut ? "Sold Out" : justAdded ? (
              <span className="pd-added" key="added">
                <i className="bi bi-check-circle-fill"></i> Added
              </span>
            ) : "Add to Cart"}
          </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pd-desc">
              <button
                className="pd-desc-toggle"
                onClick={() => setDescOpen(!descOpen)}
                aria-expanded={descOpen}
              >
                Description
                <i className={`bi ${descOpen ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
              </button>

              {descOpen && (
                <div className="pd-desc-text">
                  {product.description
                    .split('\n')
                    .map((line, index) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('->')) {
                        return (
                          <li key={index}>
                            {trimmed.replace('->', '').trim()}
                          </li>
                        );
                      } else {
                        return <p key={index}>{trimmed}</p>;
                      }
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ProductReviews itemId={product.id} />
      <SimilarItems itemId={product.id} />
    </div>

      {/* phones only: pinned Add to Cart, swaps with the real one when it reaches this spot */}
      <div
        ref={stickyRef}
        className={`pd-sticky ${addBtnVisible ? "" : "show"}`}
        aria-hidden={addBtnVisible}
      >
        <button
          ref={stickyBtnRef}
          className={`pd-add ${isSoldOut ? "disabled-btn" : ""}`}
          onClick={handleStickyAdd}
          disabled={isSoldOut}
        >
          {isSoldOut ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </>
  );
};

export default ProductDetail;
