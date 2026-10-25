import { useEffect, useState } from "react";
import axios from "axios";
import ProductCard from "../ProductCard";
import { API_BASE_URL } from "../../constants";
import "../../styles/ProductExtras.css";

// Row of other items at the bottom of the product page: same category first,
// random items when the category has nothing else.
export default function SimilarItems({ itemId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    axios
      .get(`${API_BASE_URL}/similar-items/${itemId}/`)
      .then((res) => setData(res.data))
      .catch((err) => console.error("Similar items fetch failed", err));
  }, [itemId]);

  if (!data || data.items.length === 0) return null;

  return (
    <section className="sim-section" aria-labelledby="sim-title">
      <h2 id="sim-title" className="pr-title">
        {data.same_category ? "Similar Items" : "You May Also Like"}
      </h2>
      <div className="sim-row">
        {data.items.map((item) => (
          <div className="sim-item" key={item.id}>
            <ProductCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
