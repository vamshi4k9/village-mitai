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

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {

        if (couponApplied) {

            const disc = Number((getTotal() * 0.2).toFixed(2));
            setDiscount(disc);

        }

    }, [orders]);

    const fetchItems = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/category/SWEETS`);
            setItems(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {

        const total = getTotal();

        if (coupon === "VAT20") {
            applyCoupon(coupon, total);
        }

    }, [orders]);
    const handleCustomerChange = (e) => {
        setCustomer({
            ...customer,
            [e.target.name]: e.target.value
        });
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

    const applyCoupon = async () => {

        if (!customer.phone) {
            setCouponMessage("Enter phone number first");
            return;
        }

        try {

            const res = await axios.post(
                `${API_BASE_URL}/validate-coupon/`,
                {
                    phone: customer.phone,
                    coupon: coupon
                }
            );

            if (res.data.valid) {

                const disc = getTotal() * (res.data.discount / 100);

                setDiscount(disc);
                setCouponApplied(true);
                setCouponMessage("VAT20 applied (20% OFF)");

            } else {

                setCouponApplied(false);
                setDiscount(0);
                setCouponMessage(res.data.message);

            }

        } catch {
            setCouponMessage("Coupon validation failed");
        }
    };

    const finalTotal = getTotal() - discount;

    const submitOrder = async () => {

        const payload = {
            customer_name: customer.name,
            phone: customer.phone,
            coupon: coupon,
            discount: Number(discount.toFixed(2)),
            total_amount: getTotal(),
            final_amount: getTotal() - discount,
            items: orders
        };

        try {

            const res = await axios.post(
                `${API_BASE_URL}/offline-order/`,
                payload
            );

            setOrderId(res.data.order_id);
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
            setDiscount(0);
            setCouponApplied(false);

        } catch (err) {

            console.error(err);

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
                            onClick={() => applyCoupon(coupon, getTotal())}
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
                                <span>Coupon VAT20</span>
                                <span>-Rs.{discount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="oo-summary-row final">
                            <span>Final Total</span>
                            <span>Rs.{(getTotal() - discount).toFixed(2)}</span>
                        </div>

                    </div>

                    <div className="fp-field">
                        <button
                            type="button"
                            className="fp-btn"
                            onClick={submitOrder}
                        >
                            Place Order
                        </button>
                    </div>
                </div>

            </div>

            <PaymentResultModal
                open={showModal}
                status="success"
                title="Order Created Successfully"
                message={`Order ID: #${orderId}`}
                onClose={() => setShowModal(false)}
            />

        </DashboardShell>

    );
};


export default OfflineOrder;
