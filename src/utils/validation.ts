/**
 * Input validation utilities
 * Provides sanitization and validation for user inputs
 */

import { VALIDATION_RULES } from '../config/constants';

/**
 * Sanitizes a string input by removing dangerous characters
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength: number = 5000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove script blocks entirely (tag + contents)
  let sanitized = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove any remaining HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates a message content
 * @param message - The message to validate
 * @returns Validation result with error message if invalid
 */
export function validateMessage(message: string): {
  isValid: boolean;
  error?: string;
} {
  const sanitized = sanitizeInput(message, VALIDATION_RULES.message.maxLength);

  // If sanitization had to truncate, treat as invalid rather than silently truncating
  if (typeof message === 'string' && message.trim().length > VALIDATION_RULES.message.maxLength) {
    return {
      isValid: false,
      error: `Message must be less than ${VALIDATION_RULES.message.maxLength} characters`,
    };
  }

  if (sanitized.length < VALIDATION_RULES.message.minLength) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (sanitized.length > VALIDATION_RULES.message.maxLength) {
    return {
      isValid: false,
      error: `Message must be less than ${VALIDATION_RULES.message.maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validates an access token format
 * @param token - The token to validate
 * @returns Validation result with error message if invalid
 */
export function validateToken(token: string): {
  isValid: boolean;
  error?: string;
} {
  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      error: 'Invalid token format',
    };
  }

  const trimmed = token.trim();

  if (trimmed.length < VALIDATION_RULES.token.minLength) {
    return {
      isValid: false,
      error: 'Token is too short',
    };
  }

  if (trimmed.length > VALIDATION_RULES.token.maxLength) {
    return {
      isValid: false,
      error: 'Token is too long',
    };
  }

  if (!VALIDATION_RULES.token.pattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Token contains invalid characters',
    };
  }

  return { isValid: true };
}

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns True if valid email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a password strength
 * @param password - The password to validate
 * @returns Validation result with specific requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Escapes special characters for safe display in HTML/JSX
 * @param text - The text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}
