import React from "react";
import "../styles/PaymentResultModal.css";

export default function PaymentResultModal({
  open,
  type,
  status,
  message,
  data,
  redirectUrl,
  onClose,
}) {
  if (!open) return null;

  const isSuccess = status === "success";

  return (
    <div className="payment-modal-overlay">
      <div className={`payment-modal-card ${status}`}>

        <div className={`payment-modal-icon ${status}`}>
          {isSuccess ? "✓" : "!"}
        </div>

        <h2 className="payment-modal-title">
          {isSuccess
            ? `${type} Successful`
            : `${type} Failed`}
        </h2>

        <p className="payment-modal-message">
          {message}
        </p>

        {redirectUrl && (
          <a href={redirectUrl} className="payment-modal-link">
            View Order Details
          </a>
        )}

        <div className="payment-modal-actions">
          <button
            className={`payment-modal-btn ${status}`}
            onClick={onClose}
          >
            {isSuccess ? "Continue" : "Close"}
          </button>
        </div>

      </div>
    </div>
  );
}