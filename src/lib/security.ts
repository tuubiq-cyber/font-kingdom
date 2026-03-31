/**
 * security.ts — نظام حماية متكامل لمملكة الخطوط
 */

// ===== 1. Rate Limiter (منع Brute Force) =====
class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.firstAttempt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (record.count >= this.maxAttempts) return false;

    record.count++;
    return true;
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    const elapsed = Date.now() - record.firstAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

// ===== 2. التحقق من قوة كلمة المرور =====
export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('8 أحرف على الأقل');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('حرف كبير واحد على الأقل');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('حرف صغير واحد على الأقل');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('رقم واحد على الأقل');
  } else {
    score++;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('رمز خاص واحد على الأقل');
  } else {
    score++;
  }

  const strength: PasswordValidation['strength'] = 
    score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

  return { valid: errors.length === 0, errors, strength };
};

// ===== 3. إدارة الجلسة الآمنة =====
export const secureSession = {
  set: (key: string, value: unknown, ttlMinutes = 30): void => {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now(),
        expires: Date.now() + ttlMinutes * 60 * 1000,
      }));
    } catch {
      // Storage full or unavailable
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expires) {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed.value as T;
    } catch {
      return null;
    }
  },

  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },

  clear: (): void => {
    sessionStorage.clear();
  },
};

// ===== 4. CSRF Token =====
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

// ===== 5. Validation Helpers =====
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase().slice(0, 255);
};
