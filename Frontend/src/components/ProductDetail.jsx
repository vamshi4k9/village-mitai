import { useParams } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { CartContext } from "./CartContext";
import ReviewSection from "./ProductPage/ReviewSection";

import { API_BASE_URL } from '../constants';
import { PIECE, isPiece, hasPieceOption } from '../utils/pricing';

import '../styles/ProductDetail.css'

const ProductDetail = ({ productId }) => {
  const [refresh, setRefresh] = useState(false);
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const { cart, setCart, triggerToast } = useContext(CartContext);
  const [quantity, setQuantity] = useState(1); // Local quantity state
  const [descOpen, setDescOpen] = useState(true); // Toggle for description
  const [selectedWeight, setSelectedWeight] = useState(250); // default 250g


  useEffect(() => {
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
      headers: { 'X-Session-Key': getSessionKey() }
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
      triggerToast(`${product.name} added to cart`);
    } catch (error) {
      console.log(error);
      alert("Couldn't add to cart");
    }
  };

  const formatWeight = (grams) =>
    grams >= 1000 ? `${grams / 1000} KG` : `${grams} g`;

  return (
    <div className={`pd-page ${isSoldOut ? "sold-out-page" : ""}`}>
      <div className="pd-layout">
        {/* Image */}
        <div className="pd-media">
          <img src={product.image} alt={product.name} className="pd-image" />
          {isSoldOut && <span className="pd-soldout">SOLD OUT</span>}
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
                <img
                  src={`${process.env.PUBLIC_URL}/images/${product.veg ? 'veg-icon' : 'non-veg-icon'}.png`}
                  alt=""
                />
                <span>{product.veg ? 'Vegetarian' : 'Non-Vegetarian'}</span>
              </div>
            )}

            <div className="pd-feature">
              <div className="pd-shelf">{product.shelf_life}</div>
              <span>Days Shelf Life</span>
            </div>

            <div className="pd-feature">
              <img src={`${process.env.PUBLIC_URL}/images/Free_Express_Delivery.avif`} alt="" />
              <span>
                {product.delivery_time === 0
                  ? 'Instant Delivery'
                  : `${product.delivery_time} Day${product.delivery_time > 1 ? 's' : ''} Delivery`}
              </span>
            </div>
          </div>

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
            className={`pd-add ${isSoldOut ? "disabled-btn" : ""}`}
            onClick={handleCart}
            disabled={isSoldOut}
          >
            {isSoldOut ? "Sold Out" : "Add to Cart"}
          </button>

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
    </div>
  );
};

export default ProductDetail;
