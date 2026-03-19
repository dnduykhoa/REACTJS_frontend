import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage, productQuestionApi } from '../../api/j2ee';
import type { ProductQuestionResponse } from '../../api/j2ee/types';
import { MessageCircleQuestion, RefreshCcw, Search } from 'lucide-react';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 10;

export default function AdminProductQuestions() {
  const { isStaff } = useAuth();
  const [items, setItems] = useState<ProductQuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ANSWERED' | 'UNANSWERED'>('UNANSWERED');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerDraft, setAnswerDraft] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    setError('');
    const answeredParam =
      statusFilter === 'UNANSWERED'
        ? false
        : statusFilter === 'ANSWERED'
          ? true
          : undefined;

    productQuestionApi
      .getAllForAdmin(answeredParam)
      .then((res) => setItems(res.data.data || []))
      .catch((err: unknown) => {
        setItems([]);
        setError(getApiErrorMessage(err, 'Không thể tải danh sách hỏi đáp sản phẩm.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let next = !keyword
      ? items
      : items.filter((item) =>
      item.productName.toLowerCase().includes(keyword) ||
      item.customerName.toLowerCase().includes(keyword) ||
      item.question.toLowerCase().includes(keyword) ||
      (item.answer || '').toLowerCase().includes(keyword)
    );

    if (timeFilter !== 'ALL') {
      const now = new Date();
      const from = new Date(now);
      if (timeFilter === 'TODAY') {
        from.setHours(0, 0, 0, 0);
      } else if (timeFilter === 'LAST_7_DAYS') {
        from.setDate(now.getDate() - 7);
      } else if (timeFilter === 'LAST_30_DAYS') {
        from.setDate(now.getDate() - 30);
      }

      next = next.filter((item) => new Date(item.askedAt).getTime() >= from.getTime());
    }

    next = [...next].sort((a, b) => {
      const aTime = new Date(a.askedAt).getTime();
      const bTime = new Date(b.askedAt).getTime();
      return sortBy === 'NEWEST' ? bTime - aTime : aTime - bTime;
    });

    return next;
  }, [items, search, timeFilter, sortBy]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const answeredCount = items.filter((item) => item.answered).length;
  const unansweredCount = items.filter((item) => !item.answered).length;

  const submitAnswer = async (questionId: number) => {
    if (!isStaff) return;

    const answer = (answerDraft[questionId] || '').trim();
    if (!answer) return;

    setAnsweringId(questionId);
    try {
      await productQuestionApi.answer(questionId, { answer });
      setAnswerDraft((prev) => ({ ...prev, [questionId]: '' }));
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể gửi phản hồi.'));
    } finally {
      setAnsweringId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hỏi đáp sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lịch sử hỏi đáp theo từng sản phẩm. {isStaff ? 'Staff có thể phản hồi câu hỏi.' : 'Admin/Manager chỉ có quyền xem.'}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCcw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Tổng câu hỏi</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase">Chưa phản hồi</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{unansweredCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Đã phản hồi</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{answeredCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm border ${statusFilter === 'ALL' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('UNANSWERED');
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm border ${statusFilter === 'UNANSWERED' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Chưa phản hồi
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ANSWERED');
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm border ${statusFilter === 'ANSWERED' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Đã phản hồi
          </button>
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm sản phẩm, khách hàng, nội dung..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Lọc theo thời gian</span>
          <select
            value={timeFilter}
            onChange={(event) => {
              setTimeFilter(event.target.value as 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS');
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">Toàn bộ thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="LAST_7_DAYS">7 ngày gần đây</option>
            <option value="LAST_30_DAYS">30 ngày gần đây</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Sắp xếp</span>
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'NEWEST' | 'OLDEST');
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="NEWEST">Mới nhất trước</option>
            <option value="OLDEST">Cũ nhất trước</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Đang tải danh sách hỏi đáp...
          </div>
        ) : paginated.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Không có câu hỏi phù hợp.
          </div>
        ) : (
          paginated.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.customerName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(item.askedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <Link
                  to={`/products/${item.productId}#qna-${item.id}`}
                  target="_blank"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Xem trên trang sản phẩm →
                </Link>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sản phẩm</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{item.productName}</p>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{item.question}</p>
              </div>

              {item.answered ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Đã phản hồi</p>
                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.answer}</p>
                  {item.answeredByName && item.answeredAt && (
                    <p className="mt-2 text-xs text-slate-500">
                      Bởi {item.answeredByName} · {new Date(item.answeredAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              ) : (
                isStaff ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={answerDraft[item.id] || ''}
                      onChange={(event) =>
                        setAnswerDraft((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Nhập nội dung phản hồi cho khách hàng..."
                      className="w-full min-h-24 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => submitAnswer(item.id)}
                        disabled={answeringId === item.id || !(answerDraft[item.id] || '').trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircleQuestion className="w-4 h-4" />
                        {answeringId === item.id ? 'Đang gửi...' : 'Phản hồi'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Câu hỏi này chưa phản hồi.
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>

      {!loading && filtered.length > PAGE_SIZE && (
        <Pagination
          page={page}
          pageCount={Math.ceil(filtered.length / PAGE_SIZE)}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
    </div>
  );
}
