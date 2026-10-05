import React from "react";
// same popup look as the cancel popup on the order status page
import "../styles/OrderStatus.css";

// Small yes/no popup used instead of the browser's confirm() box.
export default function ConfirmPopup({
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busyLabel = "Please wait...",
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="popup-overlay" onClick={busy ? undefined : onCancel}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>

        <div className="popup-warning">{children}</div>

        <div className="popup-actions">
          <button className="popup-btn popup-btn-secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="popup-btn popup-btn-danger" disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
