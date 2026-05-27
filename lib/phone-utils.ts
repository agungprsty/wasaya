const PHONE_REGEX = /^\+?\d{7,15}$/;

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export function validatePhone(number: string): PhoneValidationResult {
  const cleaned = number.replace(/[\s\-\(\)]/g, "");

  if (!cleaned) {
    return { valid: false, normalized: cleaned, error: "Phone number is required" };
  }

  if (!PHONE_REGEX.test(cleaned)) {
    if (!/^\+?\d+$/.test(cleaned)) {
      return { valid: false, normalized: cleaned, error: "Phone number must contain only digits and optional + prefix" };
    }
    if (cleaned.length < 7) {
      return { valid: false, normalized: cleaned, error: "Phone number is too short (min 7 digits)" };
    }
    if (cleaned.length > 15) {
      return { valid: false, normalized: cleaned, error: "Phone number is too long (max 15 digits)" };
    }
    return { valid: false, normalized: cleaned, error: "Invalid phone number format" };
  }

  if (!cleaned.startsWith("+")) {
    return { valid: true, normalized: `+${cleaned}` };
  }

  return { valid: true, normalized: cleaned };
}
