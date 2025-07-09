import './App.css';
import Home from './components/Home';
import { Routes, Route, useLocation } from 'react-router-dom';
import Category from './components/Category';
import { CartProvider } from './components/CartContext';
import Header from './components/Header';
import Items from './components/Items';
import Footer from './components/Footer';
import CartPopup from './components/CartPopup';
import { useState } from 'react';
import Contact from './components/Contact';
import ProductDetail from './components/ProductDetail';
import Checkout from './components/Checkout';
import useAgentId from './components/useAgentId';
import UploadImage from './components/UploadImage';
import SearchResults from './components/SearchResults';
import PreCheckout from './components/PreCheckout';
import LoginPage from "./components/LoginPage";
import PrivateRoute from "./routes/PrivateRoute";
import Register from './components/Register';
import Profile from './components/Profile';
import Ordering from './components/Ordering';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getUrlWithAgentId } = useAgentId();
  const location = useLocation();

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  // Define routes where header/footer should be hidden
  const hideLayoutRoutes = ['/order-status'];

  const shouldHideLayout = hideLayoutRoutes.includes(location.pathname);

  return (
    <CartProvider>
      <div className="App">
        {!shouldHideLayout && <Header toggleCart={toggleCart} />}
        {!shouldHideLayout && <CartPopup isOpen={isCartOpen} toggleCart={toggleCart} />}

        <Routes>
          <Route path='/' element={<Home />} />
          <Route path="/collections/:categorySlug" element={<Category />} />
          <Route path='/items' element={<Items />} />
          <Route path='/contact' element={<Contact />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/upload" element={<UploadImage />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/precheckout" element={<PreCheckout />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/order-status" element={<Ordering />} />
        </Routes>

        {!shouldHideLayout && <Footer />}
      </div>
    </CartProvider>
  );
}

export default App;
