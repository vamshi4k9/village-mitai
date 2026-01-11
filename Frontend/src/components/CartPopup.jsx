import React, { useContext, useState } from "react";
import { CartContext } from "./CartContext";
import { useNavigate } from "react-router-dom";
import useAgentId from "./useAgentId";
import "../styles/CartPopup.css";
import { Link } from "react-router-dom";


const CartPopup = ({ isOpen, toggleCart }) => {
  const { cart, incQuant, decQuant, removeFromCart, total, totalItems } = useContext(CartContext);
  const navigate = useNavigate();
  const { getUrlWithAgentId } = useAgentId();
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const handleCheckout = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setShowAuthPopup(true);
      return;
    }
    toggleCart(); // Close cart popup
    navigate(getUrlWithAgentId("/precheckout"));

    const orderData = {
      total: total,
      totalItems: totalItems,
      items: cart.map(item => ({
        id: item.item.id,
        name: item.item.name,
        quantity: item.quantity,
        price: item.item.price,
      })),
    };
  };

  const getPriceByWeight = (item, weight) => {
    switch (Number(weight)) {
      case 250:
        return {
          price: Number(item.price_quarter),
          discounted: Number(item.discounted_price_quarter),
        };
      case 500:
        return {
          price: Number(item.price_half),
          discounted: Number(item.discounted_price_half),
        };
      case 1000:
      default:
        return {
          price: Number(item.price),
          discounted: Number(item.discounted_price),
        };
    }
  };


  const handleGuest = () => {
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

  return (
    <>
      {isOpen && <div className="cart-overlay" onClick={toggleCart}></div>}

      <div className={`cart-popup ${isOpen ? "open" : ""}`}>
        <div className="cart-header">
          <div>Your Cart {totalItems > 0 && <span className="cart-count-cart">{totalItems}</span>}</div>
          <button className="close-btn text-xs" onClick={toggleCart}><i className="bi bi-x"></i></button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">Your cart is empty</div>
        ) : (
          <div className="cart-items">
            {cart.map((item) => {
              const { price, discounted } = getPriceByWeight(item.item, item.weight);

              const hasDiscount =
                discounted !== null &&
                !isNaN(discounted) &&
                discounted < price;

              const finalPrice = hasDiscount ? discounted : price;
              const itemTotal = finalPrice * item.quantity;

              const discountPercent = hasDiscount
                ? Math.round(((price - discounted) / price) * 100)
                : 0;

              return (
                <div key={item.item.id} className="cart-item">

                  <div className="flex">
                    <Link
                      to={`/product/${item.item.id}`}
                      onClick={toggleCart}
                    >
                      <img
                        src={item.item.image}
                        alt={item.item.name}
                        className="cart-item-img"
                      />
                    </Link>
                    <div className="cart-item-details">
                      <div className="cart-item-info">
                        <div className="cart-item-name" >
                          <Link
                            to={`/product/${item.item.id}`}
                            onClick={toggleCart}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            {item.item.name}
                          </Link>
                        </div>
                        {item.item.available}
                        <div className="cart-item-price">
                          {hasDiscount ? (
                            <>
                              <div>
                                <span
                                  style={{
                                    textDecoration: "line-through",
                                    color: "#888",
                                    marginRight: "6px"
                                  }}
                                >
                                  Rs.{price * item.quantity}
                                </span>

                                <span style={{ fontWeight: "bold", color: "green" }}>
                                  Rs.{itemTotal}
                                </span>
                              </div>

                              <div style={{ fontSize: "12px", color: "#d32f2f" }}>
                                ({discountPercent}% OFF)
                              </div>
                            </>
                          ) : (
                            <span style={{ fontWeight: "bold" }}>
                              Rs.{itemTotal}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="cart-item-weight">
                        {item.weight >= 1000
                          ? `${item.weight / 1000} KG`
                          : `${item.weight} g`}
                      </div>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="cart-item-actions">
                      <div className="cart-quantity">
                        <button onClick={() => decQuant(item)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => incQuant(item)}>+</button>
                      </div>
                    </div>
                    <button className="remove-btn ml-3" onClick={() => removeFromCart(item)}>Remove</button>
                  </div>
                </div>
              );
            })}

          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-footer">
            <p className="cart-total font-semibold">Total: Rs.{total} </p>
            <div className="checkout-btn cursor-pointer rounded-md" onClick={handleCheckout}>
              <span className="checkout-btn-txt font-semibold">Checkout</span>
            </div>
          </div>
        )}
      </div>

      {/* Auth Popup */}
{/* Auth Popup */}
{showAuthPopup && (
  <div className="auth-popup-overlay">
    <div className="auth-popup">
      <h3 className="auth-title">Continue to Checkout</h3>
      <p className="auth-subtitle">
        Login for faster checkout or continue as a guest
      </p>

      <div className="auth-actions">
        <button className="auth-btn guest" onClick={handleGuest}>
          Continue as Guest
        </button>

        <button className="auth-btn login" onClick={handleLogin}>
          Login
        </button>

        <button className="auth-btn signup" onClick={handleSignup}>
          Sign Up
        </button>
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