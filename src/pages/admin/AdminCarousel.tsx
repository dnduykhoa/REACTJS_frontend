import { useEffect, useState, useRef } from 'react';
import { carouselApi } from '../../api/j2ee';
import type { CarouselSlide, CarouselSlideRequest } from '../../api/j2ee/types';
import {
  Plus, Pencil, Trash2, X, ChevronUp, ChevronDown,
  Eye, EyeOff, UploadCloud, Link as LinkIcon, Film, ImageIcon,
} from 'lucide-react';

const emptyForm: CarouselSlideRequest = {
  image: '',
  mediaType: 'IMAGE',
  badge: '',
  title: '',
  subtitle: '',
  buttonText: '',
  buttonLink: '/products',
  displayOrder: 0,
  intervalMs: 4000,
  isActive: true,
};

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

export default function AdminCarousel() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CarouselSlideRequest>({ ...emptyForm });
  const [urlMode, setUrlMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; mediaType: string } | null>(null);

  const load = () => {
    setLoading(true);
    carouselApi.getAll()
      .then((res) => setSlides(res.data.data || []))
      .catch(() => setError('Không tải được danh sách slides'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, displayOrder: slides.length + 1 });
    setUrlMode(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (slide: CarouselSlide) => {
    setEditingId(slide.id);
    setForm({
      image: slide.image,
      mediaType: slide.mediaType,
      badge: slide.badge,
      title: slide.title,
      subtitle: slide.subtitle,
      buttonText: slide.buttonText,
      buttonLink: slide.buttonLink,
      displayOrder: slide.displayOrder,
      intervalMs: slide.intervalMs,
      isActive: slide.isActive,
    });
    setUrlMode(false);
    setError('');
    setShowForm(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await carouselApi.uploadMedia(file);
      const { url, mediaType } = res.data.data as { url: string; mediaType: string };
      setForm((prev) => ({ ...prev, image: url, mediaType: mediaType as 'IMAGE' | 'VIDEO' }));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload thất bại. Chỉ chấp nhận ảnh hoặc video.',
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.image?.trim()) { setError('Vui lòng chọn file hoặc nhập đường dẫn'); return; }
    setSaving(true);
    try {
      if (editingId !== null) {
        await carouselApi.update(editingId, form);
        setSuccess('Cập nhật slide thành công!');
      } else {
        await carouselApi.create(form);
        setSuccess('Tạo slide mới thành công!');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Có lỗi xảy ra',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa slide này?')) return;
    setError(''); setSuccess('');
    try {
      await carouselApi.delete(id);
      setSuccess('Đã xóa slide!');
      load();
    } catch { setError('Không thể xóa slide'); }
  };

  const toggleActive = async (slide: CarouselSlide) => {
    try {
      await carouselApi.update(slide.id, { isActive: !slide.isActive });
      load();
    } catch { setError('Không thể thay đổi trạng thái'); }
  };

  const moveOrder = async (slide: CarouselSlide, direction: 'up' | 'down') => {
    const sorted = [...slides].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((s) => s.id === slide.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      carouselApi.update(slide.id, { displayOrder: other.displayOrder }),
      carouselApi.update(other.id, { displayOrder: slide.displayOrder }),
    ]);
    load();
  };

  const sorted = [...slides].sort((a, b) => a.displayOrder - b.displayOrder);
  const isVideo = form.mediaType === 'VIDEO';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Carousel</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý các slide hiển thị trên trang chủ</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Thêm slide
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex justify-between">
          ✓ {success}
          <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && !showForm && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex justify-between">
          ⚠ {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-800">{editingId !== null ? 'Chỉnh sửa slide' : 'Thêm slide mới'}</h2>
            <button onClick={() => { setShowForm(false); setError(''); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          {error && <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">⚠ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cột trái — Media */}
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Hình ảnh / Video <span className="text-rose-500">*</span></label>

                  {/* Toggle */}
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setUrlMode(false)} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg border transition-colors ${!urlMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <UploadCloud className="w-3.5 h-3.5" /> Upload file
                    </button>
                    <button type="button" onClick={() => setUrlMode(true)} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg border transition-colors ${urlMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <LinkIcon className="w-3.5 h-3.5" /> Nhập URL
                    </button>
                  </div>

                  {/* Drop zone */}
                  {!urlMode && (
                    <div
                      className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          <p className="text-xs text-slate-400">Đang upload...</p>
                        </div>
                      ) : form.image ? (
                        <p className="text-xs text-emerald-600 font-semibold">✓ Đã upload — nhấn để đổi file</p>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <UploadCloud className="w-7 h-7 text-slate-300" />
                          <p className="text-xs text-slate-400">Nhấn để chọn <strong>ảnh</strong> hoặc <strong>video</strong></p>
                          <p className="text-xs text-slate-300">JPG, PNG, AVIF, WEBP, MP4, WEBM...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL input */}
                  {urlMode && (
                    <div className="space-y-2">
                      <input type="text" value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputClass} placeholder="/image.png hoặc https://..." />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForm({ ...form, mediaType: 'IMAGE' })} className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-colors ${form.mediaType === 'IMAGE' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <ImageIcon className="w-3.5 h-3.5" /> Hình ảnh
                        </button>
                        <button type="button" onClick={() => setForm({ ...form, mediaType: 'VIDEO' })} className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-colors ${form.mediaType === 'VIDEO' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <Film className="w-3.5 h-3.5" /> Video
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {form.image && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-36">
                      {isVideo ? (
                        <video src={form.image} className="w-full h-full object-cover" muted preload="metadata" onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
                      ) : (
                        <img src={form.image} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <button type="button" onClick={() => setForm({ ...form, image: '' })} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full text-white flex items-center justify-center hover:bg-black/70">
                        <X className="w-3 h-3" />
                      </button>
                      <span className={`absolute bottom-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${isVideo ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {isVideo ? '▶ VIDEO' : '🖼 ẢNH'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Badge</label>
                  <input type="text" value={form.badge || ''} onChange={(e) => setForm({ ...form, badge: e.target.value })} className={inputClass} placeholder="Ưu đãi hôm nay" />
                </div>
                <div>
                  <label className={labelClass}>Tiêu đề</label>
                  <textarea rows={2} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder={"Tiêu đề dòng 1\nTiêu đề dòng 2"} />
                </div>
                <div>
                  <label className={labelClass}>Mô tả phụ</label>
                  <textarea rows={2} value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputClass} placeholder="Mô tả ngắn..." />
                </div>
              </div>

              {/* Cột phải */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Text nút</label>
                    <input type="text" value={form.buttonText || ''} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} className={inputClass} placeholder="Mua ngay" />
                  </div>
                  <div>
                    <label className={labelClass}>Link nút</label>
                    <input type="text" value={form.buttonLink || ''} onChange={(e) => setForm({ ...form, buttonLink: e.target.value })} className={inputClass} placeholder="/products" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Thứ tự</label>
                    <input type="number" min={0} value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Thời gian (ms)</label>
                    <input type="number" min={1000} step={500} value={form.intervalMs ?? 4000} onChange={(e) => setForm({ ...form, intervalMs: Number(e.target.value) })} className={inputClass} />
                    <p className="text-xs text-slate-400 mt-1">1000 = 1 giây</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input id="isActive" type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 select-none">Hiển thị trên trang chủ</label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Huỷ</button>
              <button type="submit" disabled={saving || uploading} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm">
                {saving ? 'Đang lưu...' : editingId !== null ? 'Lưu thay đổi' : 'Tạo slide'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">Chưa có slide nào. Nhấn "Thêm slide" để bắt đầu.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((slide, idx) => (
            <div key={slide.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex ${slide.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div
                className="w-40 shrink-0 h-28 bg-slate-100 relative overflow-hidden cursor-pointer group"
                onClick={() => slide.image && setPreview({ url: slide.image, mediaType: slide.mediaType || 'IMAGE' })}
                title="Nhấn để xem trước"
              >
                {slide.image ? (
                  slide.mediaType === 'VIDEO' ? (
                    <video src={slide.image} className="w-full h-full object-cover" muted preload="metadata" onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
                  ) : (
                    <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8" /></div>
                )}
                {slide.image && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${slide.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                  {slide.isActive ? 'Hiện' : 'Ẩn'}
                </span>
                {slide.mediaType === 'VIDEO' && (
                  <span className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">VIDEO</span>
                )}
              </div>
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {slide.badge && <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{slide.badge}</span>}
                    <p className="font-semibold text-slate-800 mt-1 text-sm truncate">{(slide.title || '(Không có tiêu đề)').replace('\n', ' ')}</p>
                    <p className="text-xs text-slate-400 truncate">{slide.subtitle}</p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 text-right">
                    <p>#{slide.displayOrder}</p>
                    <p>{(slide.intervalMs / 1000).toFixed(1)}s</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => moveOrder(slide, 'up')} disabled={idx === 0} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30" title="Lên"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveOrder(slide, 'down')} disabled={idx === sorted.length - 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30" title="Xuống"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(slide)} className={`p-1.5 rounded-lg border transition-colors ${slide.isActive ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} title={slide.isActive ? 'Ẩn' : 'Hiện'}>
                    {slide.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(slide)} className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50" title="Sửa"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(slide.id)} className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal xem trước */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <X className="w-4 h-4" /> Đóng
            </button>
            {preview.mediaType === 'VIDEO' ? (
              <video
                src={preview.url}
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                controls
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img
                src={preview.url}
                alt="preview"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
