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
    type: "",
  });
  const closePopup = () => {
    setPaymentPopup({
      open: false,
      status: "",
      message: "",
      data: null,
      redirectUrl: "",
      type: "",
    });
  };
  const [showBreakdown, setShowBreakdown] = useState(false);
  const deliveryCharge = 40;

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
      const cartItems = cart.map(({ item, quantity, total_price }) => ({
        id: item.id,
        price: total_price,
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
        status: "success",
        message: "Address added successfully!",
        type: "Address",
      });

    } catch (error) {
      console.error("Failed to create address", error);
      // alert("Failed to create address. Please try again.");
      setPaymentPopup({
        open: true,
        status: "failure",
        message: "Failed to create address. Please try again.",
        type: "Address",
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
      setPaymentPopup({
        open: true,
        status: "failure",
        message: "Please select address and payment method",
      });
      return;
    }

    const address = addresses[parseInt(selectedAddress)];

    if (!address) {
      setPaymentPopup({
        open: true,
        status: "failure",
        message: "Invalid address selected",
      });
      return;
    }

    const token = localStorage.getItem("access_token");

    const payload = {
      payment_mode: paymentMode === "UPI" ? "UPI" : "CASH",
      delivery_time: 1,
      net_amount: finalPayable,
      cgst: 0,
      sgst: 0,
      discount,
      address_id: address.id,
      cart_items: cart.map(({ item, quantity }) => ({
        id: item.id,
        price: item.discounted_total || item.price,
        quantity,
        weight: item.weight || "",
        discounted: item.discounted_total ? 1 : 0,
      })),
    };

    if (paymentMode === "Cash On Delivery" || paymentMode === "Take Away") {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/create-order/`,
          payload,
          token ? SESSION_TOKEN : SESSION_KEY
        );

        await deleteCart();

        setPaymentPopup({
          open: true,
          status: "success",
          message: "Order placed successfully!",
          redirectUrl: `/invoice/${response.data.invoice_id}`,
          type: "Payment",
        });

      } catch (error) {
        setPaymentPopup({
          open: true,
          status: "failure",
          message: error.response?.data?.message || "Order failed",
          data: error.response?.data,
        });
      }
    }

    else if (paymentMode === "UPI") {
      try {
        const orderRes = await axios.post(
          `${API_BASE_URL}/create-order-razor/`,
          { amount: finalPayable },
          { headers: { "Content-Type": "application/json" } }
        );

        const orderData = orderRes.data;

        const options = {
          key: "rzp_test_YqrLQMzf9Xl7Qw",
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Village Mitai",
          description: "Order Transaction",
          order_id: orderData.id,

          handler: async (response) => {
            try {
              await axios.post(
                `${API_BASE_URL}/verify-payment/`,
                response,
                { headers: { "Content-Type": "application/json" } }
              );

              const createOrderRes = await axios.post(
                `${API_BASE_URL}/create-order/`,
                payload,
                token ? SESSION_TOKEN : SESSION_KEY
              );

              await deleteCart();

              setPaymentPopup({
                open: true,
                status: "success",
                message: "Payment & Order placed successfully!",
                redirectUrl: `/order/${createOrderRes.data.invoice_id}`,
                type: "Payment",
              });
            } catch (err) {
              setPaymentPopup({
                open: true,
                status: "failure",
                message: "Payment successful but order creation failed",
                data: err.response?.data,
              });
            }
          },
          modal: {
            ondismiss: () => {
              setPaymentPopup({
                open: true,
                status: "failure",
                message: "Payment cancelled",
              });
            },
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

      } catch (error) {
        setPaymentPopup({
          open: true,
          status: "failure",
          message: "Failed to initiate payment",
          data: error.response?.data,
        });
      }
    }
    else {
      setPaymentPopup({
        open: true,
        status: "failure",
        message: `Unsupported payment mode: ${paymentMode}`,
      });
    }
  };
  const packingCharge = 20;

  const originalItemsTotal = cart.reduce((sum, ci) => {
    const { price } = getPriceByWeight(ci.item, ci.weight);
    return sum + price * ci.quantity;
  }, 0);

  const discountedItemsTotal = cart.reduce((sum, ci) => {
    const { price, discounted } = getPriceByWeight(ci.item, ci.weight);
    const finalPrice = discounted && discounted < price ? discounted : price;
    return sum + finalPrice * ci.quantity;
  }, 0);

  const itemDiscount = originalItemsTotal - discountedItemsTotal;

  const finalPayable =
    discountedItemsTotal +
    deliveryCharge +
    packingCharge -
    discount;

  return (
    <><div className="precheckout-container mt-2">
      <div className="left-section">
        <div className="checkout-card">
          <h2 className="font-semibold">Your Cart</h2>
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
                    <div className="checkout-item-left w-full">
                      <div className="item-name text-lg text-left">
                        <div className="flex">
                          <div>
                            {ci.item.name}
                          </div>
                          <span className="checkout-qty ml-auto text-sm">
                            Qty: {ci.quantity}
                          </span>
                        </div>

                      </div>

                      <div className="checkout-item-meta">
                        <span className="">
                          {ci.weight >= 1000
                            ? `${ci.weight / 1000} KG`
                            : `${ci.weight} g`}
                        </span>

                      </div>
                    </div>

                    <div className="checkout-item-right w-full">
                      {hasDiscount ? (
                        <>
                          <span className="checkout-price-old mr-2">
                            ₹{price * ci.quantity}
                          </span>

                          <span className="checkout-price-new mr-2 text-[#1b5e20]" >
                            Rs.{itemTotal}
                          </span>

                          <span className="checkout-discount mr-2">
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

          {message && <p className="mt-2 text-sm ">{message}</p>}
        </div>
        <div className="cart-summary">
          <div
            className="flex justify-between items-center font-semibold cursor-pointer"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            <span>Total Items - {totalItems}</span>
            {/* <span>{totalItems}</span> */}

            <span className="text-sm">
              {showBreakdown ? "▲" : "▼"}
            </span>
          </div>

          <hr className="my-[1rem]" />

          {showBreakdown && (
            <div className="price-breakdown mt-3 text-sm">
              <div className="flex justify-between items-center">
                <span>Items Total</span>
                <span>Rs.{originalItemsTotal}</span>
              </div>

              {itemDiscount > 0 && (
                <div className="flex justify-between items-center text-green-700">
                  <span>Item Discount</span>
                  <span>- Rs.{itemDiscount}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between items-center text-green-700">
                  <span>Coupon Discount</span>
                  <span>- Rs.{discount}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Delivery Charges</span>
                <span>Rs.{deliveryCharge}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Packing & Handling</span>
                <span>Rs.{packingCharge}</span>
              </div>
              <hr className="my-[1rem]" />

            </div>
          )}

          <div className="total-payable-box">
            <div className="flex justify-between items-center text-md font-bold">
              <span>Total</span>
              <span className="text-[#1b5e20]">
                Rs.{finalPayable}
              </span>
            </div>
          </div>

        </div>
        <h2 className="mt-4 font-semibold">Shipping Address</h2>
        {addresses.length > 0 && (
          <div className="address-list">
            {addresses.map((addr, index) => (
              <label
                key={index}
                className={`address-card w-full ${selectedAddress === index.toString() ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  onChange={() => setSelectedAddress(addr.id)} />
                <div className="address-details w-full">
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
          {showAddAddressForm ? "Cancel" : "Add New Address"}
        </button>

        {showAddAddressForm && (
          <div className="add-address-form">
            {/* <h3 className="form-title">Add New Address</h3> */}
            <div className="form-group">
              <label htmlFor="name" className="text-left">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={newAddress.name}
                onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="address1" className="text-left">Address Line 1</label>
              <input
                id="address1"
                type="text"
                placeholder="Enter address line 1"
                value={newAddress.address1}
                onChange={(e) => setNewAddress({ ...newAddress, address1: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="address2" className="text-left">Address Line 2</label>
              <input
                id="address2"
                type="text"
                placeholder="Enter address line 2"
                value={newAddress.address2}
                onChange={(e) => setNewAddress({ ...newAddress, address2: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="phone_number" className="text-left">Phone Number</label>
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

        <h2 className="mt-4 font-semibold">Payment Method</h2>
        <div className="payment-options">
          {["UPI"].map((mode) => (
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
          Pay Rs.{finalPayable}
        </button>
      </div>
    </div><PaymentResultModal
        open={paymentPopup.open}
        status={paymentPopup.status}
        message={paymentPopup.message}
        data={paymentPopup.data}
        redirectUrl={paymentPopup.redirectUrl}
        type={paymentPopup.type}
        onClose={() => {
          closePopup();
          if (paymentPopup.status === "success" && paymentPopup.type === "Payment") navigate("/");
        }} /></>

  );
}
