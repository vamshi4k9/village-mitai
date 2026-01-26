import React, { useContext, useState, useEffect } from "react";
import { CartContext } from "./CartContext";
import LocationPicker from "./LocationPicker.js";
import axios from "axios";
import "../styles/PreCheckout.css";
import { API_BASE_URL, SESSION_KEY, SESSION_TOKEN } from "../constants";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import PaymentResultModal from "./PaymentResultModal";

export default function PreCheckout() {
  const { cart, total, totalItems, setCart } = useContext(CartContext);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("0");
  const [paymentMode, setPaymentMode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [newTotal, setNewTotal] = useState(total);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [newAddress, setNewAddress] = useState({
    name: "",
    address1: "",
    address2: "",
    phone_number: "",
  });

  const [paymentPopup, setPaymentPopup] = useState({
    open: false,
    status: "",
    message: "",
    data: null,
    redirectUrl: "",
  });
  const closePopup = () => {
    setPaymentPopup({
      open: false,
      status: "",
      message: "",
      data: null,
      redirectUrl: "",
    });
  };

  const deleteCart = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/cart/clear/`, SESSION_KEY);
      setCart([]);
    } catch (err) {
      console.error("Failed to clear cart", err);
    }
  };

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

  const applyCoupon = async () => {
    try {
      const cartItems = cart.map(({ item, quantity }) => ({
        id: item.id,
        price: item.total_price,
        qty: quantity,
        category_id: item.category,
      }));

      const response = await axios.post(
        `${API_BASE_URL}/apply-coupon/`,
        {
          code: coupon,
          cart_items: cartItems,
        },
        SESSION_TOKEN
      );

      setDiscount(response.data.discount);
      setNewTotal(response.data.new_total);

      if (response.data.discounted_items) {
        setCart((prevCart) =>
          prevCart.map((ci) => {
            const discItem = response.data.discounted_items.find(
              (d) => d.id === ci.item.id
            );
            if (discItem) {
              return {
                ...ci,
                item: {
                  ...ci.item,
                  original_price: ci.item.price,
                  discounted_total: discItem.discounted_total,
                },
              };
            }
            return ci;
          })
        );
      }

      setMessage("Coupon applied successfully!");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to apply coupon");
      setDiscount(0);
      setNewTotal(total);
    }
  };

  const removeCoupon = () => {
    setCart((prevCart) =>
      prevCart.map((ci) => ({
        ...ci,
        item: {
          ...ci.item,
          price: ci.item.original_price || ci.item.price,
          original_price: undefined,
          discounted_total: undefined,
        },
      }))
    );

    setCoupon("");
    setDiscount(0);
    setNewTotal(total);
    setMessage("Coupon removed.");
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
      setSelectedAddress(addresses.length.toString());
      setShowAddAddressForm(false);
      // alert("Address added successfully!");
      setPaymentPopup({
        open: true,
        status: "failure",
        message: "Address added successfully!",
      });

    } catch (error) {
      console.error("Failed to create address", error);
      // alert("Failed to create address. Please try again.");
      setPaymentPopup({
        open: true,
        status: "failure",
        message: "Failed to create address. Please try again.",
      });

    }
  };

  const getPriceByWeight = (item, weight) => {
    const w = Number(weight);

    if (w === 250) {
      return {
        price: Number(item.price_quarter),
        discounted: Number(item.discounted_price_quarter),
      };
    }

    if (w === 500) {
      return {
        price: Number(item.price_half),
        discounted: Number(item.discounted_price_half),
      };
    }

    return {
      price: Number(item.price),
      discounted: Number(item.discounted_price),
    };
  };


  const handlePayment = async () => {
    if (!selectedAddress || !paymentMode) {
      // alert("Please select an address and payment method");
      return;
    }

    const address = addresses[parseInt(selectedAddress)];
    if (!address) {
      // alert("Invalid address selected");
      setPaymentPopup({
        open: true,
        status: "failure",
        message: "Invalid address selected",
      });

      return;
    }

    if (paymentMode === "Cash On Delivery") {
      const payload = {
        payment_mode: "CASH",
        delivery_time: 1,
        net_amount: newTotal,
        cgst: 0,
        sgst: 0,
        discount,
        cart_items: cart.map(({ item, quantity }) => ({
          id: item.id,
          price: item.discounted_total || item.price,
          quantity,
          weight: item.weight || "",
          discounted: item.discounted_total ? 1 : 0,
        })),
        address,
      };

      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.post(
          `${API_BASE_URL}/create-order/`,
          payload, token ? SESSION_TOKEN : SESSION_KEY
        );
        await deleteCart();
        setPaymentPopup({
          open: true,
          status: "success",
          message: "Order placed successfully!",
          data: response.data.message,
          redirectUrl: `/invoice/${response.data.invoice_id}`,
        });

      } catch (error) {
        setPaymentPopup({
          open: true,
          status: "failure",
          message: error.response?.data?.message || "Order failed",
          data: error.response?.data,
        });

      }
    } else if (paymentMode === "UPI") {
      const orderRes = await axios.post(
        `${API_BASE_URL}/create-order-razor/`,
        { amount: newTotal },
        { headers: { "Content-Type": "application/json" } }
      );
      const orderData = orderRes.data;
      const options = {
        key: "rzp_test_YqrLQMzf9Xl7Qw",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "My Shop",
        description: "Test Transaction",
        order_id: orderData.id,
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(
              `${API_BASE_URL}/verify-payment/`,
              response,
              { headers: { "Content-Type": "application/json" } }
            );

            await deleteCart();

            setPaymentPopup({
              open: true,
              status: "success",
              message: verifyRes.data.message || "Payment verified successfully",
              data: verifyRes.data.status,
              redirectUrl: `/order/${verifyRes.data.order_id}`,
            });
          } catch (err) {
            setPaymentPopup({
              open: true,
              status: "failure",
              message: "Payment verification failed",
              data: err.response?.data,
            });
          }
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
      rzp.on("payment.failed", (response) => {
        setPaymentPopup({
          open: true,
          status: "failure",
          message: response.error.description,
          data: response.error,
        });
      });

    } else {
      // alert(`Paying ₹${newTotal} via ${paymentMode}`);
      setPaymentPopup({
        open: true,
        status: "failure",
        message: `Paying ₹${newTotal} via ${paymentMode}`,
      });

    }
  };

  return (
    <><div className="precheckout-container mt-2">
      <div className="left-section">
        <div className="checkout-card">

          <h2>Your Cart</h2>
          <div className="cart-items-list">
            {cart.map((ci) => {
              const { price, discounted } = getPriceByWeight(ci.item, ci.weight);

              const hasDiscount = !isNaN(discounted) &&
                discounted > 0 &&
                discounted < price;

              const finalPrice = hasDiscount ? discounted : price;
              const itemTotal = finalPrice * ci.quantity;

              const discountPercent = hasDiscount
                ? Math.round(((price - discounted) / price) * 100)
                : 0;

              return (
                <div key={ci.item.id} className="cart-item flex-row">
                  <Link to={`/product/${ci.item.id}`}>
                    <img src={ci.item.image} alt={ci.item.name} />
                  </Link>

                  <div className="cart-item-details checkout-cart-layout">
                    <div className="checkout-item-left">
                      <div className="item-name text-lg">{ci.item.name}</div>

                      <div className="checkout-item-meta">
                        <span className="checkout-weight">
                          {ci.weight >= 1000
                            ? `${ci.weight / 1000} KG`
                            : `${ci.weight} g`}
                        </span>

                        <span className="checkout-qty">
                          Qty: {ci.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="checkout-item-right">
                      {hasDiscount ? (
                        <>
                          <span className="checkout-price-old">
                            ₹{price * ci.quantity}
                          </span>

                          <span className="checkout-price-new">
                            Rs.{itemTotal}
                          </span>

                          <span className="checkout-discount">
                            {discountPercent}% OFF
                          </span>
                        </>
                      ) : (
                        <span className="checkout-price-new">
                          Rs.{itemTotal}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        <div className="cart-summary sticky-summary">
          <div className="price-breakup">
            {/* <div className="row">
      <span>Subtotal</span>
      <span>₹{total}</span>
    </div> */}

            {discount > 0 && (
              <div className="row discount-row">
                <span>Coupon Discount</span>
                <span>- ₹{discount}</span>
              </div>
            )}

            {/* <div className="row">
      <span>Delivery Charges</span>
      <span className="free">FREE</span>
    </div> */}

            <div className="divider"></div>

            {/* <div className="row total-row">
      <strong>Payable Amount</strong>
      <strong>₹{newTotal}</strong>
    </div> */}
          </div>

          <p>Total Items: {totalItems}</p>
          <p className="total-amount">Total: Rs.{total}</p>
          {discount > 0 && <p className="discount">Discount: ₹{discount}</p>}
          {discount > 0 && (
            <p className="net-total">
              <strong>Net Payable: ₹{newTotal}</strong>
            </p>
          )}
        </div>

        <div className="coupon-box">
          <div className="coupon-input-wrapper w-full">
            <input
              type="text"
              placeholder="Enter Coupon Code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              disabled={discount > 0} />
            {discount > 0 && (
              <span className="remove-coupon" onClick={removeCoupon}>
                ✕
              </span>
            )}
          </div>

          {discount === 0 && (
            <button className="apply-btn" onClick={applyCoupon}>
              Apply
            </button>
          )}

          {message && <p className="mt-2 text-sm">{message}</p>}
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
                  onChange={() => setSelectedAddress(index.toString())} />
                <div className="address-details">
                  <p className="address-name">{addr.name}</p>
                  <p>
                    {addr.address1}, {addr.address2}
                  </p>
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
                onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="address1">Address Line 1</label>
              <input
                id="address1"
                type="text"
                placeholder="Enter address line 1"
                value={newAddress.address1}
                onChange={(e) => setNewAddress({ ...newAddress, address1: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="address2">Address Line 2</label>
              <input
                id="address2"
                type="text"
                placeholder="Enter address line 2"
                value={newAddress.address2}
                onChange={(e) => setNewAddress({ ...newAddress, address2: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                id="phone_number"
                type="text"
                placeholder="Enter phone number"
                value={newAddress.phone_number}
                onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })} />
            </div>
            <div className="form-group">
              <LocationPicker
                onLocationSelect={(latlng) => {
                  setNewAddress({
                    ...newAddress,
                    latitude: latlng.lat,
                    longitude: latlng.lng,
                  });
                }} />
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
                onChange={() => setPaymentMode(mode)} />
              {mode}
            </label>
          ))}
        </div>
        <button className="pay-button" onClick={handlePayment}>
          Pay Rs.{total}
        </button>
      </div>
    </div><PaymentResultModal
        open={paymentPopup.open}
        status={paymentPopup.status}
        message={paymentPopup.message}
        data={paymentPopup.data}
        redirectUrl={paymentPopup.redirectUrl}
        onClose={() => {
          closePopup();
          if (paymentPopup.status === "success") navigate("/");
        }} /></>

  );
}
