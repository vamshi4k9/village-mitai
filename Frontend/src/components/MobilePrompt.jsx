import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "../styles/MobilePrompt.css";
import { API_BASE_URL } from "../constants";

const DONE_KEY = "mobile_prompt_done";

// Welcome popup that asks a first-time visitor for a mobile number.
// Shown once: submitting or skipping it is remembered in localStorage.
export default function MobilePrompt() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem(DONE_KEY)) return;

    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    localStorage.setItem(DONE_KEY, "true");
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        localStorage.setItem(DONE_KEY, "true");
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!mobile) {
      setError("Mobile number is required");
      return;
    }

    if (mobile.length !== 10) {
      setError("Mobile number must be 10 digits");
      return;
    }

    if (!/^[6-9]/.test(mobile)) {
      setError("Enter valid Indian mobile number");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/save-mobile/`, { mobile });
      close();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mobile-prompt-overlay">
      <div
        className="mobile-prompt-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-prompt-title"
      >
        <button
          type="button"
          className="mobile-prompt-close"
          onClick={close}
          aria-label="Close"
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>

        <img
          src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
          alt="Village Mitai"
          className="mobile-prompt-logo"
        />

        <h2 id="mobile-prompt-title" className="mobile-prompt-title">
          Get updates and offers
        </h2>

        <p className="mobile-prompt-text">
          Enter your mobile number to receive updates
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={`mobile-prompt-field ${error ? "has-error" : ""}`}>
            <span className="mobile-prompt-prefix">+91</span>
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="Mobile number"
              aria-label="Mobile number"
              aria-invalid={error ? "true" : undefined}
              value={mobile}
              onChange={(e) => {
                // digits only, so letters and spaces can never be typed or pasted in
                setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
            />
          </div>

          {error && (
            <p className="mobile-prompt-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="mobile-prompt-btn" disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>

        <button type="button" className="mobile-prompt-skip" onClick={close}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
