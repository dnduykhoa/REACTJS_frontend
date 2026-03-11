import { useState, type FormEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import type { LoginResponse, TwoFactorResponse } from '../api/j2ee/types';
import { useAuth } from '../context/AuthContext';
import { Monitor, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [twoFactorEmailOrPhone, setTwoFactorEmailOrPhone] = useState('');
  const [otp, setOtp] = useState('');

  const goToHome = (roles: string[]) => {
    if (roles.includes('ADMIN')) navigate('/admin');
    else navigate('/');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ ...form, rememberMe });
      const data = res.data as LoginResponse | TwoFactorResponse;

      if ('requiresTwoFactor' in data && data.requiresTwoFactor) {
        // Backend yêu cầu xác thực 2 bước
        setTwoFactorEmailOrPhone(data.emailOrPhone);
        setStep('2fa');
      } else {
        const loginData = data as LoginResponse;
        login(loginData, rememberMe);
        goToHome(loginData.roles || []);
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

  const doVerify2FA = async (otpValue: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verify2FA({ emailOrPhone: twoFactorEmailOrPhone, code: otpValue });
      const loginData = res.data as LoginResponse;
      login(loginData, rememberMe);
      goToHome(loginData.roles || []);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Mã xác thực không đúng hoặc đã hết hạn';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: FormEvent) => {
    e.preventDefault();
    await doVerify2FA(otp);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-3 shadow-lg">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {step === '2fa' ? 'Xác thực 2 bước' : 'Chào mừng trở lại'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === '2fa'
              ? 'Nhập mã xác thực đã được gửi đến email của bạn'
              : 'Đăng nhập vào tài khoản TechStore của bạn'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Bước 1: Đăng nhập thường ── */}
          {step === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email / Số điện thoại
                </label>
                <input
                  type="text"
                  value={form.emailOrPhone}
                  onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="Nhập email hoặc số điện thoại"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
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

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="mr-2 accent-indigo-600"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-slate-700 select-none">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline font-medium">
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm mt-2"
              >
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>

              {/* Hoặc */}
              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="mx-3 text-sm text-slate-400">Hoặc</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Nút đăng nhập bằng Google */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    const idToken = credentialResponse.credential;
                    if (!idToken) { setError('Không lấy được thông tin từ Google'); return; }
                    setLoading(true);
                    setError('');
                    try {
                      const res = await authApi.loginWithGoogle({ idToken });
                      login(res.data.data, rememberMe);
                      const roles: string[] = res.data.data?.roles || [];
                      goToHome(roles);
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Đăng nhập Google thất bại';
                      setError(msg);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setError('Đăng nhập Google thất bại')}
                  width="368"
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                />
              </div>
            </form>
          )}

          {/* ── Bước 2: Nhập mã 2FA ── */}
          {step === '2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-indigo-600" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Mã xác thực (6 chữ số)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtp(val);
                    if (val.length === 6 && !loading) doVerify2FA(val);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-center text-lg tracking-widest font-mono"
                  placeholder="● ● ● ● ● ●"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1.5 text-center">
                  Mã đã được gửi đến email của tài khoản
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {loading ? 'Đang xác thực...' : 'Xác nhận'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('login'); setOtp(''); setError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
              >
                ← Quay lại đăng nhập
              </button>
            </form>
          )}

          {step === 'login' && (
            <div className="mt-6 text-center text-sm text-slate-500">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-indigo-600 hover:underline font-semibold">
                Đăng ký ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
