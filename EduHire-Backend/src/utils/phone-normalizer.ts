/**
 * Phone Number Normalization Utility
 * Phase 4: Duplicate Prevention
 *
 * Converts various phone number formats to E.164 standard format
 * for consistent duplicate detection and storage.
 *
 * Examples:
 * - "9876543210" → "+919876543210"
 * - "98765 43210" → "+919876543210"
 * - "+91-9876543210" → "+919876543210"
 * - "+919876543210" → "+919876543210"
 * - "09876543210" → "+919876543210"
 */

/**
 * Normalize a phone number to E.164 format
 *
 * @param mobile - The phone number to normalize (can be in any format)
 * @param countryCode - The country code to use (default: +91 for India)
 * @returns Normalized phone number in E.164 format (+919876543210)
 */
export function normalizePhoneNumber(
  mobile: string,
  countryCode: string = '+91',
): string {
  if (!mobile) return '';

  // Remove all non-digit characters (spaces, dashes, parentheses, etc.)
  let cleaned = mobile.replace(/\D/g, '');

  // Remove leading zero if present (09876543210 → 9876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // If starts with country code digits (91 for India), remove them
  // 919876543210 → 9876543210
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  // If 10 digits (standard Indian mobile), add country code
  if (cleaned.length === 10) {
    return `${countryCode}${cleaned}`;
  }

  // If already 12 digits (with country code digits), add + prefix
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  // If number doesn't match expected patterns, return original
  // This handles edge cases gracefully
  return mobile.trim();
}

/**
 * Validate if a phone number is in valid E.164 format
 *
 * @param mobile - The phone number to validate
 * @returns true if valid E.164 format, false otherwise
 */
export function isValidE164(mobile: string): boolean {
  if (!mobile) return false;

  // E.164 format: + followed by country code and number (max 15 digits total)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(mobile);
}

/**
 * Extract country code from E.164 formatted number
 *
 * @param mobile - E.164 formatted phone number
 * @returns Country code (e.g., "+91") or null if invalid
 */
export function extractCountryCode(mobile: string): string | null {
  if (!isValidE164(mobile)) return null;

  // For India (+91), return +91
  if (mobile.startsWith('+91')) return '+91';

  // For other countries, extract first 2-3 digits after +
  const match = mobile.match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : null;
}

/**
 * Format phone number for display (Indian format)
 *
 * @param mobile - E.164 formatted phone number
 * @returns Formatted number (e.g., "+91 98765 43210")
 */
export function formatPhoneForDisplay(mobile: string): string {
  if (!mobile) return '';

  // If already normalized to E.164
  if (mobile.startsWith('+91') && mobile.length === 13) {
    // +919876543210 → +91 98765 43210
    return `${mobile.substring(0, 3)} ${mobile.substring(3, 8)} ${mobile.substring(8)}`;
  }

  // Return as-is if not in expected format
  return mobile;
}
