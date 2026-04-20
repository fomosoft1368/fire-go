/**
 * Image slug utility — tạo URL ảnh dạng /img/tieu-de-bai-bao-abc1234.jpg
 *
 * Format: /img/{slug-tiêu-đề}-{hash7}.{ext}
 *   - slug-tiêu-đề: tối đa 35 ký tự từ tiêu đề bài viết hoặc tên file ảnh
 *   - hash7: 7 ký tự alphanumeric (FNV hash của URL gốc), dùng để lookup
 *   - ext: jpg | png | webp | gif
 *
 * Để resolve ngược: tách hash7 (segment cuối trước extension) → lookup IMG_CACHE
 */

// Vietnamese character map
const VI_MAP: Record<string, string> = {
  à:'a',á:'a',ả:'a',ã:'a',ạ:'a',
  ă:'a',ắ:'a',ặ:'a',ằ:'a',ẳ:'a',ẵ:'a',
  â:'a',ấ:'a',ầ:'a',ẩ:'a',ẫ:'a',ậ:'a',
  è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',
  ê:'e',ế:'e',ề:'e',ể:'e',ễ:'e',ệ:'e',
  ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
  ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',
  ô:'o',ố:'o',ồ:'o',ổ:'o',ỗ:'o',ộ:'o',
  ơ:'o',ớ:'o',ờ:'o',ở:'o',ỡ:'o',ợ:'o',
  ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',
  ư:'u',ứ:'u',ừ:'u',ử:'u',ữ:'u',ự:'u',
  ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',
  đ:'d',
}

function viSlug(str: string, maxLen = 35): string {
  return str
    .toLowerCase()
    .replace(/[àáảãạăắặằẳẵâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/g,
      c => VI_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '')
}

function extractExt(url: string): string {
  const m = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)
  if (!m) return '.jpg'
  return '.' + m[1].toLowerCase().replace('jpeg', 'jpg')
}

function extractFilenameSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const filename = pathname.split('/').pop() ?? ''
    const base = filename.replace(/\.[^.]+$/, '').replace(/[\-_]/g, ' ')
    const slug = viSlug(base, 30)
    return slug || 'anh'
  } catch {
    return 'anh'
  }
}

function fnvHash(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (Math.imul(h, 0x01000193)) >>> 0
  }
  return h.toString(36).padStart(7, '0').slice(-7)
}

// ── Global singleton Map: hash7 → originalUrl ──
// Survives hot-reload (tương tự mongooseCache pattern)
declare global {
  // eslint-disable-next-line no-var
  var _imgCache: Map<string, string> | undefined
}
export const IMG_CACHE: Map<string, string> =
  global._imgCache ?? (global._imgCache = new Map())

/**
 * Tạo URL ảnh SEO-friendly dạng /img/tieu-de-abc1234.jpg
 *
 * @param url - URL ảnh gốc (external)
 * @param title - Tiêu đề bài viết (dùng làm tên file, optional)
 * @returns /img/slug.jpg hoặc null nếu URL không hợp lệ
 */
export function toImgUrl(url: string | null | undefined, title?: string): string | null {
  if (!url) return null

  // Normalize
  let clean = url.startsWith('//') ? `https:${url}` : url
  if (!clean.startsWith('http')) return null

  // Decode HTML entities từ RSS parser
  clean = clean
    .replace(/&amp;/g, '&').replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')

  const hash = fnvHash(clean)
  const ext  = extractExt(clean)
  const namePart = title ? viSlug(title, 35) : extractFilenameSlug(clean)

  // Register in global cache
  IMG_CACHE.set(hash, clean)

  const slug = `${namePart || 'anh'}-${hash}${ext}`
  return `/img/${slug}`
}

/** Lookup: hash7 → originalUrl */
export function lookupHash(hash: string): string | undefined {
  return IMG_CACHE.get(hash)
}

// Kept for backwards compatibility with any code that still uses imgEncode
export const imgEncode = toImgUrl
export const imgHash = fnvHash
