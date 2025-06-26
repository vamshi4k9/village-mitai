import React, { useContext, useState, useEffect } from "react";
import { CartContext } from "./CartContext";
import axios from "axios";
import "../styles/PreCheckout.css";
import { API_BASE_URL} from '../constants'; 


export default function PreCheckout() {
  const { cart, total, totalItems } = useContext(CartContext);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("0");
  const [paymentMode, setPaymentMode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const fetchAddresses = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const res = await axios.get(`${API_BASE_URL}/addresses/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAddresses(res.data);
          if (res.data.length > 0) setSelectedAddress("0");
        } catch (err) {
          console.error("Failed to fetch addresses", err);
        }
      }
    };
    fetchAddresses();
  }, []);

  const applyCoupon = () => {
    if (coupon.trim().toLowerCase() === "save10") {
      setDiscount(0.1 * total);
      alert("Coupon applied! 10% discount.");
    } else {
      alert("Invalid coupon code");
    }
  };

  const handlePayment = async () => {
    if (!selectedAddress || !paymentMode) {
      alert("Please select an address and payment method");
      return;
    }

    const address = addresses[parseInt(selectedAddress)];
    if (!address) {
      alert("Invalid address selected");
      return;
    }

    if (paymentMode === "Cash On Delivery") {
      const payload = {
        payment_mode: "CASH",
        delivery_time: 1,
        net_amount: total - discount,
        cgst: 0,
        sgst: 0,
        discount,
        cart_items: cart.map(({ item, quantity }) => ({
          id: item.id,
          price: item.price,
          quantity,
          weight: item.weight || "",
          discounted: 0,
        })),
        address,
      };

      const token = localStorage.getItem("access_token");

      try {
        const response = await axios.post(
          `${API_BASE_URL}/create-order/`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        alert("Order placed successfully! Invoice ID: " + response.data.invoice_id);
      } catch (error) {
        console.error("Failed to place order", error);
        alert("Failed to place order. Please try again.");
      }
    } else {
      alert(`Paying ₹${total - discount} via ${paymentMode}`);
    }
  };

  return (
    <div className="precheckout-container">
      <div className="left-section">
        <h2>Your Cart</h2>
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.item.id} className="cart-item">
              <img src={item.item.image} alt={item.item.name} />
              <div className="cart-item-details">
                <p className="item-name">{item.item.name}</p>
                <p>
                  ₹{item.item.price} × {item.quantity}
                </p>
              </div>
              <div className="item-total">₹{item.item.price * item.quantity}</div>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          <p>Total Items: {totalItems}</p>
          <p className="total-amount">Total: ₹{total}</p>
          {discount > 0 && <p className="discount">Discount: ₹{discount}</p>}
          {discount > 0 && (
            <p className="net-total">
              <strong>Net Payable: ₹{total - discount}</strong>
            </p>
          )}
        </div>

        <div className="coupon-box">
          <input
            type="text"
            placeholder="Enter Coupon Code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
          />
          <button onClick={applyCoupon}>Apply</button>
        </div>

        <hr />

        <h2>Shipping Address</h2>
        {addresses.length > 0 ? (
          <div className="address-list">
            {addresses.map((addr, index) => (
              <label
                key={index}
                className={`address-card ${selectedAddress === index.toString() ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="address"
                  value={index.toString()}
                  checked={selectedAddress === index.toString()}
                  onChange={() => setSelectedAddress(index.toString())}
                />
                <div className="address-details">
                  <p className="address-name">{addr.name}</p>
                  <p>{addr.address1}, {addr.address2}</p>
                  <p>Phone: {addr.phone_number}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="no-address">No saved addresses found.</p>
        )}

        <hr />

        <h2>Payment Method</h2>
        <div className="payment-options">
          {["UPI", "Cash On Delivery", "Card", "Net Banking"].map((mode) => (
            <label
              key={mode}
              className={`payment-option ${paymentMode === mode ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="payment"
                value={mode}
                checked={paymentMode === mode}
                onChange={() => setPaymentMode(mode)}
              />
              {mode}
            </label>
          ))}
        </div>

        <button className="pay-button" onClick={handlePayment}>
          Pay ₹{total - discount}
        </button>
      </div>
    </div>
  );
}
