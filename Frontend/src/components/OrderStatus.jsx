import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/OrderStatus.css"; // Use your provided CSS theme
import { API_BASE_URL } from '../constants';

export default function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get query params from URL
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invoice = queryParams.get("invoice");

  useEffect(() => {
    if (invoice) {
      axios
        .get(`${API_BASE_URL}/order-detail/${invoice}/`)
        .then((res) => {
          setOrder(res.data);
          setLoading(false);
        })
        .catch(() => {
          setError("Unable to fetch order status.");
          setLoading(false);
        });
    } else {
      setError("Invalid order link.");
      setLoading(false);
    }
  }, [invoice]);

 const steps = [
    { date: "Jan 12", title: "Ordered Today", desc: "Your order is received" },
    { date: "Jan 13", title: "Order Confirmed", desc: "Your order is being shipped" },
    { date: "Jan 14 - Jan 17", title: "Out for Delivery", desc: "Your order is being delivered" },
    { date: "Jan 18", title: "Delivered", desc: "You have received your order" }
  ];

  const getStatusClass = (index) => {
    if (!order) return "";
    const currentIndex = steps.findIndex(s => s.title.toLowerCase().includes(order.status.toLowerCase()));
    if (order.status.toLowerCase() === "cancelled" && index <= currentIndex) return "cancelled";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="order-status-container">
      <div className="order-card">
        {loading && <p>Loading...</p>}
        {error && <div className="error-box">{error}</div>}

        {order && (
          <>
            <div className="product-section">
              <img src={order.product_image} alt="Product" className="product-img" />
              <div>
                <h3>{order.product_name}</h3>
                <p>Qty: {order.quantity} • Order #{order.order_id}</p>
                <p>Purchased {order.purchase_date}</p>
                <p>Arriving {order.estimated_delivery}</p>
                <span className={`status-badge ${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </div>
            </div>

            <div className="timeline">
              {steps.map((step, i) => (
                <div className={`timeline-item ${getStatusClass(i)}`} key={i}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <p className="timeline-date">{step.date}</p>
                    <p className="timeline-title">{step.title}</p>
                    <p className="timeline-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="shipping-info">
              <h4>Shipping Info</h4>
              <p><strong>{order.shipping_method}</strong> — Estimated Delivery: {order.shipping_eta}</p>
              <button className="track-btn">Track Order</button>
            </div>

            <div className="address-info">
              <h4>Address Info</h4>
              <p>{order.customer_name}</p>
              <p>{order.address}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
