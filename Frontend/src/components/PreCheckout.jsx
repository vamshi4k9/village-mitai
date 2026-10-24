import React, { useContext, useState, useEffect, useRef } from "react";
import { CartContext } from "./CartContext";
import LocationPicker from "./LocationPicker.js";
import axios from "axios";
import "../styles/PreCheckout.css";
import { API_BASE_URL, SESSION_KEY, SESSION_TOKEN } from "../constants";
import { getValidAccessToken } from "../utils/auth";
import { isPiece, formatWeight, formatQuantity } from "../utils/pricing";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import PaymentResultModal from "./PaymentResultModal";
import { formatDeliveryDate, relativeDay, datesBetween, dateParts } from "../utils/deliveryDate";
import { orderStatusUrl } from "../utils/orderNumber";

export default function PreCheckout() {
  const { cart, total, totalItems, setCart, triggerToast } = useContext(CartContext);
  const addressSectionRef = useRef(null);
  // messages shown right at the field / section that needs attention
  const [addressErrors, setAddressErrors] = useState({});
  const [addressNotice, setAddressNotice] = useState("");
  const [deliveryNotice, setDeliveryNotice] = useState("");

  // scrolls the problem into the middle of the screen and puts the cursor in it
  const goTo = (id) => {
    // wait a tick so a form that was just opened is on the page
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el.tagName === "INPUT") el.focus({ preventScroll: true });
    }, 50);
  };

  const updateAddressField = (field, value) => {
    setNewAddress((prev) => ({ ...prev, [field]: value }));
    setAddressErrors((prev) => ({ ...prev, [field]: "" }));
  };
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  // set when the applied coupon waives the delivery charge
  const [couponFreeDelivery, setCouponFreeDelivery] = useState(false);
  const [newTotal, setNewTotal] = useState(total);
  const [message, setMessage] = useState("");
  // "any" / "online" / "cod": which payment methods the applied coupon allows
  const [couponPaymentMode, setCouponPaymentMode] = useState("any");
  const navigate = useNavigate();
  const [newAddress, setNewAddress] = useState({
    name: "",
    address1: "",
    address2: "",
    phone_number: "",
    latitude: "",
    longitude: "",
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
  // const [showBreakdown, setShowBreakdown] = useState(false);
  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState(0);

  // Delivery date: the fastest possible day, or a later day the customer picks.
  // The window depends on the slowest item in the cart, so it is fetched
  // again whenever the items change.
  const [deliveryDates, setDeliveryDates] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState("fastest");
  const [scheduledDate, setScheduledDate] = useState("");
  const cartItemIds = [...new Set(cart.map((ci) => ci.item.id))].sort().join(",");

  useEffect(() => {
    if (!cartItemIds) return;
    let active = true;
    axios
      .get(`${API_BASE_URL}/delivery-dates/`, { params: { item_ids: cartItemIds } })
      .then((res) => {
        if (!active) return;
        setDeliveryDates(res.data);
        // a picked day that is no longer offered has to be picked again
        setScheduledDate((picked) =>
          picked && picked > res.data.earliest_date && picked <= res.data.latest_date ? picked : ""
        );
      })
      .catch((err) => console.error("Failed to get delivery dates", err));
    return () => {
      active = false;
    };
  }, [cartItemIds]);

  // later days to choose from; the fastest day is its own option
  const scheduleOptions = deliveryDates
    ? datesBetween(deliveryDates.earliest_date, deliveryDates.latest_date).slice(1)
    : [];
  const selectedDeliveryDate =
    deliveryMode === "scheduled" ? scheduledDate : deliveryDates?.earliest_date || "";
  // distance, charge and whether we deliver, for the selected address
  const [deliveryQuote, setDeliveryQuote] = useState(null);

  const showNotDeliverable = (quote) => {
    setPaymentPopup({
      open: true,
      status: "failure",
      title: "Delivery Not Available",
      message: `Sorry, we don't deliver to this address yet. It is ${quote.distance_km} km away and we deliver within ${Number(quote.max_delivery_km)} km. Please choose another address.`,
      type: "Delivery",
    });
  };

  useEffect(() => {
    if (!selectedAddress) {
      setDeliveryQuote(null);
      return;
    }

    let cancelled = false;
    setDeliveryQuote(null);
    axios
      .get(`${API_BASE_URL}/delivery-quote/`, { params: { address_id: selectedAddress } })
      .then((res) => {
        if (cancelled) return;
        setDeliveryQuote(res.data);
        if (!res.data.deliverable) showNotDeliverable(res.data);
      })
      .catch((err) => console.error("Failed to get delivery quote", err));

    return () => {
      cancelled = true;
    };
  }, [selectedAddress]);
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
    if (discount > 0) {
      removeCoupon();
    }
  }, [cart.length, total]);

  useEffect(() => {
    const fetchAddresses = async () => {
      // also refreshes an expired token so the order gets linked to the account
      const token = await getValidAccessToken();

      try {
        const res = await axios.get(
          `${API_BASE_URL}/addresses/`,
          token ? SESSION_TOKEN : SESSION_KEY
        );

        setAddresses(res.data);

        if (res.data.length > 0) {
          setSelectedAddress(res.data[0].id);
        }

      } catch (err) {
        console.error("Failed to fetch addresses", err);
      }
    };

    fetchAddresses();
  }, []);

  const applyCoupon = async () => {
    try {
      if (!selectedAddress || selectedAddress === "0") {
        setMessage("Select address before applying coupon");
        setDiscount(0);
        setCouponFreeDelivery(false);
        return;
      }
      const address = addresses.find(
        (addr) => addr.id === selectedAddress
      );
      const cartItems = cart.map(({ item, quantity, total_price, weight }) => {

        const { price, discounted } = getPriceByWeight(item, weight);

        const currentPrice =
          discounted && discounted < price
            ? discounted * quantity
            : price * quantity;

        const originalPrice = price * quantity;

        return {
          id: item.id,
          qty: quantity,
          price: currentPrice,              // Current total
          original_price: originalPrice,    // MRP total
          category_id: item.category,
          weight,                           // "250" / "500" / "1000" / "piece"
          phone_number: address?.phone_number || "",
        };
      });

      const response = await axios.post(
        `${API_BASE_URL}/apply-coupon/`,
        {
          code: coupon,
          cart_items: cartItems,
          payment_mode: paymentMode === "UPI" ? "UPI" : "CASH",
        },
        SESSION_TOKEN
      );

      setDiscount(response.data.discount);
      setNewTotal(response.data.new_total);
      setCouponFreeDelivery(!!response.data.free_delivery);
      setCouponPaymentMode(response.data.payment_mode || "any");

      if (response.data.discounted_items) {
        setCart((prevCart) =>
          prevCart.map((ci) => {
            const discItem = response.data.discounted_items.find(
              (d) => d.id === ci.item.id && String(d.weight) === String(ci.weight)
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
      setCouponFreeDelivery(false);
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
    setCouponFreeDelivery(false);
    setCouponPaymentMode("any");
    setNewTotal(total);
    setMessage("Coupon removed.");
  };

  // switching to a payment method the applied coupon does not allow takes
  // the coupon off and says why
  useEffect(() => {
    if (discount <= 0 && !couponFreeDelivery) return;
    const isOnline = paymentMode === "UPI";
    if (
      (couponPaymentMode === "online" && !isOnline) ||
      (couponPaymentMode === "cod" && isOnline)
    ) {
      const code = coupon;
      removeCoupon();
      setMessage(
        couponPaymentMode === "online"
          ? `${code} is valid only for online payment`
          : `${code} is valid only for cash on delivery`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMode]);

  const handleAddAddress = async () => {
    try {
      // collect every problem, show each at its own field, then go to the first one
      const errors = {};
      if (!newAddress.name?.trim()) errors.name = "Please enter your name";
      if (!newAddress.phone_number?.trim()) errors.phone_number = "Please enter your phone number";
      if (!newAddress.address1?.trim()) errors.address1 = "Please enter address line 1";
      if (!newAddress.address2?.trim()) errors.address2 = "Please enter address line 2";
      if (!newAddress.latitude || !newAddress.longitude) {
        errors.location = "Please select your location on the map";
      }

      setAddressErrors(errors);
      const firstError = ["name", "phone_number", "address1", "address2", "location"].find(
        (field) => errors[field]
      );
      if (firstError) {
        goTo(firstError === "location" ? "co-location" : firstError);
        return;
      }
      const response = await axios.post(
        `${API_BASE_URL}/create-address/`,
        newAddress,
        SESSION_TOKEN
      );
      setAddresses((prev) => [...prev, response.data]);
      setNewAddress({ name: "", address1: "", address2: "", phone_number: "" });
      setSelectedAddress(response.data.id);
      setShowAddAddressForm(false);
      setAddressNotice("");
      // the form sat below the list, so bring the list (with the new address selected) back into view
      if (addressSectionRef.current) {
        addressSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      triggerToast("Address added successfully!", 2000);

    } catch (error) {
      console.error("Failed to create address", error);
      // alert("Failed to create address. Please try again.");
      triggerToast("Failed to create address. Please try again.", 2000);

    }
  };


  const getPriceByWeight = (item, weight) => {
    // bought by the piece: quantity is the number of pieces
    if (isPiece(weight)) return { price: Number(item.piece_price), discounted: 0 };

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
    if (!selectedAddress) {
      // nothing saved yet: open the form so the address can be typed straight away
      if (addresses.length === 0) {
        setShowAddAddressForm(true);
        setAddressNotice("Please add a delivery address to place your order");
        goTo("name");
      } else {
        setAddressNotice("Please select a delivery address");
        goTo("co-address");
      }
      return;
    }

    if (deliveryQuote && !deliveryQuote.deliverable) {
      showNotDeliverable(deliveryQuote);
      goTo("co-address");
      return;
    }

    if (deliveryMode === "scheduled" && !scheduledDate) {
      setDeliveryNotice("Please pick a delivery date");
      goTo("co-delivery");
      return;
    }

    if (!paymentMode) {
      triggerToast("Please select a payment method", 2000);
      goTo("co-payment");
      return;
    }

    const address = addresses.find(
      (addr) => addr.id === selectedAddress
    );

    if (!address) {
      triggerToast("Invalid address selected", 2000);
      return;
    }

    const token = localStorage.getItem("access_token");

    const payload = {
      payment_mode: paymentMode === "UPI" ? "UPI" : "CASH",
      delivery_time: 1,
      // empty means "fastest"; the server works the date out itself
      delivery_date: selectedDeliveryDate,
      is_scheduled: deliveryMode === "scheduled",
      net_amount: finalPayable,
      coupon_code: coupon || "",
      cgst: 0,
      sgst: 0,
      discount,
      // saved with the order so its page can show items, coupon, delivery
      // and total as they were at checkout
      delivery_charge: deliveryCharge,
      // packing is shown struck through as FREE, so nothing is charged
      packing_charge: 0,
      address_id: address.id,
      // price is what one unit of this line costs: one pack of the chosen
      // weight, or one piece, after any item discount. The server saves each
      // line's MRP and its share of the coupon (free units for Buy X Get Y).
      cart_items: cart.map(({ item, quantity, weight }) => {
        const { price, discounted } = getPriceByWeight(item, weight);
        const unitPrice = discounted > 0 && discounted < price ? discounted : price;

        return {
          id: item.id,
          price: Number(Number(unitPrice).toFixed(2)),
          quantity,
          weight,
          discounted: 0,
        };
      }),
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
          redirectUrl: orderStatusUrl({ order_number: response.data.order_number, id: response.data.invoice_id }),
          type: "Payment",
        });

      } catch (error) {
        setPaymentPopup({
          open: true,
          status: "failure",
          message: error.response?.data?.message || "Order failed",
          data: error.response?.data,
          type: "Order",
        });
      }
    }

    else if (paymentMode === "UPI") {
      try {
        // // TEST MODE START
        // const createOrderRes = await axios.post(
        //   `${API_BASE_URL}/create-order/`,
        //   payload,
        //   token ? SESSION_TOKEN : SESSION_KEY
        // );

        // // await deleteCart();

        // setPaymentPopup({
        //   open: true,
        //   status: "success",
        //   message: "Payment & Order placed successfully!",
        //   redirectUrl: `/order_status?invoice=${createOrderRes.data.invoice_id}`,
        //   type: "Payment",
        // });

        // return;
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

              // the Razorpay ids are stored with the order; a refund on
              // cancellation is made against them
              const createOrderRes = await axios.post(
                `${API_BASE_URL}/create-order/`,
                {
                  ...payload,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                token ? SESSION_TOKEN : SESSION_KEY
              );

              await deleteCart();

              setPaymentPopup({
                open: true,
                status: "success",
                message: "Payment & Order placed successfully!",
                redirectUrl: orderStatusUrl({ order_number: createOrderRes.data.order_number, id: createOrderRes.data.invoice_id }),
                type: "Payment",
              });
            } catch (err) {
              setPaymentPopup({
                open: true,
                status: "failure",
                message: "Payment successful but order creation failed",
                data: err.response?.data,
                type: "Order",
              });
            }
          },
          modal: {
            ondismiss: () => {
              setPaymentPopup({
                open: true,
                status: "failure",
                message: "Payment cancelled",
                type: "Payment",
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
            type: "Payment",
          });
        });

      } catch (error) {
        setPaymentPopup({
          open: true,
          status: "failure",
          message: "Failed to initiate payment",
          data: error.response?.data,
          type: "Payment",
        });
      }
    }
    else {
      setPaymentPopup({
        open: true,
        status: "failure",
        message: `Unsupported payment mode: ${paymentMode}`,
        type: "Payment",
      });
    }
  };
  const packingCharge = 20;

  const originalItemsTotal = cart.reduce((sum, ci) => {
    const { price } = getPriceByWeight(ci.item, ci.weight);
    return sum + price * ci.quantity;
  }, 0);

  // items after their own discounts, before the coupon. The coupon is taken
  // off once, below; the per-line coupon totals from apply-coupon are not
  // used here, or the coupon would come off twice.
  const discountedItemsTotal = cart.reduce((sum, ci) => {

    const { price, discounted } = getPriceByWeight(ci.item, ci.weight);

    const finalPrice =
      discounted && discounted < price
        ? discounted * ci.quantity
        : price * ci.quantity;

    return sum + finalPrice;

  }, 0);
  const DEFAULT_DELIVERY_CHARGE = 40;

  // charge for the distance to the selected address; the default applies
  // until an address is chosen or when no distance charges are set up
  const distanceCharge =
    deliveryQuote && deliveryQuote.delivery_charge != null
      ? Number(deliveryQuote.delivery_charge)
      : DEFAULT_DELIVERY_CHARGE;

  // free delivery is judged on what is paid for the items, after the coupon
  const itemsAfterCoupon = discountedItemsTotal - discount;

  const deliveryCharge =
    couponFreeDelivery || itemsAfterCoupon >= freeDeliveryAmount
      ? 0
      : distanceCharge;

  const notDeliverable = deliveryQuote && !deliveryQuote.deliverable;

  const itemDiscount = originalItemsTotal - discountedItemsTotal;

  const finalPayable =
    discountedItemsTotal +
    deliveryCharge -
    discount;

  const isCod = paymentMode === "Cash On Delivery";

  return (
    <><div className="co-page">
      <h2 className="page-title">Checkout</h2>

      {cart.length === 0 ? (
        <div className="co-card co-empty">
          <i className="bi bi-cart"></i>
          <p>Your cart is empty</p>
          <button className="co-btn" onClick={() => navigate("/")}>Continue Shopping</button>
        </div>
      ) : (
      <div className="co-layout">
        {/* Left: what is being ordered, where it goes, how it is paid */}
        <div className="co-main">
          <div className="co-card">
            <div className="co-card-head">
              <h3 className="section-title">Your Cart</h3>
              <span className="co-chip">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="co-items">
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
                  <div key={`${ci.item.id}-${ci.weight}`} className="co-item">
                    <Link to={`/product/${ci.item.id}`}>
                      <img src={ci.item.image} alt={ci.item.name} />
                    </Link>

                    <div className="co-item-info">
                      <p className="co-item-name">{ci.item.name}</p>
                      <div className="co-item-meta">
                        <span className="co-chip">{formatWeight(ci.weight, ci.item)}</span>
                        <span className="co-chip">{formatQuantity(ci.quantity, ci.weight)}</span>
                      </div>
                    </div>

                    <div className="co-item-price">
                      {hasDiscount && (
                        <span className="co-price-old">Rs.{price * ci.quantity}</span>
                      )}
                      <span className={`co-price-new ${hasDiscount ? "discounted" : ""}`}>
                        Rs.{itemTotal}
                      </span>
                      {hasDiscount && (
                        <span className="co-price-off">({discountPercent}% OFF)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="co-card">
            <div className="co-card-head">
              <h3 className="section-title address-section-title" id="co-address" ref={addressSectionRef}>
                Shipping Address
              </h3>
              <button
                className="co-btn small secondary"
                onClick={() => {
                  setShowAddAddressForm(!showAddAddressForm);
                  setAddressErrors({});
                }}
              >
                {showAddAddressForm ? "Cancel" : "+ Add New Address"}
              </button>
            </div>

            {addressNotice && <p className="co-error co-notice">{addressNotice}</p>}
            {notDeliverable && (
              <p className="co-error co-notice">
                Delivery is not available to the selected address ({deliveryQuote.distance_km} km away).
                We deliver within {Number(deliveryQuote.max_delivery_km)} km.
              </p>
            )}

            {addresses.length > 0 ? (
              <div className="address-list">
                {addresses.map((addr, index) => (
                  <label
                    key={index}
                    className={`address-card ${selectedAddress === addr.id ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddress === addr.id}
                      onChange={() => {
                        setSelectedAddress(addr.id);
                        setAddressNotice("");
                      }}
                    />
                    <span className="co-radio"></span>
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
            ) : (
              !showAddAddressForm && (
                <p className="co-muted">No address saved yet. Add one to continue.</p>
              )
            )}

            {showAddAddressForm && (
              <div className="add-address-form">
                <div className="co-form-row">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      className={addressErrors.name ? "invalid" : ""}
                      value={newAddress.name}
                      onChange={(e) => updateAddressField("name", e.target.value)} />
                    {addressErrors.name && <p className="co-error">{addressErrors.name}</p>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone_number">Phone Number</label>
                    <input
                      id="phone_number"
                      type="text"
                      placeholder="Enter phone number"
                      className={addressErrors.phone_number ? "invalid" : ""}
                      value={newAddress.phone_number}
                      onChange={(e) => updateAddressField("phone_number", e.target.value)} />
                    {addressErrors.phone_number && <p className="co-error">{addressErrors.phone_number}</p>}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="address1">Address Line 1</label>
                  <input
                    id="address1"
                    type="text"
                    placeholder="Enter address line 1"
                    className={addressErrors.address1 ? "invalid" : ""}
                    value={newAddress.address1}
                    onChange={(e) => updateAddressField("address1", e.target.value)} />
                  {addressErrors.address1 && <p className="co-error">{addressErrors.address1}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="address2">Address Line 2</label>
                  <input
                    id="address2"
                    type="text"
                    placeholder="Enter address line 2"
                    className={addressErrors.address2 ? "invalid" : ""}
                    value={newAddress.address2}
                    onChange={(e) => updateAddressField("address2", e.target.value)} />
                  {addressErrors.address2 && <p className="co-error">{addressErrors.address2}</p>}
                </div>
                <div className="form-group" id="co-location">
                  <label>Location (search or tap the map to set)</label>
                  <div className={addressErrors.location ? "co-map invalid" : "co-map"}>
                    <LocationPicker
                      onLocationSelect={(latlng) => {
                        setNewAddress((prev) => ({
                          ...prev,
                          latitude: latlng.lat,
                          longitude: latlng.lng,
                        }));
                        setAddressErrors((prev) => ({ ...prev, location: "" }));
                      }} />
                  </div>
                  {addressErrors.location && <p className="co-error">{addressErrors.location}</p>}
                </div>
                <button className="co-btn" onClick={handleAddAddress}>
                  Save Address
                </button>
              </div>
            )}
          </div>

          <div className="co-card">
            <div className="co-card-head">
              <h3 className="section-title" id="co-delivery">Delivery Date</h3>
            </div>

            {deliveryNotice && <p className="co-error co-notice">{deliveryNotice}</p>}

            <div className="co-delivery-options">
              <label className={`payment-option co-delivery-option ${deliveryMode === "fastest" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="delivery-mode"
                  value="fastest"
                  checked={deliveryMode === "fastest"}
                  onChange={() => {
                    setDeliveryMode("fastest");
                    setDeliveryNotice("");
                  }}
                />
                <span className="co-radio"></span>
                <i className="bi bi-lightning-charge"></i>
                <span className="co-delivery-text">
                  <span className="co-delivery-title">Fastest Delivery</span>
                  <span className="co-delivery-sub">
                    {deliveryDates
                      ? relativeDay(deliveryDates.earliest_date, deliveryDates.today)
                        ? `${relativeDay(deliveryDates.earliest_date, deliveryDates.today)} · ${formatDeliveryDate(deliveryDates.earliest_date)}`
                        : `Arrives ${formatDeliveryDate(deliveryDates.earliest_date)}`
                      : "Earliest available day"}
                  </span>
                </span>
              </label>

              <label className={`payment-option co-delivery-option ${deliveryMode === "scheduled" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="delivery-mode"
                  value="scheduled"
                  checked={deliveryMode === "scheduled"}
                  disabled={scheduleOptions.length === 0}
                  onChange={() => setDeliveryMode("scheduled")}
                />
                <span className="co-radio"></span>
                <i className="bi bi-calendar-event"></i>
                <span className="co-delivery-text">
                  <span className="co-delivery-title">Schedule Delivery</span>
                  <span className="co-delivery-sub">
                    {scheduledDate ? formatDeliveryDate(scheduledDate) : "Pick a later date"}
                  </span>
                </span>
              </label>
            </div>

            {deliveryMode === "scheduled" && (
              <div className="co-date-chips" role="radiogroup" aria-label="Delivery date">
                {scheduleOptions.map((iso) => {
                  const { weekday, day, month } = dateParts(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="radio"
                      aria-checked={scheduledDate === iso}
                      className={`co-date-chip ${scheduledDate === iso ? "selected" : ""}`}
                      onClick={() => {
                        setScheduledDate(iso);
                        setDeliveryNotice("");
                      }}
                    >
                      <span className="co-date-weekday">{relativeDay(iso, deliveryDates?.today) || weekday}</span>
                      <span className="co-date-day">{day}</span>
                      <span className="co-date-month">{month}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: order summary, then payment method and the pay button.
            Stays in view on laptop */}
        <div className="co-side">
          <div className="co-card">
            <div className="co-card-head">
              <h3 className="section-title">Order Summary</h3>
            </div>

            <div className="coupon-box">
              <div className="coupon-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter Coupon Code"
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value);

                    if (message) {
                      setMessage("");
                    }
                  }} className={
                    discount > 0
                      ? "coupon-success"
                      : message
                        ? "coupon-error"
                        : ""
                  }
                  disabled={discount > 0}
                />

                {message && (
                  <span
                    className={`coupon-inline-message
                      ${discount > 0 ? "success" : "error"}
                      ${message?.length > 10 ? "long-text" : ""}
                    `}
                  >
                    {message}
                  </span>
                )}
                {discount > 0 && (
                  <span className="remove-coupon" onClick={removeCoupon}>
                    ✕
                  </span>
                )}
              </div>

              {discount === 0 && (
                <button className="co-btn" onClick={applyCoupon}>
                  Apply
                </button>
              )}
            </div>

            {(discount > 0 || couponFreeDelivery) && couponPaymentMode !== "any" && (
              <p className="co-coupon-note">
                <i className="bi bi-info-circle"></i>
                {couponPaymentMode === "online"
                  ? " Valid for online payment only"
                  : " Valid for cash on delivery only"}
              </p>
            )}

            <div className="co-summary">
              <div className="co-summary-row">
                <span>Items ({totalItems})</span>
                <span>Rs.{originalItemsTotal}</span>
              </div>

              {itemDiscount > 0 && (
                <div className="co-summary-row saving">
                  <span>Item Discount</span>
                  <span>- Rs.{itemDiscount}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="co-summary-row saving">
                  <span>Coupon Discount</span>
                  <span>- Rs.{discount}</span>
                </div>
              )}

              <div className="co-summary-row">
                <span>
                  Delivery Charges
                  {deliveryQuote?.distance_km != null && ` (${deliveryQuote.distance_km} km)`}
                  {deliveryQuote?.store_name && (
                    <small className="co-hint" style={{ display: "block", margin: 0 }}>
                      From {deliveryQuote.store_name}
                    </small>
                  )}
                </span>

                {deliveryCharge === 0 ? (
                  <span className="co-free">
                    {/* nothing to strike through when the distance itself is free */}
                    {distanceCharge > 0 && (
                      <span className="co-price-old">Rs.{distanceCharge}</span>
                    )}
                    FREE
                  </span>
                ) : (
                  <span>Rs.{deliveryCharge}</span>
                )}
              </div>

              {deliveryCharge > 0 && (
                <p className="co-hint">
                  Add items worth Rs.
                  {Math.max(
                    0,
                    freeDeliveryAmount - itemsAfterCoupon
                  ).toFixed(0)}
                  {" "}more to get FREE delivery.
                </p>
              )}

              <div className="co-summary-row">
                <span>Packing & Handling</span>

                <span className="co-free">
                  <span className="co-price-old">Rs.{packingCharge}</span>
                  FREE
                </span>
              </div>

              {selectedDeliveryDate && (
                <div className="co-summary-row">
                  <span>{deliveryMode === "scheduled" ? "Scheduled For" : "Delivery By"}</span>
                  <span>{formatDeliveryDate(selectedDeliveryDate)}</span>
                </div>
              )}

              <div className="co-summary-row total">
                <span>Total</span>
                <span>Rs.{Number(finalPayable).toFixed(2)}</span>
              </div>
            </div>

          </div>

          <div className="co-card">
            <div className="co-card-head">
              <h3 className="section-title" id="co-payment">Payment Method</h3>
            </div>
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
                  <span className="co-radio"></span>
                  <i className={`bi ${mode === "UPI" ? "bi-phone" : "bi-cash"}`}></i>
                  {mode}
                </label>
              ))}
            </div>
          </div>

          <button className="co-btn pay" onClick={handlePayment} disabled={notDeliverable}>
            {isCod ? "Place Order" : "Pay"} Rs.{Number(finalPayable).toFixed(2)}
          </button>
        </div>
      </div>
      )}
    </div><PaymentResultModal
        open={paymentPopup.open}
        status={paymentPopup.status}
        message={paymentPopup.message}
        data={paymentPopup.data}
        redirectUrl={paymentPopup.redirectUrl}
        type={paymentPopup.type}
        title={paymentPopup.title}
        onClose={() => {
          closePopup();
          if (paymentPopup.status === "success" && paymentPopup.type === "Payment") navigate("/");
        }} /></>

  );
}
