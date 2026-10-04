import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { API_BASE_URL, API_BASE_URL_MEDIA, SESSION_TOKEN } from "../constants";
import LocationPicker from "./LocationPicker.js";
import GoogleLoginButton from "./GoogleLoginButton";
import ConfirmPopup from "./ConfirmPopup";
import { CartContext } from "./CartContext";
import { getValidAccessToken, clearSession } from "../utils/auth";
import { isPiece, formatWeight, formatQuantity } from "../utils/pricing";

const EMPTY_ADDRESS = {
  name: "",
  address1: "",
  address2: "",
  phone_number: "",
  latitude: "",
  longitude: "",
};

function Profile() {
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalOrderValue, setTotalOrderValue] = useState(0);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetailsMap, setOrderDetailsMap] = useState({});
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressError, setAddressError] = useState("");

  const navigate = useNavigate();
  const { triggerToast } = useContext(CartContext);
  // what the confirm popup is asking about: { type: "order" | "address", target }
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [profileError, setProfileError] = useState("");
  // bumped after a Google login so the profile and orders are fetched again
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        setNeedsLogin(true);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/profile/`, SESSION_TOKEN);
        setUserData(res.data);
        setNeedsLogin(false);
      } catch (err) {
        clearSession();
        setNeedsLogin(true);
      }
    };

    fetchProfile();
  }, [sessionVersion]);

  const handleEditProfile = () => {
    setProfileForm({
      first_name: userData.first_name || "",
      last_name: userData.last_name || "",
      phone: userData.phone || "",
    });
    setProfileError("");
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setNeedsLogin(true);
      return;
    }

    try {
      const res = await axios.patch(`${API_BASE_URL}/profile/`, profileForm, SESSION_TOKEN);
      setUserData(res.data);
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to update profile. Please try again.");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/past-orders/`, SESSION_TOKEN);
        setOrders(res.data.orders);
        setTotalOrderValue(res.data.total_order_value);
      } catch (error) {
        console.error("Error fetching orders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [sessionVersion]);

  const toggleOrderDetails = async (invoiceId) => {
    if (expandedOrderId === invoiceId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(invoiceId);
    if (orderDetailsMap[invoiceId]) return;

    setDetailsLoading(true);
    try {
      await getValidAccessToken();
      const res = await axios.get(`${API_BASE_URL}/order-detail/${invoiceId}/`, SESSION_TOKEN);
      setOrderDetailsMap(prev => ({
        ...prev,
        [invoiceId]: res.data.transactions
      }));
    } catch (error) {
      console.error("Error fetching order details", error);
      setExpandedOrderId(null);
      triggerToast("Failed to fetch order details.", 2000);
    } finally {
      setDetailsLoading(false);
    }
  };

  const REFUND_LABELS = { PENDING: "in progress", PROCESSED: "completed", FAILED: "failed - please contact us" };

  const handleCancelOrder = async (order) => {
    const token = await getValidAccessToken();
    if (!token) {
      setNeedsLogin(true);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/cancel-order/${order.id}/`, {}, SESSION_TOKEN);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "CANCELLED",
                can_cancel: false,
                refund_status: res.data.refund_status,
                refund_amount: res.data.refund_amount,
              }
            : o
        )
      );
      setTotalOrderValue((prev) => Number(prev) - Number(order.net_amount));
      triggerToast(`Order #${order.id} cancelled`, 2000);
    } catch (error) {
      triggerToast(error.response?.data?.error || "Unable to cancel order.");
    }
  };

  // runs the confirmed action, keeping the popup open (and locked) until it finishes
  const runConfirm = async (action) => {
    setConfirmBusy(true);
    try {
      await action();
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setNewAddress(EMPTY_ADDRESS);
    setAddressError("");
  };

  const handleAddClick = () => {
    setEditingAddress(null);
    setNewAddress(EMPTY_ADDRESS);
    setAddressError("");
    setShowAddressForm(true);
  };

  const handleEditClick = (address) => {
    setEditingAddress(address);
    setNewAddress(address);
    setAddressError("");
    setShowAddressForm(true);
  };

  const validateAddress = () => {
    if (!newAddress.name.trim() || !newAddress.address1.trim()) {
      return "Name and address are required";
    }
    if (!/^[6-9]\d{9}$/.test(newAddress.phone_number)) {
      return "Enter a valid 10 digit phone number";
    }
    return "";
  };

  const saveAddress = async () => {
    const validationError = validateAddress();
    if (validationError) {
      setAddressError(validationError);
      return;
    }

    const token = await getValidAccessToken();
    if (!token) {
      setNeedsLogin(true);
      return;
    }

    // empty coordinates must go as null, the API rejects ""
    const payload = {
      ...newAddress,
      latitude: newAddress.latitude === "" ? null : newAddress.latitude,
      longitude: newAddress.longitude === "" ? null : newAddress.longitude,
    };

    try {
      const response = editingAddress
        ? await axios.put(`${API_BASE_URL}/update-address/${editingAddress.id}/`, payload, SESSION_TOKEN)
        : await axios.post(`${API_BASE_URL}/create-address/`, payload, SESSION_TOKEN);
      setUserData((prev) => ({
        ...prev,
        addresses: editingAddress
          ? prev.addresses.map((addr) => (addr.id === editingAddress.id ? response.data : addr))
          : [...prev.addresses, response.data],
      }));
      closeAddressForm();
    } catch (error) {
      console.error("Failed to save address", error);
      setAddressError("Failed to save address. Please try again.");
    }
  };

  const handleDeleteAddress = async (address) => {
    const token = await getValidAccessToken();
    if (!token) {
      setNeedsLogin(true);
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/delete-address/${address.id}/`, SESSION_TOKEN);
      setUserData((prev) => ({
        ...prev,
        addresses: prev.addresses.filter((addr) => addr.id !== address.id),
      }));
    } catch (error) {
      console.error("Failed to delete address", error);
      triggerToast("Failed to delete address. Please try again.", 2000);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const fullName = userData ? `${userData.first_name} ${userData.last_name}`.trim() : "";


  return (
    <div className="profile-container">
      <h2 className="page-title">My Profile</h2>
      {needsLogin ? (
        <div className="profile-card profile-login">
          <p>Sign in with Google to see your profile and orders.</p>
          <div className="profile-google">
            <GoogleLoginButton
              onLogin={() => setSessionVersion((v) => v + 1)}
              onError={setLoginError}
            />
          </div>
          {loginError && <p className="profile-error">{loginError}</p>}
        </div>
      ) : userData ? (
        <div className="profile-content">
          {/* Account */}
          <div className="profile-card">
            {editingProfile ? (
              <div className="profile-form">
                <h3 className="profile-section-title">Edit Profile</h3>
                <div className="profile-form-row">
                  <div className="profile-field">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, first_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="profile-field">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, last_name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="profile-field">
                  <label>Mobile Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                  />
                </div>
                {profileError && <p className="profile-error">{profileError}</p>}
                <div className="profile-actions">
                  <button className="profile-btn" onClick={handleSaveProfile}>Save</button>
                  <button className="profile-btn secondary" onClick={() => setEditingProfile(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-account">
                {userData.picture ? (
                  <img
                    src={userData.picture}
                    alt={fullName}
                    className="profile-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="profile-avatar profile-avatar-initial">
                    {(fullName || userData.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="profile-account-info">
                  <p className="profile-name">{fullName || "Village Mitai Customer"}</p>
                  <p>{userData.email}</p>
                  <p>{userData.phone ? `+91 ${userData.phone}` : "Mobile number not added"}</p>
                </div>
                <div className="profile-actions">
                  <button className="profile-btn" onClick={handleEditProfile}>Edit Profile</button>
                  <button className="profile-btn secondary" onClick={handleLogout}>Logout</button>
                </div>
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="profile-card">
            <div className="profile-section-head">
              <h3 className="profile-section-title">Addresses</h3>
              {!showAddressForm && (
                <button className="profile-btn small" onClick={handleAddClick}>
                  + Add Address
                </button>
              )}
            </div>

            {userData.addresses && userData.addresses.length > 0 ? (
              <div className="profile-list">
                {userData.addresses.map((addr) => (
                  <div className="profile-item" key={addr.id}>
                    <div className="profile-item-text">
                      <p className="profile-item-title">{addr.name}</p>
                      <p>{addr.address1}</p>
                      {addr.address2 && <p>{addr.address2}</p>}
                      <p>Phone: {addr.phone_number}</p>
                    </div>
                    <div className="profile-actions">
                      <button className="profile-btn small secondary" onClick={() => handleEditClick(addr)}>
                        Edit
                      </button>
                      <button className="profile-btn small secondary" onClick={() => setConfirm({ type: "address", target: addr })}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !showAddressForm && <p className="profile-muted">No addresses saved yet.</p>
            )}

            {showAddressForm && (
              <div className="profile-form profile-address-form">
                <h3 className="profile-section-title">
                  {editingAddress ? "Edit Address" : "Add Address"}
                </h3>
                <div className="profile-form-row">
                  <div className="profile-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={newAddress.name}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="profile-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={newAddress.phone_number}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, phone_number: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="profile-field">
                  <label>Address Line 1</label>
                  <input
                    type="text"
                    value={newAddress.address1}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, address1: e.target.value })
                    }
                  />
                </div>
                <div className="profile-field">
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    value={newAddress.address2 || ""}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, address2: e.target.value })
                    }
                  />
                </div>
                <div className="profile-field">
                  <label>Location (search or tap the map to set)</label>
                  <LocationPicker
                    key={editingAddress ? editingAddress.id : "new"}
                    initialLocation={
                      editingAddress && editingAddress.latitude && editingAddress.longitude
                        ? { lat: editingAddress.latitude, lng: editingAddress.longitude }
                        : undefined
                    }
                    onLocationSelect={(latlng) =>
                      setNewAddress((prev) => ({
                        ...prev,
                        latitude: latlng.lat,
                        longitude: latlng.lng,
                      }))
                    }
                  />
                </div>
                {addressError && <p className="profile-error">{addressError}</p>}
                <div className="profile-actions">
                  <button className="profile-btn" onClick={saveAddress}>
                    {editingAddress ? "Update Address" : "Save Address"}
                  </button>
                  <button className="profile-btn secondary" onClick={closeAddressForm}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="profile-card">
            <div className="profile-section-head">
              <h3 className="profile-section-title">My Orders</h3>
              <span className="profile-total">Total Spent: Rs.{totalOrderValue}</span>
            </div>

            {loading ? null : orders && orders.length > 0 ? (
              <div className="profile-list">
                {orders.map((order) => (
                  <div className="profile-order" key={order.id}>
                    <div className="profile-order-head">
                      <div className="profile-item-text">
                        <p className="profile-item-title">Order #{order.id}</p>
                        <p>{new Date(order.order_date).toLocaleString()}</p>
                        <p>Amount: Rs.{order.net_amount}</p>
                        {order.refund_status && (
                          <p>
                            Refund of Rs.{order.refund_amount}: {REFUND_LABELS[order.refund_status] || order.refund_status}
                          </p>
                        )}
                      </div>
                      <span className="profile-status">
                        {String(order.status).replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="profile-actions">
                      <button
                        className="profile-btn small"
                        onClick={() => toggleOrderDetails(order.id)}
                      >
                        {expandedOrderId === order.id ? "Hide Details" : "View Details"}
                      </button>
                      <button
                        className="profile-btn small secondary"
                        onClick={() => navigate(`/order_status?invoice_id=${order.id}`)}
                      >
                        {order.status === "DELIVERED" ? "Rate Order" : "Track Order"}
                      </button>
                      {order.can_cancel && (
                        <button
                          className="profile-btn small secondary"
                          onClick={() => setConfirm({ type: "order", target: order })}
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>

                    {expandedOrderId === order.id && (
                      <div className="order-detail-section">
                        {detailsLoading && !orderDetailsMap[order.id] ? null : (
                          (orderDetailsMap[order.id] || []).map((item, idx) => (
                            <div key={idx} className="order-detail-card">
                              <img
                                src={`${API_BASE_URL_MEDIA}${item.item.image}`}
                                alt={item.item.name}
                                className="order-item-img"
                              />
                              <div className="order-detail-text">
                                <p className="profile-item-title">{item.item.name}</p>
                                <p>
                                  {isPiece(item.weight)
                                    ? `By Piece: ${formatQuantity(item.quantity, item.weight)}`
                                    : `By Weight: ${formatWeight(item.weight)} x ${item.quantity}`}
                                </p>
                                <p>
                                  Price: Rs.{item.item_amount} {isPiece(item.weight) ? "per piece" : "each"}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-muted">No orders yet.</p>
            )}
          </div>
        </div>
      ) : null}

      {confirm && confirm.type === "order" && (
        <ConfirmPopup
          title="Cancel Order?"
          confirmLabel="Cancel Order"
          cancelLabel="Keep Order"
          busyLabel="Cancelling..."
          busy={confirmBusy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runConfirm(() => handleCancelOrder(confirm.target))}
        >
          <p><strong>Order ID:</strong> #{confirm.target.id}</p>
          <p><strong>Amount:</strong> Rs.{confirm.target.net_amount}</p>
          {confirm.target.payment_mode === "UPI" && (
            <p>Rs.{confirm.target.net_amount} will be refunded to the account you paid from.</p>
          )}
          <p>This action cannot be undone.</p>
        </ConfirmPopup>
      )}

      {confirm && confirm.type === "address" && (
        <ConfirmPopup
          title="Delete Address?"
          confirmLabel="Delete"
          cancelLabel="Keep Address"
          busyLabel="Deleting..."
          busy={confirmBusy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runConfirm(() => handleDeleteAddress(confirm.target))}
        >
          <p><strong>{confirm.target.name}</strong></p>
          <p>{confirm.target.address1}</p>
          <p>This action cannot be undone.</p>
        </ConfirmPopup>
      )}
    </div>
  );
}

export default Profile;
