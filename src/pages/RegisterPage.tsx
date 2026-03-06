import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import { Monitor } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    fullName: '',
    phone: '',
    birthDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        username: form.username,
        password: form.password,
        confirmPassword: form.confirmPassword,
        email: form.email,
        fullName: form.fullName || undefined,
        phone: form.phone || undefined,
        birthDate: form.birthDate || undefined,
      });
      login(res.data.data);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Đăng ký thất bại, vui lòng thử lại';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-3 shadow-lg">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Tạo tài khoản</h2>
          <p className="text-sm text-slate-500 mt-1">Đăng ký để mua sắm tại TechStore</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input type="text" required minLength={3} maxLength={50} value={form.username} onChange={set('username')} className={inputClass} placeholder="username" />
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="text-rose-500">*</span>
                </label>
                <input type="email" required value={form.email} onChange={set('email')} className={inputClass} placeholder="email@example.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <input type="password" required minLength={6} value={form.password} onChange={set('password')} className={inputClass} placeholder="Tối thiểu 6 ký tự" />
              </div>
              <div>
                <label className={labelClass}>
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <input type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} className={inputClass} placeholder="Nhập lại mật khẩu" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Họ và tên</label>
              <input type="text" value={form.fullName} onChange={set('fullName')} className={inputClass} placeholder="Nguyễn Văn A" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Số điện thoại</label>
                <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="0912 345 678" />
              </div>
              <div>
                <label className={labelClass}>Ngày sinh</label>
                <input type="date" value={form.birthDate} onChange={set('birthDate')} className={inputClass} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm mt-2"
            >
              {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline font-semibold">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
