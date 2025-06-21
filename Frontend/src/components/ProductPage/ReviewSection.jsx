import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/ReviewSection.css";

const ReviewSection = ({ itemId, token, triggerToast }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });

  useEffect(() => {
    fetchReviews();
  }, [itemId]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/reviews/?item=${itemId}`);
      setReviews(res.data);
    } catch (err) {
      console.log("Review fetch error", err);
    }
  };

  const submitReview = async () => {
    try {
      await axios.post(`http://127.0.0.1:8000/reviews/`, {
        item: itemId,
        rating: newReview.rating,
        comment: newReview.comment,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setNewReview({ rating: 0, comment: '' });
      triggerToast("Review submitted!");
      fetchReviews();
    } catch (err) {
      console.log("Error submitting review:", err);
      alert("Failed to submit review");
    }
  };

  return (
    <div className="reviews-section">
      <h3>Customer Reviews</h3>
      {reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        reviews.map((rev, idx) => (
          <div key={idx} className="review-box">
            <strong>{rev.user}</strong>
            <p>Rating: {rev.rating}/5</p>
            <p>{rev.comment}</p>
            <hr />
          </div>
        ))
      )}

      <div className="submit-review">
        <h4>Write a Review</h4>
        <label>Rating:
          <select
            value={newReview.rating}
            onChange={(e) =>
              setNewReview({ ...newReview, rating: parseInt(e.target.value) })
            }>
            <option value={0}>--Select--</option>
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </label>
        <textarea
          value={newReview.comment}
          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
          placeholder="Write your comments here..."
        />
        <button onClick={submitReview}>Submit Review</button>
      </div>
    </div>
  );
};

export default ReviewSection;
