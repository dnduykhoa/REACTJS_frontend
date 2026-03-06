import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { Monitor, ChevronDown, LogOut, User, Settings, Shield, Menu, X, ShoppingCart } from 'lucide-react';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
    setMobileOpen(false);
  };

  const initials = user
    ? (user.fullName || user.username).slice(0, 2).toUpperCase()
    : '';

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-slate-800 text-lg hover:text-indigo-600 transition-colors shrink-0"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          TechStore
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          <Link
            to="/"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Trang chủ
          </Link>
          <Link
            to="/products"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Sản phẩm
          </Link>
        </nav>

        {/* User area (desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Cart icon */}
          {user && (
            <Link
              to="/cart"
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
          )}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {user.fullName || user.username}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-20 py-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName || user.username}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Shield className="w-4 h-4" /> Admin Panel
                      </Link>
                    )}
                    <Link
                      to={`/profile/${user.userId}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Hồ sơ của tôi
                    </Link>
                    <Link
                      to={`/profile/${user.userId}/change-password`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Đổi mật khẩu
                    </Link>
                    <div className="border-t border-slate-100 mt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">Trang chủ</Link>
          <Link to="/products" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">Sản phẩm</Link>
          <div className="border-t border-slate-100 pt-2 mt-2">
            {user ? (
              <>
                {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg">Admin Panel</Link>}
                <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  <ShoppingCart className="w-4 h-4" />
                  Giỏ hàng {totalItems > 0 && <span className="ml-auto bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{totalItems}</span>}
                </Link>
                <Link to={`/profile/${user.userId}`} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">Hồ sơ của tôi</Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg">Đăng xuất</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">Đăng nhập</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
