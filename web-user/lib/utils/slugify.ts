/**
 * Vietnamese-aware slugify.
 * Converts "Giao thông Hà Nội kẹt xe" → "giao-thong-ha-noi-ket-xe"
 */

const VIET_MAP: Record<string, string> = {
  à:'a',á:'a',ả:'a',ã:'a',ạ:'a',
  ă:'a',ắ:'a',ặ:'a',ằ:'a',ẳ:'a',ẵ:'a',
  â:'a',ấ:'a',ầ:'a',ẩ:'a',ẫ:'a',ậ:'a',
  è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',
  ê:'e',ề:'e',ế:'e',ể:'e',ễ:'e',ệ:'e',
  ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
  ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',
  ô:'o',ố:'o',ồ:'o',ổ:'o',ỗ:'o',ộ:'o',
  ơ:'o',ớ:'o',ờ:'o',ở:'o',ỡ:'o',ợ:'o',
  ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',
  ư:'u',ứ:'u',ừ:'u',ử:'u',ữ:'u',ự:'u',
  ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',
  đ:'d',
  // Uppercase variants
  À:'a',Á:'a',Ả:'a',Ã:'a',Ạ:'a',
  Ă:'a',Ắ:'a',Ặ:'a',Ằ:'a',Ẳ:'a',Ẵ:'a',
  Â:'a',Ấ:'a',Ầ:'a',Ẩ:'a',Ẫ:'a',Ậ:'a',
  È:'e',É:'e',Ẻ:'e',Ẽ:'e',Ẹ:'e',
  Ê:'e',Ề:'e',Ế:'e',Ể:'e',Ễ:'e',Ệ:'e',
  Ì:'i',Í:'i',Ỉ:'i',Ĩ:'i',Ị:'i',
  Ò:'o',Ó:'o',Ỏ:'o',Õ:'o',Ọ:'o',
  Ô:'o',Ố:'o',Ồ:'o',Ổ:'o',Ỗ:'o',Ộ:'o',
  Ơ:'o',Ớ:'o',Ờ:'o',Ở:'o',Ỡ:'o',Ợ:'o',
  Ù:'u',Ú:'u',Ủ:'u',Ũ:'u',Ụ:'u',
  Ư:'u',Ứ:'u',Ừ:'u',Ử:'u',Ữ:'u',Ự:'u',
  Ỳ:'y',Ý:'y',Ỷ:'y',Ỹ:'y',Ỵ:'y',
  Đ:'d',
}

export function slugify(text: string): string {
  return text
    .split('')
    .map(c => VIET_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/** Short 6-char hash of a string for uniqueness suffix */
export function shortHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).slice(0, 6)
}

export function titleToSlug(title: string, url: string): string {
  return `${slugify(title)}-${shortHash(url)}`
}
