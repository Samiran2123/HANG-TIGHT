import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';

import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRedirectPath, setAuthRedirectPath] = useState(null);

  const handleOpenAuth = (redirectPath = null) => {
    // Restrict destination strictly to safe relative internal routes
    if (typeof redirectPath === 'string' && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      setAuthRedirectPath(redirectPath);
    } else {
      setAuthRedirectPath(null);
    }
    setIsAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setIsAuthModalOpen(false);
    setAuthRedirectPath(null);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
            {/* Global Navigation */}
            <Navbar 
              onOpenAuth={() => handleOpenAuth(null)} 
            />

            {/* Main Application Routes */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/checkout" element={<Checkout onOpenAuth={() => handleOpenAuth('/checkout')} />} />
                <Route path="/orders/confirmation/:orderNumber" element={<OrderConfirmation />} />
                <Route path="/orders/track" element={<OrderTracking />} />
                <Route path="/orders/track/:identifier" element={<OrderTracking />} />
                <Route path="/my-orders" element={<MyOrders onOpenAuth={() => handleOpenAuth('/my-orders')} />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminDashboard onOpenAuth={() => handleOpenAuth('/admin')} />} />
              </Routes>
            </main>

            {/* Global Slide-Over Cart */}
            <CartDrawer onOpenAuth={() => handleOpenAuth('/checkout')} />

            {/* Global Auth Modal */}
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={handleCloseAuth}
              redirectPath={authRedirectPath}
            />

            {/* Global Footer */}
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
