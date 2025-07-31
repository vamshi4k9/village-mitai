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
import RecruitForm from './components/RecruitForm';
import Profile from './components/Profile';
import Ordering from './components/Dashboards/Ordering';
import AdminLogin from './components/AdminLogin';
import MakerDashboard from './components/Dashboards/MakerDashboard';
import DeliveryDashboard from './components/Dashboards/DeliveryDashboard';
import ProtectedRoute from './ProtectedRoute';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getUrlWithAgentId } = useAgentId();
  const location = useLocation();

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  // Define routes where header/footer should be hidden
  const hideLayoutRoutes = ['/admin/dashboard', '/admin-login', '/maker/dashboard', '/delivery/dashboard', '/login', '/register', '/recruit'];

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
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recruit" element={<RecruitForm />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Ordering />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maker/dashboard"
            element={
              <ProtectedRoute allowedRoles={['maker']}>
                <MakerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/dashboard"
            element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>

        {!shouldHideLayout && <Footer />}
      </div>
    </CartProvider>
  );
}

export default App;
