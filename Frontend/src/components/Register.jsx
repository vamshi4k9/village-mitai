import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../constants";
import "../styles/Register.css";

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
    try {
      await axios.post(`${API_BASE_URL}/register/`, form);
      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      alert("Registration failed");
    }
  };

  return (
    <div className="register-container">
      <form className="register-card" onSubmit={handleSubmit}>
        <img src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`} alt="Village Mitai Logo" className="register-logo" />
        <h2 className="register-heading">Create Account</h2>
        {error && <div className="register-error">{error}</div>}
        <input
          type="text"
          name="username"
          className="register-input"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
        />
        <input
          type="text"
          name="first_name"
          className="register-input"
          placeholder="First Name"
          value={form.first_name}
          onChange={handleChange}
        />
        <input
          type="text"
          name="last_name"
          className="register-input"
          placeholder="Last Name"
          value={form.last_name}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          className="register-input"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          type="tel"
          name="phone"
          className="register-input"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          className="register-input"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit" className="register-button">Register</button>
      </form>
    </div>
  );
};

export default Register;
