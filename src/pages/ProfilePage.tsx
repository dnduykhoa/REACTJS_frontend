import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import type { UserProfileResponse, UpdateProfileRequest } from '../api/j2ee/types';
import { User, Mail, Phone, Calendar, Shield, Lock } from 'lucide-react';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<UpdateProfileRequest>({});

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const res = await authApi.updateProfile(Number(id), form);
      setProfile(res.data.data);
      setSuccess('Cập nhật thành công!');
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
        <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" /> Thông tin cá nhân
        </h3>

        {isOwner ? (
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
                <input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="0912 345 678" />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày sinh</span>
                </label>
                <input type="date" value={form.birthDate || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputClass} />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div><span className="text-slate-500 text-xs">Email</span><p className="font-medium">{profile.email}</p></div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div><span className="text-slate-500 text-xs">Số điện thoại</span><p className="font-medium">{profile.phone || '—'}</p></div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div><span className="text-slate-500 text-xs">Ngày sinh</span><p className="font-medium">{profile.birthDate || '—'}</p></div>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <Link
              to={`/profile/${id}/change-password`}
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              <Lock className="w-4 h-4" /> Đổi mật khẩu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
