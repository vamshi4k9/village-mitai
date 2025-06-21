import React, { useContext } from "react";
import { CartContext } from "./CartContext";
import axios from "axios";
import "../styles/ProductCard.css"; 
import { useNavigate } from "react-router-dom";
import useAgentId from "./useAgentId";


const ProductCard = ({ item, smallImage = false }) => {
  const { cart, setCart, incQuant, decQuant, triggerToast } = useContext(CartContext);
  const { getUrlWithAgentId } = useAgentId();



  const navigate = useNavigate();
  const handleClick = () => {
    navigate(getUrlWithAgentId(`/product/${item.id}`));
  };

  const handleCart = async () => {
    try {
      const payload = { item: item.id, quantity: 1 };
      const token = localStorage.getItem('access_token');
      const res = await axios.post("http://127.0.0.1:8000/cart/", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCart([...cart, res.data]);
      triggerToast(`${item.name} added to cart`);

    } catch (error) {
      console.log(error);
      alert("Couldn't add");
    }
  };

  const cartItem = cart.find((cItem) => cItem.item.id === item.id);

  return (
    <div className="bestseller-card">
      <div className="image-container">
        <img className={`bestseller-img ${smallImage ? "small-item-img" : ""}`} src={item.image} alt="NOT FOUND" onClick={handleClick}/>

        <div className="add-to-cart-btn">
          {cartItem ? (
            <div className="d-flex align-items-center justify-content-center">
              <div
                className="cart-control ms-2"
                style={{ color: "white", padding: "5px 10px", cursor: "pointer" }}
                onClick={() => decQuant(cartItem)}
              >
                -
              </div>
              <span className="fw-bold">{cartItem.quantity}</span>
              <div
                className="cart-control me-2"
                style={{ color: "white", padding: "5px 10px", cursor: "pointer" }}
                onClick={() => incQuant(cartItem)}
              >
                +
              </div>
            </div>
          ) : (
            <div onClick={handleCart} style={{ cursor: "pointer" }}>
              Add to Cart
            </div>
          )}
        </div>
      </div>
      <p className="bestseller-info">
        {item.name} <br /> Rs.{item.price}
      </p>
    </div>
  );
};

export default ProductCard;









