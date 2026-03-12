import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productApi, brandApi, categoryApi, carouselApi } from '../api/j2ee';
import type { Product, Brand, Category, CarouselSlide } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Zap, Shield, Truck, ChevronLeft, ChevronRight } from 'lucide-react';


function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const bgVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const startTimer = useCallback((slideList: CarouselSlide[], idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (slideList.length <= 1) return;
    const interval = slideList[idx]?.intervalMs ?? 4000;
    timerRef.current = setTimeout(() => {
      const next = (idx + 1) % slideList.length;
      setCurrentSlide(next);
      startTimer(slideList, next);
    }, interval);
  }, []);

  // Khởi động timer khi slides thay đổi
  const slidesRef = useRef<CarouselSlide[]>([]);
  slidesRef.current = slides;

  useEffect(() => {
    if (slides.length > 0) {
      startTimer(slides, 0);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [slides, startTimer]);

  // Khi currentSlide thay đổi → play video đang active, pause video khác
  useEffect(() => {
    slides.forEach((slide, idx) => {
      const vid = videoRefs.current[idx];
      if (!vid) return;
      if (idx === currentSlide && slide.mediaType === 'VIDEO') {
        vid.currentTime = 0;
        vid.play().catch(() => {});
        const bgVid = bgVideoRefs.current[idx];
        if (bgVid) { bgVid.currentTime = 0; bgVid.play().catch(() => {}); }
      } else {
        vid.pause();
        vid.currentTime = 0;
        const bgVid = bgVideoRefs.current[idx];
        if (bgVid) { bgVid.pause(); bgVid.currentTime = 0; }
      }
    });
  }, [currentSlide, slides]);

  const goToSlide = (idx: number) => {
    setCurrentSlide(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    startTimer(slidesRef.current, idx);
  };

  useEffect(() => {
    Promise.all([
      productApi.getAll(),
      brandApi.getActive(),
      categoryApi.getRoot(),
      carouselApi.getActive(),
    ]).then(([p, b, c, carousel]) => {
      setProducts(p.data.data.slice(0, 8));
      setBrands(b.data.data);
      setCategories(c.data.data);
      setSlides(carousel.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* ── Hero Carousel ── */}
      <section
        className="relative overflow-hidden h-[400px] md:h-[500px]"
        onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
        onMouseLeave={() => startTimer(slidesRef.current, currentSlide)}
      >
        {/* Slides */}
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {slide.mediaType === 'VIDEO' ? (
              <>
                {/* Layer 1: nền mờ */}
                <video
                  ref={el => { bgVideoRefs.current[idx] = el; }}
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
                  src={slide.image}
                  muted
                  loop
                  playsInline
                  aria-hidden
                />
                {/* Layer 2: video thật object-contain */}
                <video
                  ref={el => { videoRefs.current[idx] = el; }}
                  key={slide.image}
                  className="absolute inset-0 w-full h-full object-contain"
                  src={slide.image}
                  muted
                  loop
                  playsInline
                />
              </>
            ) : (
              <>
                {/* Layer 1: nền mờ */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-2xl opacity-60"
                  style={{ backgroundImage: `url('${slide.image}')` }}
                />
                {/* Layer 2: ảnh thật object-contain */}
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${slide.image}')` }}
                />
              </>
            )}
            {/* Chỉ hiện overlay + text khi slide có nội dung */}
            {(slide.title || slide.badge || slide.subtitle || slide.buttonText) && (
              <>
                <div className="absolute inset-0 bg-indigo-950/55" />
                <div className="relative h-full flex items-center justify-center">
                  <div className="max-w-7xl w-full mx-auto px-4 text-center">
                    {slide.badge && (
                      <span className="inline-block bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5 tracking-wide uppercase">
                        {slide.badge}
                      </span>
                    )}
                    {slide.title && (
                      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                        {slide.title.split('\n').map((line, i, arr) => (
                          <span key={i}>{line}{i < arr.length - 1 && <br className="hidden md:block" />}</span>
                        ))}
                      </h1>
                    )}
                    {slide.subtitle && (
                      <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.buttonText && (
                      <Link
                        to={slide.buttonLink}
                        className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-3.5 rounded-full hover:bg-indigo-50 transition-colors shadow-lg"
                      >
                        {slide.buttonText} <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Prev / Next arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={() => goToSlide((currentSlide - 1 + slides.length) % slides.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Slide trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => goToSlide((currentSlide + 1) % slides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Slide tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Indicator dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/80'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Trust badges ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {[
            { icon: Truck, title: 'Giao hàng toàn quốc', desc: 'Nhanh chóng & đáng tin cậy' },
            { icon: Shield, title: 'Hàng chính hãng', desc: 'Bảo hành đầy đủ từ nhà sản xuất' },
            { icon: Zap, title: 'Hỗ trợ 24/7', desc: 'Tư vấn miễn phí mọi lúc' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 px-6 py-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-800">Danh mục sản phẩm</h2>
              <Link to="/products" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?categoryId=${cat.id}`}
                  className="bg-white border border-slate-100 rounded-xl py-4 px-3 text-center text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Brands ── */}
        {brands.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-5">Thương hiệu</h2>
            <div className="flex flex-wrap gap-2.5">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  to={`/products?brandId=${brand.id}`}
                  className="bg-white border border-slate-200 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured products ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-slate-800">Sản phẩm nổi bật</h2>
            <Link to="/products" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Chưa có sản phẩm nào.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
