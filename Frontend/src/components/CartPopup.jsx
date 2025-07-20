import React, { useContext, useState } from "react";
import { CartContext } from "./CartContext";
import {  useNavigate } from "react-router-dom"; // ⬅️ Added useNavigate
import useAgentId from "./useAgentId";
import "../styles/CartPopup.css";


const CartPopup = ({ isOpen, toggleCart }) => {
  const { cart, incQuant, decQuant, removeFromCart, total, totalItems } = useContext(CartContext);
  const navigate = useNavigate(); // ⬅️ Initialize
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
          <h4>Your Cart {totalItems > 0 && <span className="cart-count">{totalItems}</span>}</h4>
          <button className="close-btn" onClick={toggleCart}><i className="bi bi-x"></i></button>
        </div>

        {cart.length === 0 ? (
          <p className="empty-cart">Your cart is empty</p>
        ) : (
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.item.id} className="cart-item">
                <img src={item.item.image} alt={item.item.name} className="cart-item-img" />
                <div className="cart-item-details">
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.item.name}</p>
                    <p className="cart-item-price">Rs. {item.item.price} INR</p>
                  </div>
                  <div className="cart-item-actions">
                    <div className="cart-quantity">
                      <button onClick={() => decQuant(item)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => incQuant(item)}>+</button>
                    </div>
                    <button className="remove-btn" onClick={() => removeFromCart(item)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-footer">
            <p className="cart-total">Total: Rs. {total}</p>
            <div className="checkout-btn" onClick={handleCheckout}>
              <span className="checkout-btn-txt">Checkout</span>
            </div>
          </div>
        )}
      </div>

      {/* Auth Popup */}
      {showAuthPopup && (
        <div className="auth-popup-overlay">
          <div className="auth-popup">
            <h3>Continue to Checkout</h3>
            <p>You are not logged in. Please choose an option:</p>
            <button onClick={handleGuest}>Continue as Guest</button>
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleSignup}>Sign Up</button>
            <button onClick={() => setShowAuthPopup(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
};

export default CartPopup;