import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/OrderStatus.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";
import { Link } from "react-router-dom";


export default function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invoice = queryParams.get("invoice");
  const [reviews, setReviews] = useState({});
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

  useEffect(() => {
    if (order?.id) {
      axios
        .get(`${API_BASE_URL}/order-reviews/${order.id}/`)
        .then((res) => {
          const data = res.data;

          const formatted = {};

          Object.keys(data).forEach((itemId) => {
            formatted[itemId] = {
              rating: data[itemId].rating,
              review: data[itemId].review,
              submitted: true,
              loading: false
            };
          });

          setReviews(formatted);
        })
        .catch((err) => console.error("Review fetch failed", err));
    }
  }, [order]);
  const steps = [
    "ORDERED",
    "IN_PROGRESS",
    "SHIPPING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ];

  const submitReview = async (itemId) => {
    const data = reviews[itemId];

    if (!data?.rating) return;

    setReviews((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        loading: true,
      },
    }));

    try {
      await axios.post(`${API_BASE_URL}/create-review/`, {
        item_id: itemId,
        invoice_id: order.id,
        rating: data.rating,
        review: data.review || "",
      });

      setReviews((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          loading: false,
          submitted: true,
        },
      }));

    } catch (err) {
      console.error(err);

      setReviews((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          loading: false,
        },
      }));
    }
  };

  const getStatusIndex = () => {
    return steps.indexOf(order?.status);
  };

  return (
    <div className="order-status-container">
      <div className="order-card">
        {loading && <p>Loading...</p>}
        {error && <div className="error-box">{error}</div>}

        {order && (
          <>
            <div className="order-header">
              <h3>Order #{order.id}</h3>
              <span className={`status-badge ${order.status.toLowerCase()}`}>
                {order.status
                  .toLowerCase()
                  .split("_")
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
                }              </span>
            </div>

            <p className="order-date">
              {new Date(order.order_date).toLocaleString()}
            </p>

            <div className="order-items">
              {order.transactions.map((t, i) => (
                <div key={i} className="order-item-wrapper">

                  <div className="order-item">
                    <Link to={`/product/${t.item.id}`}>
                      <img
                        src={`${API_BASE_URL_MEDIA}${t.item.image}`}
                        alt={t.item.name}
                      />
                    </Link>

                    <div>
                      <p className="item-name">{t.item.name}</p>
                      <p className="item-meta">Qty: {t.quantity}</p>
                    </div>

                    <div className="item-price">
                      ₹{(parseFloat(t.item_amount) * t.quantity).toFixed(2)}
                    </div>
                  </div>

                  {order.status === "DELIVERED" && (
                    <div className="review-box">

                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`star ${reviews[t.item.id]?.rating >= star ? "filled" : ""
                              } ${reviews[t.item.id]?.submitted ? "disabled" : ""}`}
                            onClick={() => {
                              if (reviews[t.item.id]?.submitted) return;

                              setReviews((prev) => ({
                                ...prev,
                                [t.item.id]: {
                                  ...prev[t.item.id],
                                  rating: star,
                                },
                              }));
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <textarea
                        placeholder="Write review..."
                        value={reviews[t.item.id]?.review || ""}
                        disabled={reviews[t.item.id]?.submitted}
                        onChange={(e) =>
                          setReviews((prev) => ({
                            ...prev,
                            [t.item.id]: {
                              ...prev[t.item.id],
                              review: e.target.value,
                            },
                          }))
                        }
                      />

                      <div className="review-actions">
                        {reviews[t.item.id]?.submitted ? (
                          <span className="review-submitted"> Review Submitted !!</span>
                        ) : (
                          <button
                            className="review-btn"
                            disabled={
                              reviews[t.item.id]?.loading ||
                              !reviews[t.item.id]?.rating
                            }
                            onClick={() => submitReview(t.item.id)}
                          >
                            {reviews[t.item.id]?.loading ? "Submitting..." : "Submit Review"}
                          </button>
                        )}

                      </div>

                    </div>
                  )}

                </div>
              ))}
            </div>

            <div className="timeline">
              {steps.map((step, i) => {
                const currentIndex = getStatusIndex();

                let className = "pending";
                if (i < currentIndex) className = "completed";
                if (i === currentIndex) className = "active";

                return (
                  <div className={`timeline-item ${className}`} key={i}>
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <p className="timeline-title">{step.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {order.address && (
              <div className="address-info">
                <h4>Delivery Address</h4>
                <p><strong>{order.address.name}</strong></p>
                <p>{order.address.address1}</p>
                <p>{order.address.address2}</p>
                <p>{order.address.phone_number}</p>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}