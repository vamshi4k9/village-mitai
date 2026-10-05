import React, { useContext, useState } from "react";
import { CartContext } from "./CartContext";
import { useNavigate } from "react-router-dom";
import useAgentId from "./useAgentId";
import "../styles/CartPopup.css";
import { Link } from "react-router-dom";
import GoogleLoginButton from '../components/GoogleLoginButton';
import { getValidAccessToken } from "../utils/auth";
import { isPiece, formatWeight } from "../utils/pricing";


const CartPopup = ({ isOpen, toggleCart }) => {
  const { cart, incQuant, decQuant, removeFromCart, total_1, totalItems } = useContext(CartContext);
  const navigate = useNavigate();
  const { getUrlWithAgentId } = useAgentId();
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const [authError, setAuthError] = useState("");

  const handleCheckout = async () => {
    // Logged-in users, and guests who already chose guest checkout in this
    // browser session, are not asked again
    const token = await getValidAccessToken();
    if (!token && !sessionStorage.getItem("checkout_as_guest")) {
      setAuthError("");
      setShowAuthPopup(true);
      return;
    }
    toggleCart(); // Close cart popup
    navigate(getUrlWithAgentId("/precheckout"));

  };

  const handleGoogleLogin = () => {
    setShowAuthPopup(false);
    toggleCart();
    navigate(getUrlWithAgentId("/precheckout"));
  };

  const getPriceByWeight = (item, weight) => {
    // bought by the piece: quantity is the number of pieces
    if (isPiece(weight)) return { price: Number(item.piece_price), discounted: null };

    let price, discounted;

    switch (Number(weight)) {
      case 250:
        price = Number(item.price_quarter);
        discounted = item.discounted_price_quarter;
        break;
      case 500:
        price = Number(item.price_half);
        discounted = item.discounted_price_half;
        break;
      case 1000:
      default:
        price = Number(item.price);
        discounted = item.discounted_price;
    }

    discounted = discounted !== null && discounted !== "" ? Number(discounted) : null;

    return { price, discounted };
  };



  const handleGuest = () => {
    sessionStorage.setItem("checkout_as_guest", "true");
    setShowAuthPopup(false);
    toggleCart();
    navigate(getUrlWithAgentId("/precheckout"));
  };

  const handleLogin = () => {
    setShowAuthPopup(false);
    toggleCart();
    navigate("/login");
  };

  const handleSignup = () => {
    setShowAuthPopup(false);
    toggleCart();
    navigate("/register");
  };

  const getFinalPrice = (item) => {
    if (isPiece(item.weight)) return Number(item.item.piece_price);

    let price, discounted;

    switch (Number(item.weight)) {
      case 250:
        price = Number(item.item.price_quarter);
        discounted = item.item.discounted_price_quarter;
        break;

      case 500:
        price = Number(item.item.price_half);
        discounted = item.item.discounted_price_half;
        break;

      default:
        price = Number(item.item.price);
        discounted = item.item.discounted_price;
    }

    discounted =
      discounted !== null &&
        discounted !== "" &&
        !isNaN(discounted) &&
        discounted > 0 &&
        discounted < price
        ? Number(discounted)
        : null;

    return discounted ?? price;
  };


  const total = cart.reduce((sum, cartItem) => {
    const finalPrice = getFinalPrice(cartItem);
    return sum + finalPrice * cartItem.quantity;
  }, 0);


  return (
    <>
      {isOpen && <div className="cart-overlay" onClick={toggleCart}></div>}

      <div className={`cart-popup ${isOpen ? "open" : ""}`}>
        <div className="cartd-head">
          <div className="cartd-title">
            Your Cart
            {totalItems > 0 && (
              <span className="cartd-count">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          <button className="cartd-close" onClick={toggleCart} aria-label="Close cart">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cartd-empty">
            <i className="bi bi-cart"></i>
            <p>Your cart is empty</p>
            <button className="cartd-btn" onClick={toggleCart}>Continue Shopping</button>
          </div>
        ) : (
          <div className="cartd-list">
            {cart.map((item) => {
              const { price, discounted } = getPriceByWeight(item.item, item.weight);

              const hasDiscount =
                discounted !== null &&
                !isNaN(discounted) &&
                discounted > 0 &&
                discounted < price;

              const finalPrice = hasDiscount ? discounted : price;
              const itemTotal = finalPrice * item.quantity;

              const discountPercent = hasDiscount
                ? Math.round(((price - discounted) / price) * 100)
                : 0;

              return (
                <div key={`${item.item.id}-${item.weight}`} className="cartd-item">
                  <Link to={`/product/${item.item.id}`} onClick={toggleCart}>
                    <img
                      src={item.item.image}
                      alt={item.item.name}
                      className="cartd-item-img"
                    />
                  </Link>

                  <div className="cartd-item-body">
                    <div className="cartd-item-top">
                      <Link
                        to={`/product/${item.item.id}`}
                        onClick={toggleCart}
                        className="cartd-item-name"
                      >
                        {item.item.name}
                      </Link>
                      <button
                        className="cartd-remove"
                        onClick={() => removeFromCart(item)}
                        aria-label="Remove item"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>

                    <span className="cartd-weight">
                      {formatWeight(item.weight, item.item)}
                    </span>

                    <div className="cartd-item-bottom">
                      <div className="cartd-qty">
                        <button onClick={() => decQuant(item)} aria-label="Decrease quantity">-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => incQuant(item)} aria-label="Increase quantity">+</button>
                      </div>
                      {isPiece(item.weight) && (
                        <span className="cartd-unit">{item.quantity === 1 ? "piece" : "pieces"}</span>
                      )}

                      <div className="cartd-price">
                        {hasDiscount && (
                          <span className="cartd-price-old">Rs.{price * item.quantity}</span>
                        )}
                        <span className={`cartd-price-new ${hasDiscount ? "discounted" : ""}`}>
                          Rs.{itemTotal}
                        </span>
                        {hasDiscount && (
                          <span className="cartd-price-off">({discountPercent}% OFF)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <div className="cartd-foot">
            <div className="cartd-total">
              <span>Subtotal</span>
              <span>Rs.{total}</span>
            </div>
            <p className="cartd-note">Delivery charges are calculated at checkout.</p>
            <button className="cartd-btn" onClick={handleCheckout}>Checkout</button>
          </div>
        )}
      </div>

      {/* Auth Popup */}
      {/* Auth Popup */}
      {showAuthPopup && (
        <div className="auth-popup-overlay">
          <div className="auth-popup">
            <h3 className="auth-title">Continue to Checkout</h3>
            {/* <p className="auth-subtitle">
              Login for faster checkout or continue as a guest
            </p> */}

            <div className="auth-actions">
              <button className="auth-btn guest" onClick={handleGuest}>
                Continue as Guest
              </button>
              <div className="auth-google">
                <GoogleLoginButton onLogin={handleGoogleLogin} onError={setAuthError} />
              </div>
              {authError && <p className="auth-error">{authError}</p>}

              {/* <button className="auth-btn login" onClick={handleLogin}>
                Login
              </button>

              <button className="auth-btn signup" onClick={handleSignup}>
                Sign Up
              </button> */}
            </div>

            <button className="auth-cancel" onClick={() => setShowAuthPopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </>
  );
};

export default CartPopup;