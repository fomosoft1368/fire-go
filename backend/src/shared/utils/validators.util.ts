// Shared utility functions

/**
 * Validate phone number (Vietnam format)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+84|84|0)[1-9]\d{8,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate vehicle plate (Vietnam format)
 */
export function validateVehiclePlate(plate: string): boolean {
  // Format: 29-A12345 or 29-AT12345
  const plateRegex = /^[A-Za-z0-9]{2,3}-[A-Za-z]{1,2}\d{4,5}$/;
  return plateRegex.test(plate);
}

/**
 * Validate license number
 */
export function validateLicenseNumber(license: string): boolean {
  // Should be 8-15 characters
  return license.length >= 8 && license.length <= 15;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Calculate distance between two coordinates (meters)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+84 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Get time difference in human readable format
 */
export function getTimeDifference(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Round to N decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  return (
    obj === null ||
    obj === undefined ||
    Object.keys(obj).length === 0
  );
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
