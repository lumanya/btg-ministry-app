/**
 * Form checks and plain-language messages for sign-in, shared by the auth screens.
 */

export const MIN_PASSWORD = 8;

export function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}

export function checkEmail(email: string): string | null {
  const e = cleanEmail(email);
  if (!e) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Check your email address; it doesn’t look complete.';
  return null;
}

export function checkPassword(password: string): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  return null;
}

export function checkName(name: string): string | null {
  if (!name.trim()) return 'Enter your name.';
  if (name.trim().length > 80) return 'Use a shorter name (80 characters or fewer).';
  return null;
}

export function checkCode(code: string): string | null {
  const c = code.replace(/\s/g, '');
  if (!c) return 'Enter the code from the email.';
  if (!/^\d{6,10}$/.test(c)) return 'The code is the numbers in the email we sent you.';
  return null;
}

/** Turns a Supabase auth error into a sentence a member can act on. */
export function friendlyAuthError(error: unknown): string {
  const e = (error ?? {}) as { message?: string; code?: string; status?: number; name?: string };
  const code = e.code ?? '';
  const msg = (e.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'That email and password don’t match. Check them and try again.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Confirm your email first: enter the code we sent you.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (code === 'weak_password' || msg.includes('password should')) {
    return `Choose a stronger password: at least ${MIN_PASSWORD} characters, mixing letters and numbers.`;
  }
  if (code === 'otp_expired' || msg.includes('expired') || msg.includes('invalid otp') || msg.includes('token has expired')) {
    return 'That code has expired or isn’t right. Ask for a new code and try again.';
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || e.status === 429) {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  if (code === 'same_password') {
    return 'Choose a password different from your old one.';
  }
  if (e.name === 'AuthRetryableFetchError' || msg.includes('network request failed') || msg.includes('failed to fetch')) {
    return 'We couldn’t reach the server. Check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
