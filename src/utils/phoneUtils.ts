/**
 * Tiện ích validate và định dạng số điện thoại Việt Nam.
 *
 * ─── Đầu số hợp lệ (3 chữ số sau 0) ────────────────────────────────────────
 *  Viettel      : 032 033 034 035 036 037 038 039 | 086 | 096 097 098
 *  Mobifone     : 070 | 076 077 078 079 | 089 | 090 | 093
 *  Vinaphone    : 081 082 083 084 085 | 088 | 091 | 094
 *  Vietnamobile : 052 | 056 | 058 | 092
 *  Reddi        : 055
 *  Gmobile      : 059 | 099
 * ────────────────────────────────────────────────────────────────────────────
 * Định dạng chấp nhận: 0XXXXXXXXX | +84XXXXXXXXX | 84XXXXXXXXX
 */

/** Regex chuẩn (áp dụng sau khi đã bỏ khoảng trắng/gạch ngang) */
export const VN_PHONE_REGEX =
  /^(\+84|84|0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;

/**
 * Danh sách đầu số (tiền tố 3 chữ số) hợp lệ, nhóm theo nhà mạng.
 */
export const VN_PHONE_PREFIXES: Record<string, string[]> = {
  Viettel:       ['032','033','034','035','036','037','038','039','086','096','097','098'],
  Mobifone:      ['070','076','077','078','079','089','090','093'],
  Vinaphone:     ['081','082','083','084','085','088','091','094'],
  Vietnamobile:  ['052','056','058','092'],
  Reddi:         ['055'],
  Gmobile:       ['059','099'],
};

/**
 * Chuẩn hóa số điện thoại: xóa khoảng trắng/gạch, chuyển +84/84 → 0.
 */
export function normalizePhone(phone: string): string {
  const stripped = phone.replace(/[\s\-]/g, '');
  if (stripped.startsWith('+84')) return '0' + stripped.slice(3);
  if (stripped.startsWith('84') && stripped.length === 11) return '0' + stripped.slice(2);
  return stripped;
}

/**
 * Kiểm tra số điện thoại có hợp lệ ở Việt Nam không.
 * @returns chuỗi lỗi (hiển thị cho user), hoặc null nếu hợp lệ.
 */
export function validateVietnamesePhone(phone: string | undefined | null): string | null {
  if (!phone || phone.trim() === '') return 'Số điện thoại không được để trống';
  const stripped = phone.replace(/[\s\-]/g, '');
  if (!VN_PHONE_REGEX.test(stripped)) {
    return 'Số điện thoại Việt Nam không hợp lệ (VD: 0912 345 678 hoặc +84912345678)';
  }
  return null;
}

/**
 * Định dạng hiển thị: 0912345678 → 0912 345 678
 */
export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}
