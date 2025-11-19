/**
 * Normalizes phone numbers to international format
 * Handles various input formats and cleans them for tel: links
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except + at the start
  let cleaned = phone.trim();
  
  // Extract leading + if present
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  
  // If no digits found, return empty
  if (!cleaned) return '';
  
  // Add + prefix for international format if it had one or if it looks like an international number
  if (hasPlus || cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  // Return as-is for local numbers
  return cleaned;
}

/**
 * Formats phone number for display while keeping it clickable
 * Returns the normalized format suitable for tel: links
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return '';
  
  // Keep normalized format for tel: links - browsers handle display formatting
  return normalized;
}

/**
 * Validates if a phone number looks reasonable (basic check)
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneNumber(phone);
  // Basic validation: should have at least 7 digits
  return normalized.replace(/\D/g, '').length >= 7;
}
