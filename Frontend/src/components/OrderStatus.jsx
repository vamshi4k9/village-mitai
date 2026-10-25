import React, { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/OrderStatus.css";
import { API_BASE_URL, API_BASE_URL_MEDIA, SESSION_TOKEN } from "../constants";
import { getValidAccessToken } from "../utils/auth";
import { CartContext } from "./CartContext";
import { isPiece, formatWeight, formatQuantity } from "../utils/pricing";
import { Link } from "react-router-dom";
import { orderLabel } from "../utils/orderNumber";
import OrderFacts from "./OrderFacts";
import OrderPriceSummary from "./OrderPriceSummary";


const STEP_LABELS = {
  ORDERED: "Order Placed",
  IN_PROGRESS: "Being Prepared",
  SHIPPING: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

const REFUND_LABELS = {
  PENDING: "In progress",
  PROCESSED: "Completed",
  FAILED: "Failed",
};

const REFUND_NOTES = {
  PENDING: "The refund has been started. It usually reaches your account in 5-7 working days.",
  PROCESSED: "The amount has been sent back to the account you paid from.",
  FAILED: "The refund could not be completed. Please contact us and we will sort it out.",
};

export default function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // order number (VM2610240007); invoice_id / invoice are older links
  const invoiceId =
    queryParams.get("order") || queryParams.get("invoice_id") || queryParams.get("invoice");
  // secret from the emailed tracking link; lets the order open without a login
  const trackingToken = queryParams.get("token") || undefined;
  const isLoggedIn = !!localStorage.getItem("access_token");
  const [reviews, setReviews] = useState({});
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { triggerToast } = useContext(CartContext);
  useEffect(() => {
    if (invoiceId) {
      // the order opens for its owner (login), the browser that placed it
      // (session key) or anyone holding the tracking link (token)
      getValidAccessToken()
        .then(() =>
          axios.get(`${API_BASE_URL}/order-detail/${invoiceId}/`, {
            ...SESSION_TOKEN,
            params: { token: trackingToken },
          })
        )
        .then((res) => {
          setOrder(res.data);
          setLoading(false);
        })
        .catch(() => {
          setError("We couldn't find this order. Open it from your profile, or use the tracking link you received.");
          setLoading(false);
        });
    } else {
      setError("Invalid order link.");
      setLoading(false);
    }
  }, [invoiceId, trackingToken]);

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
              savedPhotos: data[itemId].images || [],
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
  const totalItemCount =
    order?.transactions?.reduce(
      (sum, t) => sum + t.quantity,
      0
    ) || 0;
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
      // sent as a form so the photos can go with it
      const form = new FormData();
      form.append("item_id", itemId);
      form.append("invoice_id", order.id);
      form.append("rating", data.rating);
      form.append("review", data.review || "");
      if (trackingToken) form.append("token", trackingToken);
      (data.photos || []).forEach((p) => form.append("images", p.file));

      await axios.post(`${API_BASE_URL}/create-review/`, form, SESSION_TOKEN);

      setReviews((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          loading: false,
          submitted: true,
          error: "",
          savedPhotos: (prev[itemId].photos || []).map((p) => p.url),
        },
      }));

    } catch (err) {
      console.error(err);

      setReviews((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          loading: false,
          error: err.response?.data?.error || "Could not submit the review. Please try again.",
        },
      }));
    }
  };

  // photos picked for a review: up to 3 images, 5 MB each
  const MAX_REVIEW_PHOTOS = 3;
  const addReviewPhotos = (itemId, fileList) => {
    const picked = Array.from(fileList || []);
    setReviews((prev) => {
      const current = prev[itemId]?.photos || [];
      let error = "";
      const ok = picked.filter((f) => {
        if (!f.type.startsWith("image/")) { error = "Only image files can be added"; return false; }
        if (f.size > 5 * 1024 * 1024) { error = "Each photo must be under 5 MB"; return false; }
        return true;
      });
      const room = MAX_REVIEW_PHOTOS - current.length;
      if (ok.length > room) error = `You can add up to ${MAX_REVIEW_PHOTOS} photos`;
      const added = ok.slice(0, Math.max(room, 0)).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return { ...prev, [itemId]: { ...prev[itemId], photos: [...current, ...added], error } };
    });
  };

  const removeReviewPhoto = (itemId, index) => {
    setReviews((prev) => {
      const photos = [...(prev[itemId]?.photos || [])];
      const [gone] = photos.splice(index, 1);
      if (gone) URL.revokeObjectURL(gone.url);
      return { ...prev, [itemId]: { ...prev[itemId], photos, error: "" } };
    });
  };
  const cancelOrder = async () => {

    setCancelLoading(true);

    try {

      const res = await axios.post(
        `${API_BASE_URL}/cancel-order/${order.id}/`,
        { token: trackingToken },
        SESSION_TOKEN
      );

      setOrder({
        ...order,
        status: "CANCELLED",
        can_cancel: false,
        refund_status: res.data.refund_status,
        refund_amount: res.data.refund_amount,
      });

      setShowCancelPopup(false);
      triggerToast("Order cancelled", 2000);

    } catch (err) {

      // close the confirm popup and show the reason in the small bottom popup
      setShowCancelPopup(false);
      triggerToast(
        err.response?.data?.error ||
        "Unable to cancel order."
      );

    } finally {

      setCancelLoading(false);

    }
  };

  const getStatusIndex = () => {
    return steps.indexOf(order?.status);
  };

  return (
    <div className="order-status-container">
      <div className="order-card">
        <div className="order-nav">
          <Link to="/">
            <i className="bi bi-arrow-left" aria-hidden="true"></i> Home
          </Link>
          {isLoggedIn && (
            <Link to="/profile">
              <i className="bi bi-bag" aria-hidden="true"></i> My Orders
            </Link>
          )}
        </div>
        {loading && <div className="order-loading">Loading your order...</div>}
        {error && <div className="error-box">{error}</div>}

        {order && (
          <>
            <div className="order-header">
              <h3>Order {orderLabel(order)}</h3>
              <span className={`status-badge ${order.status.toLowerCase()}`}>
                {order.status
                  .toLowerCase()
                  .split("_")
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
                }              </span>
            </div>

            {/* when it was ordered, the coupon used, when it was delivered */}
            <div className="order-date">
              <OrderFacts order={order} />
            </div>

            {/* two columns on a laptop: what was ordered, then where it is */}
            <div className="order-columns">
            <div className="order-col">
            <h4 className="order-section-title">Items</h4>
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

                    <div className="order-item-text">
                      <p className="item-name">{t.item.name}</p>
                      <p className="item-meta">
                        {isPiece(t.weight)
                          ? `By Piece · ${formatQuantity(t.quantity, t.weight)}`
                          : `${formatWeight(t.weight)} · ${formatQuantity(t.quantity, t.weight)}`}
                      </p>
                    </div>

                    <div className="item-price">
                      Rs.{(parseFloat(t.item_amount) * t.quantity).toFixed(2)}
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

                      {/* photos: picker before submitting, the saved ones after */}
                      {(() => {
                        const r = reviews[t.item.id] || {};
                        const shown = r.submitted
                          ? (r.savedPhotos || [])
                          : (r.photos || []).map((p) => p.url);
                        return (
                          <div className="review-photos">
                            {shown.map((src, i) => (
                              <div className="review-photo" key={src}>
                                <img src={src} alt={`Your review, ${i + 1} of ${shown.length}`} />
                                {!r.submitted && (
                                  <button
                                    type="button"
                                    className="review-photo-remove"
                                    aria-label={`Remove photo ${i + 1}`}
                                    onClick={() => removeReviewPhoto(t.item.id, i)}
                                  >
                                    <i className="bi bi-x" aria-hidden="true"></i>
                                  </button>
                                )}
                              </div>
                            ))}
                            {!r.submitted && shown.length < MAX_REVIEW_PHOTOS && (
                              <label className="review-photo-add">
                                <i className="bi bi-camera" aria-hidden="true"></i>
                                <span>Add photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  hidden
                                  onChange={(e) => {
                                    addReviewPhotos(t.item.id, e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })()}

                      {reviews[t.item.id]?.error && (
                        <p className="review-error">{reviews[t.item.id].error}</p>
                      )}

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

            <div className="order-summary">
              {/* same rows as the checkout summary, with the amounts saved on the order */}
              <OrderPriceSummary order={order} title="Bill Details" />
            </div>

            {order.status === "CANCELLED" && (
              <div className="error-box">This order has been cancelled.</div>
            )}

            {order.refund_status && (
              <div className="refund-box">
                <p className="refund-title">
                  Refund of Rs.{order.refund_amount}: {REFUND_LABELS[order.refund_status] || order.refund_status}
                </p>
                <p>{REFUND_NOTES[order.refund_status]}</p>
              </div>
            )}
            </div>

            <div className="order-col">
            {order.status !== "CANCELLED" && (
            <>
            <h4 className="order-section-title">Order Status</h4>
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
                      <p className="timeline-title">{STEP_LABELS[step]}</p>
                      {className === "active" && (
                        <p className="timeline-desc">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
            )}

            {order.address && (
              <div className="address-info">
                <h4 className="order-section-title">Delivery Address</h4>
                <p><strong>{order.address.name}</strong></p>
                <p>{order.address.address1}</p>
                <p>{order.address.address2}</p>
                <p>{order.address.phone_number}</p>
              </div>
            )}
            {
              order.can_cancel && (

                <button
                  className="cancel-order-btn"
                  onClick={() => setShowCancelPopup(true)}
                >
                  Cancel Order
                </button>

              )
            }
            </div>
            </div>
            {showCancelPopup && (
              <div className="popup-overlay">
                <div className="popup-card">

                  <h3>Cancel Order?</h3>

                  <p>
                    Are you sure you want to cancel this order?
                  </p>

                  <div className="popup-warning">
                    <p>
                      <strong>Total Items:</strong> {totalItemCount}
                    </p>

                    <p>
                      <strong>Order No:</strong> {orderLabel(order)}
                    </p>

                    {order.payment_mode === "UPI" && (
                      <p>
                        Rs.{order.net_amount} will be refunded to the account you paid from.
                      </p>
                    )}

                    <p>
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="popup-actions">

                    <button
                      className="popup-btn popup-btn-secondary"
                      onClick={() => setShowCancelPopup(false)}
                    >
                      Keep Order
                    </button>

                    <button
                      className="popup-btn popup-btn-danger"
                      disabled={cancelLoading}
                      onClick={cancelOrder}
                    >
                      {cancelLoading ? "Cancelling..." : "Cancel Order"}
                    </button>

                  </div>

                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}