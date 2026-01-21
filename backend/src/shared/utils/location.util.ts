/**
 * Location Utility - Extract province, district, ward from address strings
 * Vietnamese location hierarchy: Province/City > District > Ward
 */

// Normalize string - remove diacritics and convert to lowercase
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

// Vietnam province/city list (with normalized alternatives)
const PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Dương', 'Bình Phước', 'Bình Thuận',
  'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam',
  'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
  'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình',
  'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên - Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long',
  'Vĩnh Phúc', 'Yên Bái'
];

interface LocationParts {
  province?: string;
  district?: string;
  ward?: string;
}

/**
 * Extract province, district, ward from address string
 * Vietnamese addresses can be formatted in various ways:
 * - "Phường Ba Đình, Quận Ba Đình, Hà Nội"
 * - "34 Nguyễn Sỹ Sách, Phường Vinh Tân, Huyện Vinh, Nghệ An"
 * - "Ba Đình, Ba Đình, Hà Nội"
 * - "Vinh Tân, Vinh, Nghe An"
 */
export function extractLocationHierarchy(address: string): LocationParts {
  if (!address || address.trim().length === 0) {
    return {};
  }

  const parts = address.split(',').map((p) => p.trim()).filter(p => p.length > 0);
  const result: LocationParts = {};

  if (parts.length === 0) return {};

  const normalizedAddress = normalize(address);
  
  // 1. Find province (usually the last meaningful part)
  let provinceIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const normalized = normalize(part);
    
    // Check if this part matches a province
    const matchedProvince = PROVINCES.find(p => {
      const normProvincePattern = normalize(p);
      return normalized.includes(normProvincePattern) || normalized === normProvincePattern;
    });

    if (matchedProvince) {
      result.province = matchedProvince;
      provinceIndex = i;
      break;
    }
  }

  // 2. Find district (between province and ward, or before province)
  if (provinceIndex > 0) {
    for (let i = provinceIndex - 1; i >= 0; i--) {
      const part = parts[i];
      const normalized = normalize(part);
      
      // Look for district/city keywords
      if (
        normalized.includes('quan') ||     // Quận
        normalized.includes('huyen') ||    // Huyện
        normalized.includes('thi xa') ||   // Thị xã
        normalized.includes('thanh pho')   // Thành phố
      ) {
        // Extract just the name part
        const cleanName = part
          .replace(/^(Quận|Huyện|Thị xã|Thành phố|TP\.?)\s+/i, '')
          .trim();
        if (cleanName.length > 0) {
          result.district = cleanName;
        }
        break;
      }
    }

    // If no district keyword found, use the part right before province
    if (!result.district && provinceIndex > 0) {
      const part = parts[provinceIndex - 1];
      const normalized = normalize(part);
      // Only use if it's not just a street address
      if (part.length < 30 && !normalized.includes('so ') && !normalized.includes('đường')) {
        result.district = part;
      }
    }
  }

  // 3. Find ward (usually marked with Phường/Xã/Thị trấn keyword or first part)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const normalized = normalize(part);
    
    if (
      normalized.includes('phuong') ||     // Phường
      normalized.includes('xa') ||         // Xã  
      normalized.includes('thi tran')      // Thị trấn
    ) {
      const cleanName = part
        .replace(/^(Phường|Xã|Thị trấn)\s+/i, '')
        .trim();
      if (cleanName.length > 0) {
        result.ward = cleanName;
      }
      break;
    }
  }

  return result;
}

/**
 * Check if two addresses match at a specific location level
 * Levels: 'province' > 'district' > 'ward'
 */
export function matchesAtLevel(
  address1: string,
  address2: string,
  level: 'province' | 'district' | 'ward'
): boolean {
  const loc1 = extractLocationHierarchy(address1);
  const loc2 = extractLocationHierarchy(address2);

  if (level === 'province') {
    return (
      loc1.province === loc2.province &&
      !!loc1.province &&
      !!loc2.province
    );
  } else if (level === 'district') {
    return (
      loc1.province === loc2.province &&
      loc1.district === loc2.district &&
      !!loc1.province &&
      !!loc1.district &&
      !!loc2.province &&
      !!loc2.district
    );
  } else if (level === 'ward') {
    return (
      loc1.province === loc2.province &&
      loc1.district === loc2.district &&
      loc1.ward === loc2.ward &&
      !!loc1.province &&
      !!loc1.district &&
      !!loc1.ward &&
      !!loc2.province &&
      !!loc2.district &&
      !!loc2.ward
    );
  }

  return false;
}
