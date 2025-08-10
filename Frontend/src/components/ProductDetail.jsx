import { useParams } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { CartContext } from "./CartContext";
import ReviewSection from "./ProductPage/ReviewSection";
import ReviewList from "./ProductPage/ReviewList";

import { API_BASE_URL } from '../constants';

import '../styles/ProductDetail.css'


const ProductDetail = ({ productId }) => {
  const [refresh, setRefresh] = useState(false);
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const { cart, setCart, triggerToast } = useContext(CartContext);
  const [quantity, setQuantity] = useState(1); // Local quantity state
  const [descOpen, setDescOpen] = useState(false); // Toggle for description
  const [selectedWeight, setSelectedWeight] = useState(250); // default 250g


  useEffect(() => {
    axios.get(`${API_BASE_URL}/items/${id}/`)
      .then((response) => setProduct(response.data))
      .catch((error) => console.log("Error fetching product:", error));
  }, [id]);

  if (!product) return <h2>Loading...</h2>;

  const cartItem = cart.find((cItem) => cItem.item.id === product.id);

  // Increase quantity locally
  const increaseQuantity = () => setQuantity(quantity + 1);

  // Decrease quantity locally, but not below 1
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleWeightChange = (e) => {
    const value = e.target.value === "1000" ? 1000 : parseInt(e.target.value);
    setSelectedWeight(value);
  };

  const totalWeight = quantity * selectedWeight;
  const getSessionKey = () => {
    let sessionKey = localStorage.getItem('cart_session_key');
    if (!sessionKey) {
      sessionKey = `anon_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cart_session_key', sessionKey);
    }
    return sessionKey;
  };
  // Handle add to cart
  const handleCart = async () => {
    try {
      if (cartItem) {
        // If item is already in cart, update its quantity
        console.log(cartItem)
        const updatedQuantity = cartItem.quantity + quantity;
        const token = localStorage.getItem('access_token');
        const config = {
        headers: { 'X-Session-Key': getSessionKey() }
      };
        await axios.patch(`${API_BASE_URL}/cart/${cartItem.id}/`, { quantity: updatedQuantity }, config);
        setCart(cart.map(item =>
          item.id === cartItem.id ? { ...item, quantity: updatedQuantity } : item
        ));
      } else {
        // If item is not in cart, add it
        const payload = { item: product.id, quantity: quantity };
        const token = localStorage.getItem('access_token');
        const res = await axios.post(`${API_BASE_URL}/cart/`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCart([...cart, res.data]);
      }
      triggerToast(`${product.name} added to cart`);
    } catch (error) {
      console.log(error);
      alert("Couldn't add to cart");
    }
  };

  return (
    <div>
      <div className="product-detail-container">
        {/* Left Section - Image & Description Toggle */}
        <div className="left-section justify-items-center">
          <img src={product.image} alt={product.name} className="product-image" />




        </div>

        {/* Right Section - Product Details */}
        <div className="right-detailed">
          <p className="detailed_name">{product.name}</p>
          <p className="detailed_price">
            {product.discounted_price !== null ? (
              <>
                <span style={{ textDecoration: "line-through", color: "gray", marginRight: "8px" }}>
                  Rs.{product.price}.00
                </span>
                <span style={{ color: "green", fontWeight: "bold" }}>
                  Rs.{product.discounted_price}.00
                </span>
              </>
            ) : (
              <>Rs.{product.price}.00</>
            )}
          </p>

          {/* Key Features Section */}
          <div className="product-features">
            {product.veg !== null && (
              <div className="feature-box">
                <img
                  src={`${process.env.PUBLIC_URL}/images/${product.veg ? 'veg-icon' : 'non-veg-icon'}.png`}
                  alt={product.veg ? 'Vegetarian' : 'Non-Vegetarian'}
                  className="feature-icon"
                />
                <span>{product.veg ? 'Pure Vegetarian' : 'Non-Vegetarian'}</span>
              </div>
            )}

            <div className="feature-box">
              <img src={`${process.env.PUBLIC_URL}/images/Shelf_life.avif`} alt="Vegetarian" className="feature-icon" />
              <span>{product.shelf_life} Days Shelf Life</span>
            </div>
            <div className="feature-box">
              <img src={`${process.env.PUBLIC_URL}/images/Free_Express_Delivery.avif`} alt="Vegetarian" className="feature-icon" />
              <span>
                {product.delivery_time === 0
                  ? 'Free Express Delivery'
                  : `${product.delivery_time} Day${product.delivery_time > 1 ? 's' : ''} Delivery`}
              </span>

            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex">
          <div className="quan mr-4">
            <p>Quantity</p>
            <div className="quantity-controls">
              <button onClick={decreaseQuantity}>-</button>
              <span>{quantity}</span>
              <button onClick={increaseQuantity}>+</button>
            </div>
          </div>
          <div className="quan">
            <p>Weight</p>
            <select className="quantity-controls" onChange={handleWeightChange} value={selectedWeight}>
              <option value={250}>250g</option>
              <option value={500}>500g</option>
              <option value={1000}>1kg</option>
            </select>
            {/* <span>Total Weight: {totalWeight >= 1000
              ? `${(totalWeight / 1000).toFixed(2)}kg`
              : `${totalWeight}g`}</span> */}
            </div>
            </div>

          <div className="quan">
            <p>Total Weight: {totalWeight >= 1000
              ? `${(totalWeight / 1000).toFixed(2)}kg`
              : `${totalWeight}g`}</p>
          </div>
          {/* Add to Cart Button */}
          <button
            className="add-to-cart-btn-detail"
            onClick={handleCart}>
            Add to Cart
          </button>
          {/* "Tax Included" Section */}
          <p className="tax-info">
            Tax included. Shipping calculated at checkout.
          </p>


          {/* Description Toggle */}
          <div
            className={`description-toggle ${descOpen ? "open" : ""}`}
            onClick={() => setDescOpen(!descOpen)}>
            Description
            <span>{descOpen ? "-" : "+"}</span>
          </div>

          {/* Description Content */}
          {descOpen && (
            <div className={`description-text ${descOpen ? "open" : ""}`}>
              {product.description
                .split('\n')
                .map((line, index) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('->')) {
                    return (
                      <li key={index} style={{ marginLeft: '20px', listStyleType: 'disc' }}>
                        {trimmed.replace('->', '').trim()}
                      </li>
                    );
                  } else {
                    return <p key={index}>{trimmed}</p>;
                  }
                })}
            </div>
          )}



        </div>





      </div>


      {/* <ReviewList productId={productId} key={refresh} /> */}

      <ReviewSection itemId={id} token={localStorage.getItem("token")} triggerToast={triggerToast} />
      <div className="full-width-features">
        <div className="feature-card">
          <img src={`${process.env.PUBLIC_URL}/images/Authentic_Recipe.avif`} alt="Authentic Recipe" />
          <span>Authentic Recipe</span>
        </div>
        <div className="feature-card">
          <img src={`${process.env.PUBLIC_URL}/images/Freshly_Baked.avif`} alt="Freshly Made" />
          <span>Freshly Made in<br></br> Small Batches</span>
        </div>
        <div className="feature-card">
          <img src={`${process.env.PUBLIC_URL}/images/Crispy_Note.avif`} alt="Crispy" />
          <span>Crispy</span>
        </div>
        <div className="feature-card">
          <img src={`${process.env.PUBLIC_URL}/images/Handmade.avif`} alt="Hand Made" />
          <span>Hand Made</span>
        </div>
        <div className="feature-card">
          <img src={`${process.env.PUBLIC_URL}/images/Flavourful.avif`} alt="Flavourful" />
          <span>Flavourful</span>
        </div>
        <div className="feature-card">
          <img src={`${process.env.PUBLIC_URL}/images/Made_with_Phello_Sheets.avif`} alt="Flavourful" />
          <span>Made with Phyllo Sheets</span>
        </div>
      </div>

    </div>
  );
};

export default ProductDetail;
