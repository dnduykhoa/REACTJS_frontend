# Huong dan FE nang cap UX cho PC Builder (truoc khi trien khai)

## 1) Muc tieu
- Giai quyet van de giao dien chi hien thi ten linh kien, thieu thong tin de ra quyet dinh.
- Cho phep user:
  - Xem nhanh chi tiet linh kien sap chon.
  - Xem ro chi tiet linh kien da chon.
  - Hieu ngay vi sao linh kien duoc/khong duoc de xuat.
- Giu nguyen logic tuong thich tu backend, nang cap chu yeu o lop UX/UI.

## 2) Hien trang
- Trang builder hien tai da co:
  - Danh sach slot.
  - Bang options theo slot.
  - Summary (tong gia, cong suat, canh bao).
- Van de UX:
  - O danh sach options, thong tin moi dong con ngan (ten + vai key specs).
  - Khong co quick view de xem chi tiet san pham ngay trong luong build.
  - O cot slot ben trai, linh kien da chon chi hien ten, khong co hinh/spec/action ro rang.
  - User phai mo trang khac de xem sau -> vo luong build lien mach.

## 3) Pham vi de xuat (MVP)

### 3.1 Quick View cho linh kien sap chon
- Trigger:
  - Nut "Xem nhanh" tren tung option.
- Hien thi:
  - Hinh dai dien.
  - Ten, brand, category.
  - Gia, ton kho.
  - Specs day du hon (uu tien 8-12 specs quan trong).
  - Trang thai phu hop voi selection hien tai (tuong thich / can luu y / khong phu hop neu co).
- CTA:
  - Chon linh kien.
  - Xem trang chi tiet day du (mo route product detail).

### 3.2 Card "Da chon" chi tiet hon cho moi slot
- Thay dong text "Da chon #id" bang card nho:
  - Thumbnail (neu co).
  - Ten linh kien.
  - Gia.
  - 3-5 specs quan trong theo slot.
- Action nhanh:
  - Doi (focus den slot do).
  - Bo chon.
  - Xem chi tiet.

### 3.3 Badge ly do loc/tuong thich ngay trong bang option
- Moi dong option can co badge:
  - Compatible
  - Warning
  - Filtered reason (neu backend tra ve du thong tin)
- Neu chua co reason chi tiet tu backend:
  - FE hien toi thieu trang thai chung + appliedFilters o dau bang.

## 4) API va du lieu can dung

### 4.1 API dang co (da du cho MVP co ban)
- GET /api/products/pc-builder/slots
- GET /api/products/pc-builder/options?slot=...&...selection
- GET /api/products/pc-builder/summary?...selection

### 4.2 API bo sung de co Quick View "day du"
Lua chon A (uu tien, tai su dung API san pham):
- GET /api/products/{id}
- Su dung data:
  - media[] de lay anh
  - description
  - specifications[]
  - brand/category

Lua chon B (toi uu sau):
- Tao endpoint quick-view rieng cho builder de tra payload gon + dung theo slot.

Khuyen nghi:
- Lam A truoc de nhanh di vao production.
- Cache chi tiet theo productId de tranh goi lai.

## 5) Kien truc state FE de xay
- selection: giu nguyen.
- optionsBySlot + cache key theo selection: giu nguyen.
- Them:
  - quickViewProductId: number | null
  - productDetailCache: Record<number, Product>
  - loadingProductDetail: boolean
  - productDetailError: string
  - selectedPartDetailBySlot: map slot -> product detail (lay tu cache)

## 6) Quy tac UX quan trong
- Khong bat user roi khoi trang builder de xem thong tin co ban.
- Moi thao tac chon linh kien phai co feedback ngay:
  - Gia thay doi
  - Cong suat thay doi
  - Canh bao thay doi
- Neu co ERROR warning:
  - Van cho xem chi tiet, nhung chan checkout.
- Mobile:
  - Quick view dung bottom sheet.
  - Summary + nut tiep tuc dang sticky.

## 7) TODO truoc khi code (Pre-implementation checklist)

### 7.1 Chot nghiep vu va UI scope
- [ ] Xac nhan MVP gom 3 phan: Quick View, Selected Card, Compatibility Badge.
- [ ] Xac nhan desktop dung side panel hay modal.
- [ ] Xac nhan mobile dung bottom sheet.
- [ ] Chot danh sach specs uu tien theo tung slot (cpu/mainboard/ram/gpu/storage/psu/case/cooling).

### 7.2 Chot data contract
- [ ] Kiem tra Product detail endpoint co du media + specifications cho tat ca danh muc linh kien.
- [ ] Chot map key specs -> label hien thi than thien (vi du: ram_type -> Loai RAM).
- [ ] Chot fallback khi thieu du lieu (anh mac dinh, description rong, spec trong).

### 7.3 Chot technical design
- [ ] Dinh nghia them state cho quick view va detail cache.
- [ ] Dinh nghia cache policy (TTL hoac cache trong session trang).
- [ ] Dinh nghia component moi:
  - [ ] PcBuilderOptionRow
  - [ ] PcBuilderQuickView
  - [ ] PcBuilderSelectedCard
  - [ ] CompatibilityBadge

### 7.4 Chot UX copy va visual
- [ ] Chot text CTA: "Xem nhanh", "Xem chi tiet", "Chon linh kien".
- [ ] Chot mau badge theo muc do: info/warning/error.
- [ ] Chot skeleton/loading states cho quick view va selected card.

### 7.5 Chot test plan
- [ ] Test luong chon lien tuc nhieu linh kien (debounce summary van on dinh).
- [ ] Test cache quick view (mo lai khong goi API lai ngay lap tuc).
- [ ] Test missing data (khong anh, khong specs).
- [ ] Test responsive: desktop, tablet, mobile.
- [ ] Test accessibility co ban: focus, keyboard, aria-label.

## 8) TODO trien khai (Implementation checklist)

### Phase 1 - Refactor nho de de mo rong
- [ ] Tach bang option thanh component rieng.
- [ ] Tach khu slot da chon thanh component rieng.
- [ ] Them utility format specs theo slot.

### Phase 2 - Quick View
- [ ] Tao UI quick view (desktop + mobile).
- [ ] Noi API product detail theo productId.
- [ ] Them cache detail.
- [ ] Them CTA Chon/Xem chi tiet trong quick view.

### Phase 3 - Selected Card
- [ ] Render card da chon voi hinh + gia + specs rut gon.
- [ ] Dong bo card voi selection/sumary hien tai.
- [ ] Them action Doi/Bo chon/Xem chi tiet.

### Phase 4 - Compatibility Badge
- [ ] Them badge tren option row.
- [ ] Hien thi ly do loc dang gon de user hieu.
- [ ] Dong bo mau sac voi severity trong summary.

### Phase 5 - Hoan thien
- [ ] Polish loading/empty/error state.
- [ ] Toi uu hieu nang render (memo, stable keys).
- [ ] Bo sung test manual checklist.

## 9) Tieu chi hoan thanh (Definition of Done)
- User co the xem thong tin chinh cua linh kien truoc khi chon ma khong can roi trang builder.
- Linh kien da chon duoc hien thi dang card ro rang, khong con chi la ten.
- User hieu duoc trang thai tuong thich ngay tai danh sach option.
- Khong lam vo logic hien tai:
  - filter phu thuoc
  - summary realtime
  - warning/blocking checkout
- UI on dinh tren desktop va mobile.

## 10) Rui ro va cach giam
- Rui ro: Product detail endpoint khong dong deu data giua cac danh muc.
  - Giam: fallback UI + map spec theo uu tien.
- Rui ro: qua nhieu call khi user click lien tuc.
  - Giam: cache + chi fetch khi mo quick view.
- Rui ro: component monolith kho bao tri.
  - Giam: tach component theo phase nhu checklist tren.

## 11) De xuat thu tu thuc hien
1. Chot scope + danh sach specs.
2. Lam Quick View truoc (tac dong UX lon nhat).
3. Lam Selected Card.
4. Them badge tuong thich.
5. Polish + test.
