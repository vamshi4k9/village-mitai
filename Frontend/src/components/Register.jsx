import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../constants";
import PaymentResultModal from "./PaymentResultModal";
import "../styles/FormPage.css";

const Register = () => {
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.username ||
      !form.first_name ||
      !form.last_name ||
      !form.email ||
      !form.phone ||
      !form.password
    ) {
      setError("Please fill all fields");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/register/`, form);
      setShowSuccess(true);
    } catch (err) {
      setError("Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="fp-auth">
      <form className="fp-card wide" onSubmit={handleSubmit} noValidate>
        <Link to="/">
          <img
            src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
            alt="Village Mitai"
            className="fp-logo"
          />
        </Link>

        <h1 className="fp-title">Create Account</h1>
        <p className="fp-sub">Join Village Mitai to order and track your sweets</p>

        {error && (
          <div className="fp-alert error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
            {error}
          </div>
        )}

        <div className="fp-field">
          <label htmlFor="register-username" className="fp-label">Username</label>
          <input
            id="register-username"
            type="text"
            name="username"
            className="fp-input"
            placeholder="Choose a username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
          />
        </div>

        <div className="fp-row">
          <div className="fp-field">
            <label htmlFor="register-first-name" className="fp-label">First Name</label>
            <input
              id="register-first-name"
              type="text"
              name="first_name"
              className="fp-input"
              placeholder="First name"
              value={form.first_name}
              onChange={handleChange}
              autoComplete="given-name"
            />
          </div>

          <div className="fp-field">
            <label htmlFor="register-last-name" className="fp-label">Last Name</label>
            <input
              id="register-last-name"
              type="text"
              name="last_name"
              className="fp-input"
              placeholder="Last name"
              value={form.last_name}
              onChange={handleChange}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="fp-row">
          <div className="fp-field">
            <label htmlFor="register-email" className="fp-label">Email</label>
            <input
              id="register-email"
              type="email"
              name="email"
              className="fp-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="fp-field">
            <label htmlFor="register-phone" className="fp-label">Phone Number</label>
            <input
              id="register-phone"
              type="tel"
              name="phone"
              className="fp-input"
              placeholder="Mobile number"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="fp-field">
          <label htmlFor="register-password" className="fp-label">Password</label>
          <input
            id="register-password"
            type="password"
            name="password"
            className="fp-input"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="fp-btn" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="fp-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>

      <PaymentResultModal
        open={showSuccess}
        status="success"
        title="Registration Successful"
        message="Your account is ready. Log in to continue."
        onClose={() => navigate("/login")}
      />
    </div>
  );
};

export default Register;
