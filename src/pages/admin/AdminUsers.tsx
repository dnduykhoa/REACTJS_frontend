import { useEffect, useState } from 'react';
import { authApi } from '../../api/j2ee';
import type { UserProfileResponse } from '../../api/j2ee/types';
import { Users, Search, Shield, X, AlertCircle } from 'lucide-react';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 15;

const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

const ALL_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'USER'];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfileResponse | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    setPage(1);
    authApi.getAllUsers().then((r) => setUsers(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) { load(); return; }
    setLoading(true);
    setPage(1);
    authApi.searchUsers(search).then((r) => setUsers(r.data.data)).finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa người dùng này?')) return;
    try {
      await authApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const openRoleEdit = (user: UserProfileResponse) => {
    setEditingUser(user);
    setSelectedRoles([...user.roles]);
    setError('');
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await authApi.updateUserRoles(editingUser.id, selectedRoles);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? res.data.data : u)));
      setEditingUser(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const roleBadgeClass = (r: string) =>
    r === 'ADMIN' ? 'bg-rose-100 text-rose-700' :
    r === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
    r === 'STAFF' ? 'bg-indigo-100 text-indigo-700' :
    'bg-slate-100 text-slate-600';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Người dùng</h1>
        <p className="text-sm text-slate-500 mt-0.5">{users.length} tài khoản</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo username, email, tên..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">Tìm</button>
        <button type="button" onClick={load} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 border border-slate-200 transition">Xóa lọc</button>
      </form>

      {/* Role edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-900 text-lg">Cập nhật vai trò</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-5">{editingUser.username} · {editingUser.email}</p>
            {error && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-2">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleBadgeClass(role)}`}>{role}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveRoles} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">{saving ? 'Đang lưu...' : 'Lưu'}</button>
              <button onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vai trò</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <Users size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">Không có người dùng</p>
                </td></tr>
              )}
              {users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((user, idx) => (
                <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{user.username}</td>
                  <td className="px-4 py-3 text-slate-600">{user.fullName || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleBadgeClass(r)}`}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{user.provider}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openRoleEdit(user)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Cập nhật vai trò">
                        <Shield size={14} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageCount={Math.ceil(users.length / PAGE_SIZE)} total={users.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
