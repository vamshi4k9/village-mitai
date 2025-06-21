import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';

function Profile() {
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalOrderValue, setTotalOrderValue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get('http://localhost:8000/api/profile/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUserData(res.data);
      } catch (err) {
        alert('Session expired. Please log in again.');
        localStorage.clear();
        navigate('/login');
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await axios.get("http://localhost:8000/api/past-orders/", {
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
      const res = await axios.get(`http://localhost:8000/api/order-detail/${invoiceId}/`, {
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

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetailsMap, setOrderDetailsMap] = useState({});
  const [reviewInputs, setReviewInputs] = useState({});


  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

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
                </div>
              ))
            ) : (
              <p>No addresses available.</p>
            )}
          </div>

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
                                  src={`http://localhost:8000${item.item.image}`}
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
                                            "http://localhost:8000/api/submit-rating/",
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
