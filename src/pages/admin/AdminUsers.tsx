import { useEffect, useState } from 'react';
import { authApi } from '../../api/j2ee';
import type { UserProfileResponse } from '../../api/j2ee/types';

const ALL_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'USER'];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfileResponse | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    authApi.getAllUsers().then((r) => setUsers(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) { load(); return; }
    setLoading(true);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Quản lý người dùng</h2>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo username, email, tên..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Tìm</button>
        <button type="button" onClick={load} className="px-4 py-2 text-sm text-gray-500 hover:text-blue-600">Xóa lọc</button>
      </form>

      {/* Role edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-gray-800 mb-1">Cập nhật vai trò</h3>
            <p className="text-sm text-gray-500 mb-4">{editingUser.username} ({editingUser.email})</p>
            {error && <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            <div className="space-y-2">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span className="text-sm text-gray-700">{role}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSaveRoles} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? '...' : 'Lưu'}</button>
              <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Họ tên</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Không có người dùng</td></tr>}
              {users.map((user, idx) => (
                <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{user.username}</td>
                  <td className="px-4 py-2 text-gray-600">{user.fullName || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{user.email}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r} className={`text-xs px-1.5 py-0.5 rounded font-medium ${r === 'ADMIN' ? 'bg-red-100 text-red-700' : r === 'MANAGER' ? 'bg-orange-100 text-orange-700' : r === 'STAFF' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-500 capitalize">{user.provider}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openRoleEdit(user)} className="text-blue-600 hover:underline text-xs">Vai trò</button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:underline text-xs">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
