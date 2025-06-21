import './App.css';
import Home from './components/Home';
import { Routes, Route, useLocation, Navigate} from 'react-router-dom';
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






function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getUrlWithAgentId } = useAgentId();


  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };




  return (
    <CartProvider>
      <div className="App">
        <Header toggleCart={toggleCart} />
        <CartPopup isOpen={isCartOpen} toggleCart={toggleCart} />
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


        </Routes>
        <Footer />
      </div>
    </CartProvider>
  );
}

export default App;









