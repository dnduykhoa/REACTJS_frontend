import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import { Monitor, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form);
      login(res.data);
      const roles: string[] = res.data.roles || [];
      if (roles.includes('ADMIN')) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Sai tên đăng nhập hoặc mật khẩu';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-3 shadow-lg">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Chào mừng trở lại</h2>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập vào tài khoản TechStore của bạn</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tên đăng nhập / Email
              </label>
              <input
                type="text"
                required
                value={form.usernameOrEmail}
                onChange={(e) => setForm({ ...form, usernameOrEmail: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Nhập username hoặc email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm mt-2"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-indigo-600 hover:underline font-semibold">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
