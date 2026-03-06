import { Link } from 'react-router-dom';
import { Monitor, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Monitor className="w-4 h-4 text-white" />
              </div>
              TechStore
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cửa hàng công nghệ uy tín — laptop, điện thoại,
              phụ kiện chính hãng với giá tốt nhất thị trường.
            </p>
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                <span>support@techstore.vn</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                <span>1800 123 456</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Mua sắm</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/products" className="hover:text-indigo-300 transition-colors">Tất cả sản phẩm</Link>
              </li>
              <li>
                <Link to="/" className="hover:text-indigo-300 transition-colors">Trang chủ</Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Tài khoản</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="hover:text-indigo-300 transition-colors">Đăng nhập</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-indigo-300 transition-colors">Đăng ký tài khoản</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TechStore. All rights reserved.</p>
          <p>Được xây dựng bởi Nhóm 05 — J2EE Project</p>
        </div>
      </div>
    </footer>
  );
}
