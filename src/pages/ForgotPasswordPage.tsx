import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { Monitor, Mail, KeyRound, Eye, EyeOff } from 'lucide-react';

type Step = 'email' | 'reset';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Bước 1: Gửi email nhận mã
  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSuccess('Mã xác nhận đã được gửi đến email của bạn!');
      setStep('reset');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Không tìm thấy email, vui lòng kiểm tra lại'
      );
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Đặt lại mật khẩu
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, resetToken: code, newPassword, confirmPassword });
      setSuccess('Đặt lại mật khẩu thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Mã xác nhận không đúng hoặc đã hết hạn'
      );
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
          <h2 className="text-2xl font-bold text-slate-800">Quên mật khẩu</h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'email'
              ? 'Nhập email để nhận mã xác nhận'
              : 'Nhập mã xác nhận và mật khẩu mới'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step === 'email' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>1</div>
          <div className={`h-px w-12 ${step === 'reset' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step === 'reset' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
              <span className="mt-0.5">✓</span>
              <span>{success}</span>
            </div>
          )}

          {/* Bước 1: Nhập email */}
          {step === 'email' && (
            <form onSubmit={handleSendEmail} className="space-y-5">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Nhập email đã đăng ký"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
              </button>
            </form>
          )}

          {/* Bước 2: Nhập mã + mật khẩu mới */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Mã xác nhận
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={inputClass}
                  placeholder="Nhập mã 6 ký tự từ email"
                  maxLength={6}
                />
              </div>
              <div>
                <label className={labelClass}>Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass + ' pr-11'}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass + ' pr-11'}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
                  className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            Nhớ mật khẩu rồi?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline font-semibold">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
