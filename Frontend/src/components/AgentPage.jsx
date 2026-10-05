import React, { useState } from "react";
import axios from "axios";
import DashboardShell from "./DashboardShell";
import "../styles/FormPage.css";
import "../styles/AgentPage.css";
import { API_BASE_URL } from "../constants";

export default function AgentPage() {
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    area: "",
    pincode: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customer_name || !form.customer_phone || !form.area || !form.pincode) {
      setErrorMsg("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("access_token");

      await axios.post(
        `${API_BASE_URL}/agent-submit/`,
        form,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      setSuccessMsg("Details submitted successfully!");
      setForm({
        customer_name: "",
        customer_phone: "",
        area: "",
        pincode: "",
        notes: "",
      });
    } catch (error) {
      setErrorMsg("Failed to submit details. Try again.");
    }

    setLoading(false);
  };

  return (
    <DashboardShell
      title="Customer Details"
      subtitle="Register a customer you have spoken to"
      actions={
        <a href="/agent-dashboard" className="dash-btn secondary" aria-label="My dashboard">
          <i className="bi bi-bar-chart" aria-hidden="true"></i>
          <span>My Dashboard</span>
        </a>
      }
    >
      <form className="fp-form narrow" onSubmit={handleSubmit} noValidate>
        {errorMsg && (
          <div className="fp-alert error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="fp-alert success" role="status">
            <i className="bi bi-check-circle" aria-hidden="true"></i>
            {successMsg}
          </div>
        )}

        <div className="fp-panel">
          <h2 className="fp-panel-title">Customer Information</h2>

          <div className="fp-row">
            <div className="fp-field">
              <label htmlFor="agent-name" className="fp-label">
                Name<span className="fp-required">*</span>
              </label>
              <input
                id="agent-name"
                className="fp-input"
                type="text"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Enter customer name"
              />
            </div>

            <div className="fp-field">
              <label htmlFor="agent-phone" className="fp-label">
                Phone Number<span className="fp-required">*</span>
              </label>
              <input
                id="agent-phone"
                className="fp-input"
                type="text"
                inputMode="tel"
                name="customer_phone"
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="fp-row">
            <div className="fp-field">
              <label htmlFor="agent-area" className="fp-label">
                Area<span className="fp-required">*</span>
              </label>
              <input
                id="agent-area"
                className="fp-input"
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="Enter area"
              />
            </div>

            <div className="fp-field">
              <label htmlFor="agent-pincode" className="fp-label">
                Pincode<span className="fp-required">*</span>
              </label>
              <input
                id="agent-pincode"
                className="fp-input"
                type="text"
                inputMode="numeric"
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
              />
            </div>
          </div>
        </div>

        <div className="fp-panel">
          <h2 className="fp-panel-title">Additional Notes</h2>

          <div className="fp-field">
            <textarea
              className="fp-input"
              name="notes"
              aria-label="Additional notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Optional notes"
            ></textarea>
          </div>
        </div>

        <button type="submit" className="fp-btn" disabled={loading}>
          {loading ? "Submitting..." : "Submit Details"}
        </button>
      </form>
    </DashboardShell>
  );
}
