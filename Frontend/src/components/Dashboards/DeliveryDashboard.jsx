import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../constants";
import TableView from "../TableView"; // Import the table view component
import "../../styles/Ordering.css";

function DeliveryDashboard() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Please log in to view orders.");
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/all-transactions-invoices/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoices(response.data);
      } catch (error) {
        console.error("Failed to fetch invoices", error);
        alert("Failed to fetch data. Please try again.");
      }
    };

    fetchInvoices();
  }, []);

  return (
    <div className="ordering-container">
      <h2>Order Management</h2>
      <TableView invoices={invoices} userRole='Delivery'  />
    </div>
  );
}

export default DeliveryDashboard;