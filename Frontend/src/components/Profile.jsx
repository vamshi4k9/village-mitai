import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { API_BASE_URL, API_BASE_URL_MEDIA } from "../constants";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

function Profile() {
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalOrderValue, setTotalOrderValue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetailsMap, setOrderDetailsMap] = useState({});
  const [reviewInputs, setReviewInputs] = useState({});
  const [newAddress, setNewAddress] = useState({
    name: "",
    address1: "",
    address2: "",
    phone_number: "",
    latitude: "",
    longitude: "",
  });
  const [editingAddress, setEditingAddress] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore
  const [markerPosition, setMarkerPosition] = useState(mapCenter);

  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyAZHOajl4vwm3KRWl60NzQzREl29XzHmvc",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/profile/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUserData(res.data);
      } catch (err) {
        alert("Session expired. Please log in again.");
        localStorage.clear();
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await axios.get(`${API_BASE_URL}/past-orders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data.orders);
        setTotalOrderValue(res.data.total_order_value);
      } catch (error) {
        console.error("Error fetching orders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const fetchOrderDetails = async (invoiceId) => {
    setDetailsLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const res = await axios.get(`${API_BASE_URL}/order-detail/${invoiceId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Store the details in a map with invoiceId as the key
      setOrderDetailsMap(prev => ({
        ...prev,
        [invoiceId]: res.data.transactions
      }));

      setExpandedOrderId(invoiceId);  // Set this as the expanded one
    } catch (error) {
      console.error("Error fetching order details", error);
      alert("Failed to fetch order details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAddAddress = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("Please log in to add an address.");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/create-address/`, newAddress, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData((prev) => ({
        ...prev,
        addresses: [...prev.addresses, response.data],
      }));
      setNewAddress({ name: "", address1: "", address2: "", phone_number: "", latitude: "", longitude: "" });
      alert("Address added successfully!");
    } catch (error) {
      console.error("Failed to create address", error);
      alert("Failed to create address. Please try again.");
    }
  };

  const handleEditAddress = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("Please log in to edit an address.");
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/update-address/${editingAddress.id}/`, newAddress, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData((prev) => ({
        ...prev,
        addresses: prev.addresses.map((addr) =>
          addr.id === editingAddress.id ? response.data : addr
        ),
      }));
      setEditingAddress(null);
      setNewAddress({ name: "", address1: "", address2: "", phone_number: "", latitude: "", longitude: "" });
      alert("Address updated successfully!");
    } catch (error) {
      console.error("Failed to update address", error);
      alert("Failed to update address. Please try again.");
    }
  };

  const handleEditClick = (address) => {
    setEditingAddress(address);
    setNewAddress(address);
    setMarkerPosition({ lat: address.latitude, lng: address.longitude });
  };

  const handleMapClick = (event) => {
    const { lat, lng } = event.latLng.toJSON();
    setMarkerPosition({ lat, lng });
    setNewAddress((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const safeMapCenter = mapCenter.lat && mapCenter.lng ? mapCenter : { lat: 12.9716, lng: 77.5946 };
  const safeMarkerPosition = markerPosition.lat && markerPosition.lng ? markerPosition : safeMapCenter;

  return (
    <div className="profile-container">
      <h2 className="profile-heading">Profile</h2>
      {userData ? (
        <div className="profile-card">
          <p><strong>Name:</strong> {userData.first_name} {userData.last_name}</p>
          <p><strong>Email:</strong> {userData.email}</p>

          <div className="profile-section">
            <h3>Addresses</h3>
            {userData.addresses && userData.addresses.length > 0 ? (
              userData.addresses.map((addr, idx) => (
                <div className="address-card" key={idx}>
                  <p><strong>{addr.name}</strong></p>
                  <p>{addr.address1}</p>
                  {addr.address2 && <p>{addr.address2}</p>}
                  <p>Phone: {addr.phone_number}</p>
                  <button
                    className="edit-address-btn"
                    onClick={() => handleEditClick(addr)}
                  >
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <p>No addresses available.</p>
            )}
            <button
              className="add-address-btn"
              onClick={() => setEditingAddress(null)}
            >
              Add Address
            </button>
          </div>

          {editingAddress !== null && (
            <div className="address-form">
              <h3>{editingAddress ? "Edit Address" : "Add Address"}</h3>
              <input
                type="text"
                placeholder="Name"
                value={newAddress.name}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Address Line 1"
                value={newAddress.address1}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, address1: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={newAddress.address2}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, address2: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newAddress.phone_number}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, phone_number: e.target.value })
                }
              />
              <div className="form-group">
                <label>Location</label>
                {isLoaded ? (
                  <GoogleMap
                    center={safeMarkerPosition}
                    zoom={14}
                    mapContainerStyle={{ width: "100%", height: "300px" }}
                    onClick={handleMapClick}
                  >
                    <Marker position={safeMarkerPosition} />
                  </GoogleMap>
                ) : (
                  <p>Loading map...</p>
                )}
              </div>
              <button
                onClick={editingAddress ? handleEditAddress : handleAddAddress}
              >
                {editingAddress ? "Update Address" : "Add Address"}
              </button>
            </div>
          )}

          <div className="profile-section">
            <h3>Complete Orders</h3>
            <p><strong>Total Spent:</strong> ₹{totalOrderValue}</p>

            {loading ? (
              <p>Loading orders...</p>
            ) : orders && orders.length > 0 ? (
              <div className="invoice-summary">
                {orders.map((order) => (
                  <div className="order-card" key={order.id}>
                    <p><strong>Order ID:</strong> #{order.id}</p>
                    <p><strong>Date:</strong> {new Date(order.order_date).toLocaleString()}</p>
                    <p><strong>Amount:</strong> ₹{order.net_amount}</p>
                    <p><strong>Status:</strong> {order.status}</p>

                    <button
                      onClick={() => fetchOrderDetails(order.id)}
                      className="view-details-btn"
                    >
                      {expandedOrderId === order.id ? "Hide Details" : "View Details"}
                    </button>

                    {expandedOrderId === order.id && (
                      <div className="order-detail-section">
                        {detailsLoading ? (
                          <p>Loading details...</p>
                        ) : (
                          <div className="order-detail-items">
                            {(orderDetailsMap[order.id] || []).map((item, idx) => (
                              <div key={idx} className="order-detail-card">
                                <img
                                  src={`${API_BASE_URL_MEDIA}${item.item.image}`}
                                  alt={item.item.name}
                                  className="order-item-img"
                                />
                                <div className="order-detail-text">
                                  <p><strong>{item.quantity}x</strong> {item.item.name}</p>
                                  <p>Price: ₹{item.item_amount}</p>
                                  <p>Weight: {item.weight || 'N/A'}</p>
                                  <p>Discount: ₹{item.discounted}</p>
                                </div>
                                {order.status === "DELIVERED" && (
                                  <div className="rating-form">
                                    <label>Rating (1-5):</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={reviewInputs[item.item.id]?.rating || ""}
                                      onChange={(e) =>
                                        setReviewInputs((prev) => ({
                                          ...prev,
                                          [item.item.id]: {
                                            ...prev[item.item.id],
                                            rating: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                    <textarea
                                      placeholder="Write a review..."
                                      value={reviewInputs[item.item.id]?.comment || ""}
                                      onChange={(e) =>
                                        setReviewInputs((prev) => ({
                                          ...prev,
                                          [item.item.id]: {
                                            ...prev[item.item.id],
                                            comment: e.target.value,
                                          },
                                        }))
                                      }
                                    ></textarea>
                                    <button
                                      className="view-details-btn"
                                      onClick={async () => {
                                        const token = localStorage.getItem("access_token");
                                        try {
                                          await axios.post(
                                            `${API_BASE_URL}/submit-rating/`,
                                            {
                                              item: item.item.id,
                                              transaction: item.id,
                                              rating: reviewInputs[item.item.id]?.rating,
                                              comment: reviewInputs[item.item.id]?.comment,
                                            },
                                            {
                                              headers: {
                                                Authorization: `Bearer ${token}`,
                                              },
                                            }
                                          );
                                          alert("Review submitted!");
                                        } catch (error) {
                                          console.error("Review submit error", error);
                                          alert("Failed to submit review.");
                                        }
                                      }}
                                    >
                                      Submit Review
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            ) : (
              <p>No past orders available.</p>
            )}
          </div>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <p className="loading">Loading...</p>
      )}
    </div>
  );
}

export default Profile;
