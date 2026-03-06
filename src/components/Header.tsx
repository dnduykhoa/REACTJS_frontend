import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-wide hover:text-blue-200">
          🖥️ TechStore
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <Link to="/" className="text-white hover:text-blue-200 transition-colors">Trang chủ</Link>
          <Link to="/products" className="text-white hover:text-blue-200 transition-colors">Sản phẩm</Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="border border-yellow-300 text-yellow-300 px-3 py-1 rounded hover:bg-yellow-300 hover:text-blue-900 transition-colors font-medium">
                  Admin
                </Link>
              )}
              <Link to={`/profile/${user.userId}`} className="text-white hover:text-blue-200 transition-colors font-medium">
                {user.fullName || user.username}
              </Link>
              <button
                onClick={handleLogout}
                className="border border-white text-white px-3 py-1 rounded hover:bg-white hover:text-blue-700 transition-colors font-medium"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white hover:text-blue-200 transition-colors font-medium">Đăng nhập</Link>
              <Link to="/register" className="border border-white text-white px-3 py-1 rounded hover:bg-white hover:text-blue-700 transition-colors font-medium">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
