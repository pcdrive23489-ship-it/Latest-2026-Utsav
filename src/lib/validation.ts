const MAX_DONATION_PROOF_SIZE = 5 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';

  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Cannot reach the server. Check the Supabase project URL, internet connection, and whether the Supabase project is active.';
  }

  return message || fallback;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateLoginInput(email: string, password: string) {
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  return null;
}

export function validateSignupInput(firstName: string, lastName: string, email: string, password: string) {
  if (!firstName.trim()) return 'Enter your first name.';
  if (!lastName.trim()) return 'Enter your last name.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export function validateDonationProof(file: File | null) {
  if (!file) return 'Upload a payment screenshot.';
  if (!file.type.startsWith('image/')) return 'Payment proof must be an image file.';
  if (file.size > MAX_DONATION_PROOF_SIZE) return 'Payment proof must be 5 MB or smaller.';
  return null;
}

export function validateDonationInput(donorName: string, amount: string, proofFile: File | null) {
  if (!donorName.trim()) return 'Enter your full name.';
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'Enter a valid donation amount.';
  return validateDonationProof(proofFile);
}

export function validateUploadFile(file: File, allowedTypes?: string[]) {
  if (allowedTypes?.length && !allowedTypes.some((type) => file.type.startsWith(type))) {
    return `Unsupported file type: ${file.type || 'unknown'}.`;
  }
  if (file.size > MAX_UPLOAD_SIZE) return 'File must be 25 MB or smaller.';
  return null;
}
