import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../constants";
import "../../styles/ProductExtras.css";

const PAGE_SIZE = 5;

const Stars = ({ value }) => (
  <span className="pr-stars" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <i
        key={n}
        className={`bi ${value >= n ? "bi-star-fill" : value >= n - 0.5 ? "bi-star-half" : "bi-star"}`}
        aria-hidden="true"
      ></i>
    ))}
  </span>
);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Written reviews and photos customers left for this item. Star-only ratings
// are not listed (the server leaves them out) but count in the average.
export default function ProductReviews({ itemId }) {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [photo, setPhoto] = useState(null); // photo open full size

  useEffect(() => {
    setData(null);
    setVisible(PAGE_SIZE);
    axios
      .get(`${API_BASE_URL}/item-reviews/${itemId}/`)
      .then((res) => setData(res.data))
      .catch((err) => console.error("Reviews fetch failed", err));
  }, [itemId]);

  // close the photo with Escape
  useEffect(() => {
    if (!photo) return;
    const onKey = (e) => e.key === "Escape" && setPhoto(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo]);

  if (!data) return null;
  const { reviews, avg_rating: avg, total_reviews: total } = data;
  // nothing written and no ratings at all: skip the section
  if (reviews.length === 0 && total === 0) return null;

  return (
    <section className="pr-section" aria-labelledby="pr-title">
      <div className="pr-head">
        <h2 id="pr-title" className="pr-title">Customer Reviews</h2>
        {total > 0 && (
          <div className="pr-summary">
            <span className="pr-avg">{avg}</span>
            <Stars value={avg} />
            <span className="pr-count">
              {total} rating{total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="pr-empty">No written reviews yet.</p>
      ) : (
        <div className="pr-list">
          {reviews.slice(0, visible).map((r) => (
            <article className="pr-card" key={r.id}>
              <div className="pr-card-head">
                <span className="pr-avatar" aria-hidden="true">{r.name.charAt(0)}</span>
                <div className="pr-who">
                  <p className="pr-name">
                    {r.name}
                    <span className="pr-verified">
                      <i className="bi bi-patch-check-fill" aria-hidden="true"></i> Verified purchase
                    </span>
                  </p>
                  <div className="pr-meta">
                    <Stars value={r.rating} />
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                </div>
              </div>

              {r.review && <p className="pr-text">{r.review}</p>}

              {r.images.length > 0 && (
                <div className="pr-photos">
                  {r.images.map((src, i) => (
                    <button
                      type="button"
                      key={src}
                      className="pr-photo"
                      onClick={() => setPhoto(src)}
                      aria-label={`Open photo ${i + 1} from ${r.name}`}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}

          {reviews.length > visible && (
            <button
              type="button"
              className="pr-more"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
            >
              Show more reviews ({reviews.length - visible} more)
            </button>
          )}
        </div>
      )}

      {photo && (
        <div className="pr-lightbox" role="dialog" aria-modal="true" onClick={() => setPhoto(null)}>
          <button type="button" className="pr-lightbox-close" aria-label="Close photo">
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
          <img src={photo} alt="Shared by a customer with their review" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
