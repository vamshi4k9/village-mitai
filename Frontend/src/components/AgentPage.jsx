import React, { useState } from "react";
import axios from "axios";
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

  const handleSubmit = async () => {
    if (!form.customer_name || !form.customer_phone || !form.area || !form.pincode) {
      setErrorMsg("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("access_token");

      const response = await axios.post(
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
    <div className="agent-container">
      <div className="agent-card">

        <h2 className="agent-title">Customer Details Form</h2>

        {errorMsg && <div className="error-box">{errorMsg}</div>}
        {successMsg && <div className="success-box">{successMsg}</div>}

        <div className="form-section">
          <h4>Customer Information</h4>

          <label>Name *</label>
          <input
            type="text"
            name="customer_name"
            value={form.customer_name}
            onChange={handleChange}
            placeholder="Enter customer name"
          />

          <label>Phone Number *</label>
          <input
            type="text"
            name="customer_phone"
            value={form.customer_phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />

          <label>Area *</label>
          <input
            type="text"
            name="area"
            value={form.area}
            onChange={handleChange}
            placeholder="Enter area"
          />

          <label>Pincode *</label>
          <input
            type="text"
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            placeholder="Enter pincode"
          />
        </div>

        <div className="form-section">
          <h4>Additional Notes</h4>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Optional notes"
          ></textarea>
        </div>

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit Details"}
        </button>
      </div>
    </div>
  );
}
