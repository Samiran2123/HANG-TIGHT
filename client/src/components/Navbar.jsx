import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  Search, 
  Menu, 
  X, 
  Flame, 
  LogOut, 
  Clock, 
  Layers, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar({ onOpenAuth, onOpenSearch }) {
  const { user, profile, isAdmin, logout, loginAsDemoCustomer, loginAsDemoAdmin, isDemoAllowed } = useAuth();
  const { itemCount, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      setUserDropdownOpen(false);
      setToastMessage('Signed out successfully.');
      setTimeout(() => setToastMessage(null), 3000);
      navigate('/');
    } catch (err) {
      console.error('Sign-out exception:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-all">
      {/* Accessible Sign-Out Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          id="signout-toast"
          className="fixed top-20 right-6 z-50 animate-fade-in p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-md"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
      {/* Top Demo Helper Notification Bar for evaluators & academic reviewers */}
      {isDemoAllowed && (
        <div className="bg-gradient-to-r from-brand-900/60 via-slate-900/80 to-brand-900/60 border-b border-brand-500/20 px-4 py-1.5 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="hidden sm:inline">Academic / Live Demo Mode:</span>
            <span className="text-slate-400">Current Role:</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
              isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              user ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              'bg-slate-700/50 text-slate-300'
            }`}>
              {isAdmin ? 'Admin' : user ? 'Customer' : 'Guest'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <>
                <button 
                  onClick={loginAsDemoCustomer}
                  className="hover:text-brand-300 underline transition-colors"
                  title="Log in instantly as test customer"
                >
                  1-Click Customer
                </button>
                <span className="text-slate-600">|</span>
                <button 
                  onClick={loginAsDemoAdmin}
                  className="hover:text-amber-300 underline transition-colors"
                  title="Log in instantly as admin"
                >
                  1-Click Admin
                </button>
              </>
            )}
            {user && (
              <button 
                onClick={handleLogout}
                className="hover:text-rose-400 text-slate-400 transition-colors"
              >
                Switch Account
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1 font-serif">
              HANG TIGHT
            </span>
            <p className="text-[10px] text-slate-400 -mt-1 hidden sm:block tracking-wide">Artisanal Dining</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link 
            to="/" 
            className={`px-3 py-2 rounded-lg transition-colors ${location.pathname === '/' ? 'text-brand-400 bg-brand-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
          >
            Menu
          </Link>
          <Link 
            to="/orders/track" 
            className={`px-3 py-2 rounded-lg transition-colors ${location.pathname.startsWith('/orders/track') ? 'text-brand-400 bg-brand-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
          >
            Track Order
          </Link>
          {user && (
            <Link 
              to="/my-orders" 
              className={`px-3 py-2 rounded-lg transition-colors ${location.pathname === '/my-orders' ? 'text-brand-400 bg-brand-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
            >
              Order History
            </Link>
          )}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all font-semibold"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Actions (Search, Cart, User) */}
        <div className="flex items-center gap-3">
          {/* Cart Button */}
          <button
            onClick={openCart}
            id="open-cart-btn"
            className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-500/40 text-slate-200 hover:text-white transition-all shadow-sm"
            aria-label="View shopping cart"
          >
            <ShoppingBag className="w-5 h-5 text-brand-400" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-brand-500 to-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale">
                {itemCount}
              </span>
            )}
          </button>

          {/* User Menu / Login */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-amber-600 text-white font-bold text-xs flex items-center justify-center">
                  {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate hidden sm:inline">
                  {profile?.full_name || profile?.email?.split('@')[0]}
                </span>
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-fade-in"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Customer'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{profile?.email}</p>
                  </div>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <User className="w-3.5 h-3.5" /> My Profile
                  </Link>
                  <Link 
                    to="/my-orders" 
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <Clock className="w-3.5 h-3.5" /> Order History
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center gap-2 px-4 py-2 text-xs text-amber-400 hover:bg-amber-500/10"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Admin Dashboard
                    </Link>
                  )}
                  <div className="border-t border-slate-800 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              id="login-btn"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 border-b border-slate-800 px-4 py-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Menu Catalog
          </Link>
          <Link
            to="/orders/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Track Order
          </Link>
          {user && (
            <Link
              to="/my-orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Order History
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30"
            >
              Admin Portal
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
