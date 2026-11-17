import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../constants";
import { getStaffToken } from "../utils/staffAuth";
import { orderLabel } from "../utils/orderNumber";

// Phone photos are often 3-8 MB; shrink to at most 1600px so the upload is
// quick on mobile data. Falls back to the original file if the browser
// cannot read it.
const MAX_SIDE = 1600;
const MAX_PHOTOS = 5;
const shrinkPhoto = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], `delivery-${Date.now()}.jpg`, { type: "image/jpeg" }) : file);
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

// Closing an order: the delivery person takes a photo at the door. The
// phone's location and the time are saved with it, so the admin can see
// where, when and how each order was handed over.
export default function DeliveryProofModal({ invoice, onClose, onDelivered }) {
  // [{ file, url }] in the order they were taken
  const [photos, setPhotos] = useState([]);
  // "locating" | "ok" | "denied" | "unavailable"
  const [locStatus, setLocStatus] = useState("locating");
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocStatus("unavailable");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocStatus("ok");
      },
      (err) => setLocStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    locate();
  }, []);

  // free the preview images when the screen closes
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    const small = await Promise.all(files.map(shrinkPhoto));
    setPhotos((prev) =>
      [...prev, ...small.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS)
    );
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (!photos.length) {
      setError("Take a photo of the delivered order first.");
      return;
    }
    setSubmitting(true);
    setError("");
    const form = new FormData();
    photos.forEach((p) => form.append("photos", p.file));
    if (location) {
      form.append("latitude", location.latitude);
      form.append("longitude", location.longitude);
      form.append("accuracy", location.accuracy);
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/order-detail/${invoice.id}/deliver/`,
        form,
        { headers: { Authorization: `Bearer ${getStaffToken()}` } }
      );
      onDelivered(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not close the order. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="proof-overlay" onClick={() => !submitting && onClose()}>
      <div
        className="proof-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="proof-head">
          <h2 id="proof-title">Close order {orderLabel(invoice)}</h2>
          <button
            type="button"
            className="proof-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cancel"
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <p className="proof-hint">
          Take photos showing the order at the delivery spot (door, gate or with the
          customer), up to {MAX_PHOTOS}. The customer sees these on their order page.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handlePhotos}
          hidden
        />

        {photos.length > 0 ? (
          <div className="proof-grid">
            {photos.map((p, i) => (
              <div className="proof-thumb" key={p.url}>
                <img src={p.url} alt={`Delivery photo ${i + 1}`} />
                <button
                  type="button"
                  className="proof-thumb-remove"
                  onClick={() => removePhoto(i)}
                  disabled={submitting}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <i className="bi bi-x" aria-hidden="true"></i>
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                className="proof-thumb-add"
                onClick={() => inputRef.current?.click()}
                disabled={submitting}
              >
                <i className="bi bi-camera" aria-hidden="true"></i>
                <span>Add</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="proof-camera"
            onClick={() => inputRef.current?.click()}
          >
            <i className="bi bi-camera" aria-hidden="true"></i>
            Take delivery photo
          </button>
        )}

        <div className={`proof-location ${locStatus}`}>
          {locStatus === "locating" && (
            <>
              <i className="bi bi-geo-alt" aria-hidden="true"></i> Getting your location...
            </>
          )}
          {locStatus === "ok" && (
            <>
              <i className="bi bi-geo-alt-fill" aria-hidden="true"></i> Location saved
              {location?.accuracy ? ` (within ${Math.round(location.accuracy)} m)` : ""}
            </>
          )}
          {(locStatus === "denied" || locStatus === "unavailable") && (
            <>
              <span>
                <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>{" "}
                {locStatus === "denied"
                  ? "Location is blocked. Allow location for this site so the admin can see where you delivered."
                  : "Couldn't get your location."}
              </span>
              <button type="button" className="proof-retry" onClick={locate}>
                Try again
              </button>
            </>
          )}
        </div>

        {error && <p className="proof-error">{error}</p>}

        <button
          type="button"
          className="dash-btn proof-submit"
          onClick={submit}
          disabled={!photos.length || submitting || locStatus === "locating"}
        >
          {submitting ? "Closing order..." : (
            <>
              <i className="bi bi-check2-circle" aria-hidden="true"></i> Mark Delivered
            </>
          )}
        </button>
      </div>
    </div>
  );
}
