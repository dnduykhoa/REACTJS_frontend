import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import { Monitor, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [show, setShow] = useState({ old: false, newP: false, confirm: false });

  if (!user || user.userId !== Number(id)) {
    navigate('/login');
    return null;
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(Number(id), form);
      setSuccess('Đổi mật khẩu thành công!');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Đổi mật khẩu thất bại'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

  const PasswordField = ({
    label,
    field,
    showKey,
  }: {
    label: string;
    field: 'oldPassword' | 'newPassword' | 'confirmPassword';
    showKey: 'old' | 'newP' | 'confirm';
  }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          required
          value={form[field]}
          onChange={set(field)}
          className={inputClass}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {show[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Monitor size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">TechShop</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Lock size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h1>
              <p className="text-xs text-slate-500">Cập nhật mật khẩu tài khoản của bạn</p>
            </div>
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
              <CheckCircle size={15} className="shrink-0" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField label="Mật khẩu hiện tại" field="oldPassword" showKey="old" />
            <PasswordField label="Mật khẩu mới" field="newPassword" showKey="newP" />
            <PasswordField label="Xác nhận mật khẩu mới" field="confirmPassword" showKey="confirm" />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="mt-5 text-center">
          <Link
            to={`/profile/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition"
          >
            <ArrowLeft size={14} />
            Quay lại hồ sơ
          </Link>
        </div>
      </div>
    </div>
  );
}
