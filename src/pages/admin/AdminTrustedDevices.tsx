import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Smartphone, Trash2, RefreshCw, Circle } from 'lucide-react';
import { authApi, getApiErrorMessage, unwrapApiData } from '../../api/j2ee';
import type { TrustedDeviceResponse } from '../../api/j2ee/types';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 12;

const toVietnamTime = (dateInput: string | null | undefined) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
};

const formatRoles = (roles: string[] | null | undefined) => {
  if (!roles || roles.length === 0) return '—';
  return roles
    .map((role) => role.replace(/^ROLE_/, '').toUpperCase())
    .join(', ');
};

export default function AdminTrustedDevices() {
  const [devices, setDevices] = useState<TrustedDeviceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');
  const [page, setPage] = useState(1);

  const loadDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.getTrustedDevices();
      const payload = unwrapApiData<TrustedDeviceResponse[]>(res.data);
      setDevices(payload || []);
      setPage(1);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách thiết bị tin cậy'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleRevoke = async (sessionId: number) => {
    const accepted = confirm('Thu hồi thiết bị này? Thiết bị sẽ phải đăng nhập lại.');
    if (!accepted) return;

    setRevokingId(sessionId);
    setError('');
    try {
      await authApi.revokeTrustedDevice(sessionId);
      setDevices((prev) => prev.map((device) =>
        device.sessionId === sessionId ? { ...device, active: false } : device
      ));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Thu hồi thiết bị thất bại'));
    } finally {
      setRevokingId(null);
    }
  };

  const availableRoles = Array.from(
    new Set(
      devices.flatMap((device) =>
        (device.ownerRoles || []).map((role) => role.replace(/^ROLE_/, '').toUpperCase())
      )
    )
  ).sort((firstRole, secondRole) => firstRole.localeCompare(secondRole));

  const filteredDevices = useMemo(() => devices.filter((device) => {
    const matchedStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && device.active) ||
      (statusFilter === 'REVOKED' && !device.active);

    if (!matchedStatus) {
      return false;
    }

    if (roleFilter === 'ALL') {
      return true;
    }

    const deviceRoles = (device.ownerRoles || []).map((role) => role.replace(/^ROLE_/, '').toUpperCase());
    return deviceRoles.includes(roleFilter);
  }), [devices, statusFilter, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, roleFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredDevices.length, page]);

  const pagedDevices = useMemo(
    () => filteredDevices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredDevices, page]
  );

  const pageCount = Math.ceil(filteredDevices.length / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thiết bị tin cậy</h1>
          <p className="text-sm text-slate-500 mt-0.5">Admin xem toàn bộ, Manager/Staff chỉ xem thiết bị của chính mình</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'REVOKED')}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="REVOKED">Đã thu hồi</option>
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="ALL">Tất cả role</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <button
            onClick={loadDevices}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {filteredDevices.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-sm">
              <ShieldCheck className="mx-auto mb-2 text-slate-300" size={28} />
              {devices.length === 0 ? 'Chưa có thiết bị nào được ghi nhận' : 'Không có thiết bị phù hợp bộ lọc đã chọn'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tài khoản</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Thiết bị</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tạo lúc</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Lần cuối</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedDevices.map((device) => (
                  <tr key={device.sessionId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex flex-col">
                        <span className="font-semibold">{device.ownerUsername || '—'}</span>
                        <span className="text-xs text-slate-500">{device.ownerEmail || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatRoles(device.ownerRoles)}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone size={14} className="text-slate-400" />
                        <span>{device.deviceName || 'Unknown device'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{device.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{toVietnamTime(device.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{toVietnamTime(device.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="relative inline-flex group">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          device.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Circle size={10} className={device.active ? 'fill-emerald-600 stroke-emerald-600' : 'fill-slate-500 stroke-slate-500'} />
                        </span>
                        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          {device.active ? 'Đang hoạt động' : 'Đã thu hồi'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="relative inline-flex group">
                        <button
                          onClick={() => handleRevoke(device.sessionId)}
                          disabled={!device.active || revokingId === device.sessionId}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          {revokingId === device.sessionId ? 'Đang thu hồi...' : 'Thu hồi'}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination
            page={page}
            pageCount={pageCount}
            total={filteredDevices.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}