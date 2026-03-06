import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../constants";
import "../styles/Register.css";

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

            const disc = getTotal() * 0.2;

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
            discount: discount,
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
        <div className="register-container">

            <div className="register-card">

                <h2 className="register-heading">Offline Sweet Order</h2>

                <input
                    className="register-input"
                    name="name"
                    placeholder="Customer Name"
                    value={customer.name}
                    onChange={handleCustomerChange}
                />

                <input
                    className="register-input"
                    name="phone"
                    placeholder="Phone Number"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                />

                <select
                    name="item_id"
                    className="register-input"
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

                <select
                    name="weight"
                    className="register-input"
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

                <button
                    className="register-button"
                    onClick={addItem}
                >
                    Add Item
                </button>

                <div className="bill-container">

                    <table className="bill-table">

                        <thead>
                            <tr>
                                <th>Sweet</th>
                                <th>Weight</th>
                                <th>Price</th>
                            </tr>
                        </thead>

                        <tbody>

                            {orders.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.name}</td>
                                    <td>{item.weight}</td>
                                    <td>₹{item.price}</td>
                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

                <div className="coupon-section">

                    <input
                        className="register-input"
                        placeholder="Enter Coupon"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                    />
                    {couponMessage && (
                        <div className="coupon-message">
                            {couponMessage}
                        </div>
                    )}

                    <button
                        className="register-button"
                        onClick={() => applyCoupon(coupon, getTotal())}
                    >
                        Apply
                    </button>

                    {couponApplied && (
                        <div className="coupon-success">
                            Coupon VAT20 applied (20% OFF)
                        </div>
                    )}

                </div>

                <div className="bill-summary">

                    <div className="summary-row">
                        <span>Total</span>
                        <span>₹{getTotal()}</span>
                    </div>

                    {couponApplied && (
                        <div className="summary-row discount">
                            <span>Coupon VAT20</span>
                            <span>-₹{discount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="summary-row final">
                        <span>Final Total</span>
                        <span>₹{(getTotal() - discount).toFixed(2)}</span>
                    </div>

                </div>

                <button
                    className="register-button"
                    style={{ marginTop: "15px" }}
                    onClick={submitOrder}
                >
                    Place Order
                </button>

            </div>
            {showModal && (

                <div className="modal-overlay">

                    <div className="modal-box">

                        <h3>Order Created Successfully 🎉</h3>

                        <p>Order ID: #{orderId}</p>

                        <button
                            className="register-button"
                            onClick={() => setShowModal(false)}
                        >
                            Close
                        </button>

                    </div>

                </div>

            )}

        </div>

    );
};


export default OfflineOrder;