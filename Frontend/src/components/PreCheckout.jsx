import React, { useContext, useState, useEffect } from "react";
import { CartContext } from "./CartContext";
import  LocationPicker from "./LocationPicker.js";
import axios from "axios";
import "../styles/PreCheckout.css";
import { API_BASE_URL, SESSION_KEY, SESSION_TOKEN } from '../constants';

export default function PreCheckout() {
  const { cart, total, totalItems } = useContext(CartContext);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("0");
  const [paymentMode, setPaymentMode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [newAddress, setNewAddress] = useState({
    name: "",
    address1: "",
    address2: "",
    phone_number: "",
  });
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const res = await axios.get(`${API_BASE_URL}/addresses/`, SESSION_TOKEN);
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

  const handleAddAddress = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/create-address/`,
        newAddress,
        SESSION_TOKEN
      );
      setAddresses((prev) => [...prev, response.data]);
      setNewAddress({ name: "", address1: "", address2: "", phone_number: "" });
      setSelectedAddress(addresses.length.toString()); // Select the newly added address
      setShowAddAddressForm(false);
      alert("Address added successfully!");
    } catch (error) {
      console.error("Failed to create address", error);
      alert("Failed to create address. Please try again.");
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

      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.post(
          `${API_BASE_URL}/create-order/`,
          payload, token ? SESSION_TOKEN : SESSION_KEY
        );
        alert("Order placed successfully! Invoice ID: " + response.data.invoice_id);
      } catch (error) {
        console.error("Failed to place order", error);
        alert("Failed to place order. Please try again.");
      }
    }
    else if (paymentMode === 'UPI') {
      const orderRes = await axios.post(
        `${API_BASE_URL}/create-order-razor/`,
        { amount: 500 }, // ✅ data
        { headers: { "Content-Type": "application/json" } }
      );
      const orderData = orderRes.data; // ✅ Correct way
      const options = {
        key: "rzp_test_YqrLQMzf9Xl7Qw", // from Razorpay dashboard
        amount: orderData.amount,
        currency: orderData.currency,
        name: "My Shop",
        description: "Test Transaction",
        order_id: orderData.id,
        handler: async (response) => {
          const verifyRes = await axios.post(
            `${API_BASE_URL}/verify-payment/`,
            response, // ✅ data
            { headers: { "Content-Type": "application/json" } } // ✅ config
          );

          alert(verifyRes.data.status); // ✅ Axios stores parsed data in .data
        },
        prefill: {
          name: "Vishnu Vamshi",
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#4b2a0d",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    }
    else {
      alert(`Paying ₹${total - discount} via ${paymentMode}`);
    }
  };

  return (
    <div className="precheckout-container mt-2">
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
        {addresses.length > 0 && (
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
        )}

        <button
          className="add-new-address-button"
          onClick={() => setShowAddAddressForm(!showAddAddressForm)}
        >
          {showAddAddressForm ? "Cancel" : "+ Add New Address"}
        </button>

        {showAddAddressForm && (
          <div className="add-address-form">
            <h3 className="form-title">Add New Address</h3>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={newAddress.name}
                onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="address1">Address Line 1</label>
              <input
                id="address1"
                type="text"
                placeholder="Enter address line 1"
                value={newAddress.address1}
                onChange={(e) => setNewAddress({ ...newAddress, address1: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="address2">Address Line 2</label>
              <input
                id="address2"
                type="text"
                placeholder="Enter address line 2"
                value={newAddress.address2}
                onChange={(e) => setNewAddress({ ...newAddress, address2: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                id="phone_number"
                type="text"
                placeholder="Enter phone number"
                value={newAddress.phone_number}
                onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              {/* <label>Choose Location on Map</label> */}
              <LocationPicker
                onLocationSelect={(latlng) => {
                  setNewAddress({
                    ...newAddress,
                    latitude: latlng.lat,
                    longitude: latlng.lng
                  });
                }}
              />
            </div>
            <button className="save-address-button" onClick={handleAddAddress}>
              Save Address
            </button>
          </div>
        )}

        <hr />

        <h2>Payment Method</h2>
        <div className="payment-options">
          {["UPI", "Cash On Delivery"].map((mode) => (
            <label
              key={mode}
              className={`payment-option ${paymentMode === mode ? "selected" : ""}`}
            >
              <input
                type="radio"
                className="payment-radio"
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