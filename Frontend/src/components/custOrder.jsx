import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../constants";
import DashboardShell from "./DashboardShell";
import PaymentResultModal from "./PaymentResultModal";
import "../styles/FormPage.css";
import "../styles/Register.css";
import "../styles/OfflineOrder.css";

const OfflineOrder = () => {

    const [customer, setCustomer] = useState({
        name: "",
        phone: ""
    });

    const [couponApplied, setCouponApplied] = useState(false);
    const [items, setItems] = useState([]);

    const [product, setProduct] = useState({
        item_id: "",
        weight: "",
        price: 0
    });

    const [orders, setOrders] = useState([]);
    const [coupon, setCoupon] = useState("");
    const [discount, setDiscount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [couponMessage, setCouponMessage] = useState("");
    // code of the coupon the server accepted for this bill
    const [appliedCoupon, setAppliedCoupon] = useState("");
    const [paymentMode, setPaymentMode] = useState("CASH");
    const [orderNumber, setOrderNumber] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    // the discount depends on the bill and payment method: check the
    // applied coupon again whenever they change
    useEffect(() => {
        if (appliedCoupon) {
            applyCoupon(appliedCoupon);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, paymentMode]);

    const fetchItems = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/category/SWEETS`);
            setItems(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const clearCoupon = (message = "") => {
        setCouponApplied(false);
        setAppliedCoupon("");
        setDiscount(0);
        setCouponMessage(message);
    };

    const handleCustomerChange = (e) => {
        setCustomer({
            ...customer,
            [e.target.name]: e.target.value
        });
        // coupon limits are per customer, so a new phone needs a new check
        if (e.target.name === "phone" && appliedCoupon) {
            clearCoupon("Phone changed, apply the coupon again");
        }
    };

    const calculatePrice = (item, weight) => {

        if (weight === "Sample") return 20;

        if (weight === "250gm") {
            return parseFloat(item.discounted_price_quarter || item.price_quarter || 0);
        }

        if (weight === "500gm") {
            return parseFloat(item.discounted_price_half || item.price_half || 0);
        }

        if (weight === "1kg") {
            return parseFloat(item.discounted_price || item.price || 0);
        }

        return 0;
    };

    const getAvailableWeights = (item) => {

        const weights = ["Sample"];

        if (item.discounted_price_quarter || item.price_quarter) {
            weights.push("250gm");
        }

        if (item.discounted_price_half || item.price_half) {
            weights.push("500gm");
        }

        if (item.discounted_price || item.price) {
            weights.push("1kg");
        }

        return weights;
    };

    const handleProductChange = (e) => {

        const updated = { ...product, [e.target.name]: e.target.value };

        if (e.target.name === "item_id") {
            updated.weight = "";
            updated.price = 0;
        }

        if (updated.item_id && updated.weight) {

            const item = items.find(i => i.id == updated.item_id);

            updated.price = calculatePrice(item, updated.weight);
        }

        setProduct(updated);
    };
    const removeItem = (index) => {

        const updatedOrders = orders.filter((_, i) => i !== index);

        setOrders(updatedOrders);

    };
    const addItem = () => {

        if (!product.item_id || !product.weight) return;

        const item = items.find(i => i.id == product.item_id);

        const orderItem = {
            item_id: item.id,
            name: item.name,
            weight: product.weight,
            price: product.price
        };

        setOrders([...orders, orderItem]);

        setProduct({
            item_id: "",
            weight: "",
            price: 0
        });
    };

    const getTotal = () => {
        return orders.reduce((sum, item) => sum + item.price, 0);
    };

    // only offline coupons work here; the server works out the discount
    const applyCoupon = async (code = coupon) => {

        code = (code || "").trim();
        if (!code) {
            clearCoupon("Enter a coupon code");
            return;
        }

        if (!customer.phone) {
            setCouponMessage("Enter phone number first");
            return;
        }

        if (orders.length === 0) {
            clearCoupon("Add items to the bill first");
            return;
        }

        try {

            const res = await axios.post(
                `${API_BASE_URL}/validate-coupon/`,
                {
                    phone: customer.phone,
                    coupon: code,
                    payment_mode: paymentMode,
                    items: orders
                }
            );

            if (res.data.valid) {

                setDiscount(Number(res.data.discount) || 0);
                setCouponApplied(true);
                setAppliedCoupon(res.data.code || code);
                setCouponMessage(res.data.message);

            } else {

                clearCoupon(res.data.message);

            }

        } catch {
            clearCoupon("Coupon validation failed");
        }
    };

    const submitOrder = async () => {

        setSubmitError("");

        if (!customer.name || !customer.phone) {
            setSubmitError("Enter customer name and phone number");
            return;
        }

        if (orders.length === 0) {
            setSubmitError("Add at least one item");
            return;
        }

        const payload = {
            customer_name: customer.name,
            phone: customer.phone,
            coupon: appliedCoupon,
            payment_mode: paymentMode,
            items: orders
        };

        setSubmitting(true);

        try {

            const res = await axios.post(
                `${API_BASE_URL}/offline-order/`,
                payload
            );

            setOrderId(res.data.order_id);
            setOrderNumber(res.data.order_number || "");
            setShowModal(true);

            // FULL RESET

            setCustomer({
                name: "",
                phone: ""
            });

            setProduct({
                item_id: "",
                weight: "",
                price: 0
            });

            setOrders([]);
            setCoupon("");
            clearCoupon();
            setPaymentMode("CASH");

        } catch (err) {

            console.error(err);
            setSubmitError(err.response?.data?.error || "Could not place the order");

        } finally {

            setSubmitting(false);

        }

    };
    const selectedItem = items.find(i => i.id == product.item_id);
    const availableWeights = selectedItem ? getAvailableWeights(selectedItem) : [];

    return (
        <DashboardShell title="Offline Sweet Order" subtitle="Record an order taken in person">

            <div className="oo-layout">

                <div className="oo-entry">

                    <div className="fp-panel">
                        <h2 className="fp-panel-title">Customer</h2>

                        <div className="fp-row">
                            <div className="fp-field">
                                <label htmlFor="oo-name" className="fp-label">Customer Name</label>
                                <input
                                    id="oo-name"
                                    className="fp-input"
                                    name="name"
                                    placeholder="Customer Name"
                                    value={customer.name}
                                    onChange={handleCustomerChange}
                                />
                            </div>

                            <div className="fp-field">
                                <label htmlFor="oo-phone" className="fp-label">Phone Number</label>
                                <input
                                    id="oo-phone"
                                    className="fp-input"
                                    name="phone"
                                    inputMode="tel"
                                    placeholder="Phone Number"
                                    value={customer.phone}
                                    onChange={handleCustomerChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="fp-panel">
                        <h2 className="fp-panel-title">Add Item</h2>

                        <div className="fp-row">
                            <div className="fp-field">
                                <label htmlFor="oo-item" className="fp-label">Sweet</label>
                                <select
                                    id="oo-item"
                                    name="item_id"
                                    className="fp-input"
                                    value={product.item_id}
                                    onChange={handleProductChange}
                                >
                                    <option value="">Select Sweet</option>

                                    {items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}

                                </select>
                            </div>

                            <div className="fp-field">
                                <label htmlFor="oo-weight" className="fp-label">Weight</label>
                                <select
                                    id="oo-weight"
                                    name="weight"
                                    className="fp-input"
                                    value={product.weight}
                                    onChange={handleProductChange}
                                >

                                    <option value="">Select Weight</option>

                                    {availableWeights.map((w) => (
                                        <option key={w} value={w}>
                                            {w}
                                        </option>
                                    ))}

                                </select>
                            </div>
                        </div>

                        <div className="fp-field oo-add">
                            <span className="oo-add-price">
                                {product.price ? `Rs.${product.price}` : "Select a sweet and weight"}
                            </span>
                            <button
                                type="button"
                                className="fp-btn secondary"
                                onClick={addItem}
                            >
                                <i className="bi bi-plus-lg" aria-hidden="true"></i>
                                Add Item
                            </button>
                        </div>
                    </div>

                </div>

                <div className="fp-panel oo-bill">
                    <h2 className="fp-panel-title">Bill</h2>

                    {orders.length === 0 ? (
                        <p className="oo-empty">No items added yet.</p>
                    ) : (
                        <ul className="oo-items">

                            {orders.map((item, index) => (
                                <li key={index}>

                                    <div className="oo-item-text">
                                        <strong>{item.name}</strong>
                                        <span>{item.weight}</span>
                                    </div>

                                    <span className="oo-item-price">Rs.{item.price}</span>

                                    <button
                                        type="button"
                                        className="oo-remove"
                                        aria-label={`Remove ${item.name}`}
                                        onClick={() => removeItem(index)}
                                    >
                                        <i className="bi bi-x-lg" aria-hidden="true"></i>
                                    </button>

                                </li>
                            ))}

                        </ul>
                    )}

                    <div className="oo-coupon">
                        <input
                            className="fp-input"
                            placeholder="Enter Coupon"
                            aria-label="Coupon code"
                            value={coupon}
                            onChange={(e) => setCoupon(e.target.value)}
                        />

                        <button
                            type="button"
                            className="fp-btn secondary"
                            onClick={() => applyCoupon(coupon)}
                        >
                            Apply
                        </button>
                    </div>

                    {couponMessage && (
                        <p className={`oo-coupon-message ${couponApplied ? "applied" : ""}`}>
                            {couponMessage}
                        </p>
                    )}

                    <div className="oo-summary">

                        <div className="oo-summary-row">
                            <span>Total</span>
                            <span>Rs.{getTotal()}</span>
                        </div>

                        {couponApplied && (
                            <div className="oo-summary-row oo-discount">
                                <span>Coupon {appliedCoupon}</span>
                                <span>-Rs.{discount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="oo-summary-row final">
                            <span>Final Total</span>
                            <span>Rs.{(getTotal() - discount).toFixed(2)}</span>
                        </div>

                    </div>

                    <div className="fp-field">
                        <label htmlFor="oo-payment" className="fp-label">Payment</label>
                        <select
                            id="oo-payment"
                            className="fp-input"
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                        >
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                        </select>
                    </div>

                    {submitError && (
                        <p className="oo-coupon-message" role="alert">{submitError}</p>
                    )}

                    <div className="fp-field">
                        <button
                            type="button"
                            className="fp-btn"
                            onClick={submitOrder}
                            disabled={submitting}
                        >
                            {submitting ? "Placing..." : "Place Order"}
                        </button>
                    </div>
                </div>

            </div>

            <PaymentResultModal
                open={showModal}
                status="success"
                title="Order Created Successfully"
                message={orderNumber ? `Order ${orderNumber} (offline)` : `Order ID: #${orderId}`}
                onClose={() => setShowModal(false)}
            />

        </DashboardShell>

    );
};


export default OfflineOrder;
