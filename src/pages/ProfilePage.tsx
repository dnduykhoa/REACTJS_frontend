import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import type { UserProfileResponse, UpdateProfileRequest } from '../api/j2ee/types';

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
      // Refresh auth state if it's the current user
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
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-gray-500 py-10">{error}</p>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Thông tin tài khoản</h2>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
            {(profile.fullName || profile.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{profile.username}</p>
            <p className="text-xs text-gray-400">{profile.roles.join(', ')}</p>
          </div>
        </div>

        {isOwner ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                value={form.fullName || ''}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={form.birthDate || ''}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        ) : (
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Điện thoại:</strong> {profile.phone || '—'}</p>
            <p><strong>Ngày sinh:</strong> {profile.birthDate || '—'}</p>
          </div>
        )}

        {isOwner && (
          <div className="pt-2 border-t border-gray-100">
            <Link
              to={`/profile/${id}/change-password`}
              className="text-sm text-blue-600 hover:underline"
            >
              Đổi mật khẩu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
