import React from "react";
import "../styles/PaymentResultModal.css";

export default function PaymentResultModal({
  open,
  status, // "success" | "failure"
  message,
  data,
  redirectUrl,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className={`modal-card ${status}`}>
        <h2>{status === "success" ? "Payment Successful" : "Payment Failed"}</h2>

        <p className="modal-message">{message}</p>

        {data && (
          <pre className="modal-data">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}

        {redirectUrl && (
          <a href={redirectUrl} className="modal-link">
            View Order
          </a>
        )}

        <button className="modal-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
