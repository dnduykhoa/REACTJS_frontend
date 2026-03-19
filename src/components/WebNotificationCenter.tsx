import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import { notificationApi } from '../api/j2ee';
import type { UserNotificationResponse } from '../api/j2ee/types';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

export default function WebNotificationCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [toasts, setToasts] = useState<UserNotificationResponse[]>([]);

  const userId = user?.userId;

  const pushToast = (incoming: UserNotificationResponse) => {
    setToasts((prev) => {
      if (prev.some((item) => item.id === incoming.id)) {
        return prev;
      }
      return [incoming, ...prev].slice(0, 5);
    });
  };

  useEffect(() => {
    if (!userId) {
      setToasts([]);
      return;
    }

    notificationApi
      .getMyUnread()
      .then((res) => {
        const unread = (res.data.data || []).slice(0, 5);
        setToasts(unread);
      })
      .catch(() => {
        setToasts([]);
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const es = new EventSource(`${BASE_URL}/api/sse/subscribe?userId=${userId}`);

    const handleQnaEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          notificationId: number;
          type: string;
          title: string;
          content: string;
          referenceUrl?: string;
          createdAt: string;
        };

        pushToast({
          id: payload.notificationId,
          type: payload.type as UserNotificationResponse['type'],
          title: payload.title,
          content: payload.content,
          referenceUrl: payload.referenceUrl || null,
          read: false,
          createdAt: payload.createdAt,
          readAt: null,
        });
      } catch {
        // Ignore malformed SSE events
      }
    };

    es.addEventListener('qna-answer', handleQnaEvent as EventListener);

    return () => {
      es.removeEventListener('qna-answer', handleQnaEvent as EventListener);
      es.close();
    };
  }, [userId]);

  const sortedToasts = useMemo(
    () => [...toasts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [toasts]
  );

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const openNotification = async (item: UserNotificationResponse) => {
    try {
      await notificationApi.markAsRead(item.id);
    } catch {
      // still navigate even if mark read fails
    }

    dismissToast(item.id);
    if (item.referenceUrl) {
      navigate(item.referenceUrl);
    }
  };

  if (!userId || sortedToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 w-[min(420px,calc(100vw-2rem))]">
      {sortedToasts.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-indigo-200 bg-white shadow-lg p-3.5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-full bg-indigo-100 p-2 text-indigo-600">
              <BellRing className="w-4 h-4" />
            </div>

            <button
              type="button"
              onClick={() => openNotification(item)}
              className="flex-1 text-left"
            >
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.content}</p>
              <p className="mt-2 text-xs text-indigo-600">Nhấp để xem chi tiết</p>
            </button>

            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="text-slate-400 hover:text-slate-600"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
