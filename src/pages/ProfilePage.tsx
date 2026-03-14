import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import type { UserProfileResponse, UpdateProfileRequest } from '../api/j2ee/types';
import { User, Mail, Phone, Calendar, Shield, Lock, Pencil, ShieldCheck, ShieldOff } from 'lucide-react';
import { validateVietnamesePhone, normalizePhone, formatPhoneDisplay } from '../utils/phoneUtils';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

const formatPhone = formatPhoneDisplay;

// Định dạng ngày sinh: YYYY-MM-DD -> dd/MM/yyyy
const formatBirthDate = (value: string) => {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<UpdateProfileRequest>({});
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; enable: boolean }>({ open: false, enable: false });

  const isOwner = user?.userId === Number(id);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    authApi.getProfile(Number(id))
      .then((res) => {
        const p = res.data.data;
        setProfile(p);
        setForm({
          fullName: p.fullName || '',
          email: p.email,
          phone: p.phone || '',
          birthDate: p.birthDate || '',
        });
      })
      .catch(() => setError('Không tải được thông tin người dùng'))
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  const handleEdit = () => {
    setEditing(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        email: profile.email,
        phone: profile.phone || '',
        birthDate: profile.birthDate || '',
      });
    }
    setEditing(false);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    // Validate số điện thoại nếu có nhập
    if (form.phone && form.phone.trim()) {
      const phoneErr = validateVietnamesePhone(form.phone.replace(/\s/g, ''));
      if (phoneErr) { setError(phoneErr); return; }
    }
    setSaving(true);
    try {
      const payload = { ...form, phone: form.phone ? normalizePhone(form.phone) : form.phone };
      const res = await authApi.updateProfile(Number(id), payload);
      setProfile(res.data.data);
      setSuccess('Cập nhật thành công!');
      setEditing(false);
      if (isOwner && user) {
        login({ ...user, fullName: res.data.data.fullName || null, email: res.data.data.email });
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Cập nhật thất bại'
      );
    } finally {
      setSaving(false);
    }
  };


  const handle2FAToggle = () => {
    if (!profile || !isOwner) return;
    if (profile.provider === 'google') return;
    setConfirmModal({ open: true, enable: !profile.twoFactorEnabled });
  };

  const handle2FAConfirm = async () => {
    if (!profile) return;
    const newValue = confirmModal.enable;
    setConfirmModal({ open: false, enable: false });
    setTwoFactorLoading(true);
    setError(''); setSuccess('');
    try {
      await authApi.toggle2FA(Number(id), newValue);
      setProfile({ ...profile, twoFactorEnabled: newValue });
      setSuccess(newValue ? 'Đã bật xác thực 2 bước!' : 'Đã tắt xác thực 2 bước!');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Không thể thay đổi trạng thái xác thực 2 bước'
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-slate-500 py-10">{error}</p>;
  }

  const initials = (profile.fullName || profile.username).slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{profile.fullName || profile.username}</h2>
            <p className="text-sm text-slate-500">@{profile.username}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {profile.roles.map((r) => (
                <span
                  key={r}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    r === 'ADMIN'
                      ? 'bg-rose-100 text-rose-700'
                      : r === 'MANAGER'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Info / Edit form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" /> Thông tin cá nhân
          </h3>
          {isOwner && !editing && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
            </button>
          )}
        </div>

        {/* Chế độ xem */}
        {(!isOwner || !editing) && profile && (
          <div className="space-y-0 text-sm text-slate-700">
            <div className="flex items-center gap-3 py-3 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div><span className="text-slate-400 text-xs block">Họ và tên</span><p className="font-medium">{profile.fullName || '—'}</p></div>
            </div>
            <div className="flex items-center gap-3 py-3 border-b border-slate-100">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div><span className="text-slate-400 text-xs block">Email</span><p className="font-medium">{profile.email}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-slate-100">
              <div className="flex items-center gap-3 py-3 md:border-r border-slate-100">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div><span className="text-slate-400 text-xs block">Số điện thoại</span><p className="font-medium">{profile.phone ? formatPhone(profile.phone) : '—'}</p></div>
              </div>
              <div className="flex items-center gap-3 py-3 md:pl-4">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div><span className="text-slate-400 text-xs block">Ngày sinh</span><p className="font-medium">{formatBirthDate(profile.birthDate || '')}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Chế độ chỉnh sửa */}
        {isOwner && editing && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Họ và tên</span>
              </label>
              <input type="text" value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> Email <span className="text-rose-500">*</span></span>
              </label>
              <input type="email" required value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại</span>
                </label>
                <input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className={inputClass} placeholder="0912 345 678" maxLength={12} inputMode="numeric" />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày sinh</span>
                </label>
                <input type="date" value={form.birthDate || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Card Cài đặt */}
      {isOwner && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-5">
          <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" /> Cài đặt
          </h3>

          {/* Đổi mật khẩu */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Mật khẩu</p>
                <p className="text-xs text-slate-400 mt-0.5">Thay đổi mật khẩu đăng nhập của bạn</p>
              </div>
            </div>
            <Link
              to={`/profile/${id}/change-password`}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Đổi mật khẩu
            </Link>
          </div>

          {/* Xác thực 2 bước */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 ${profile.twoFactorEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                {profile.twoFactorEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Xác thực 2 bước (2FA)</p>
                {profile.provider === 'google' ? (
                  <p className="text-xs text-slate-400 mt-0.5">Tài khoản Google không hỗ trợ 2FA</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {profile.twoFactorEnabled
                      ? 'Đang bật — mỗi lần đăng nhập cần xác nhận qua email'
                      : 'Đang tắt — bật để tăng bảo mật tài khoản'}
                  </p>
                )}
              </div>
            </div>
            {profile.provider !== 'google' && (
              <button
                onClick={handle2FAToggle}
                disabled={twoFactorLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                  profile.twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                title={profile.twoFactorEnabled ? 'Tắt 2FA' : 'Bật 2FA'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    profile.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận bật/tắt 2FA */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmModal({ open: false, enable: false })} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.enable ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {confirmModal.enable
                ? <ShieldCheck className="w-6 h-6 text-emerald-600" />
                : <ShieldOff className="w-6 h-6 text-rose-500" />}
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-2">
              {confirmModal.enable ? 'Bật xác thực 2 bước?' : 'Tắt xác thực 2 bước?'}
            </h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              {confirmModal.enable
                ? 'Mỗi lần đăng nhập, bạn sẽ nhận mã xác nhận qua email.'
                : 'Tài khoản của bạn sẽ kém bảo mật hơn khi tắt tính năng này.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, enable: false })}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm"
              >
                Huỷ
              </button>
              <button
                onClick={handle2FAConfirm}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-colors text-sm shadow-sm ${
                  confirmModal.enable ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                }`}
              >
                {confirmModal.enable ? 'Bật 2FA' : 'Tắt 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
