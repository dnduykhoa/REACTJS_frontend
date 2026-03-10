import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import { Monitor, Eye, EyeOff } from 'lucide-react';

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

  // Định dạng số điện thoại: xxxx xxx xxx
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 4 && digits.length <= 7) {
      formatted = `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else if (digits.length > 7) {
      formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    }
    return formatted;
  };

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.username || form.username.length < 3) errs.username = "Tên đăng nhập phải từ 3 đến 50 ký tự";
    if (!form.email) errs.email = "Email không được để trống";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ";
    if (!form.password) errs.password = "Mật khẩu không được để trống";
    if (!form.confirmPassword) errs.confirmPassword = "Xác nhận mật khẩu không được để trống";
    if (!form.phone) errs.phone = "Số điện thoại không được để trống";
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const errs = validateForm();
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await authApi.register({
        username: form.username,
        password: form.password,
        confirmPassword: form.confirmPassword,
        email: form.email,
        fullName: form.fullName || undefined,
        // Gửi số điện thoại không có khoảng trắng
        phone: form.phone ? form.phone.replace(/\s/g, '') : undefined,
        birthDate: form.birthDate || undefined,
      });
      login(res.data.data);
      navigate('/');
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string; data?: Record<string, string> } } })?.response?.data;
      // Nếu backend trả về map lỗi từng field
      if (response?.data && typeof response.data === 'object') {
        setFieldErrors(response.data as Record<string, string>);
      } else {
        setError(response?.message || 'Đăng ký thất bại, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
  const inputErrClass =
    'w-full border border-rose-400 rounded-xl px-4 py-2.5 text-sm bg-rose-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-colors';
  const getInput = (field: string) => fieldErrors[field] ? inputErrClass : inputClass;
  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';
  const errMsg = (field: string) =>
    fieldErrors[field] ? <p className="text-rose-500 text-xs mt-1">{fieldErrors[field]}</p> : null;

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

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  minLength={3}
                  maxLength={50}
                  value={form.username}
                  onChange={set('username')}
                  className={getInput('username')}
                  placeholder="Tên đăng nhập"
                />
                {errMsg('username')}
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.email}
                  onChange={set('email')}
                  className={getInput('email')}
                  placeholder="email@example.com"
                />
                {errMsg('email')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    value={form.password}
                    onChange={set('password')}
                    className={getInput('password') + ' pr-11'}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errMsg('password')}
              </div>
              <div>
                <label className={labelClass}>
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className={getInput('confirmPassword') + ' pr-11'}
                    placeholder="Nhập lại mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errMsg('confirmPassword')}
              </div>
            </div>

            <div>
              <label className={labelClass}>Họ và tên</label>
              <input
                type="text"
                value={form.fullName}
                onChange={set('fullName')}
                className={inputClass}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => {
                    setForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }));
                    setFieldErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  className={getInput('phone')}
                  placeholder="0912 345 678"
                  maxLength={12}
                  inputMode="numeric"
                />
                {errMsg('phone')}
              </div>
              <div>
                <label className={labelClass}>Ngày sinh</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={set('birthDate')}
                  className={inputClass}
                />
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
