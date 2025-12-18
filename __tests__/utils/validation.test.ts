import {
  sanitizeInput,
  validateToken,
  validateMessage,
  validatePassword,
  validateEmail,
  escapeHtml,
} from '../../src/utils/validation';

describe('validation utilities', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeInput(input);
      expect(result).toBe('hello world');
    });

    it('should truncate to max length', () => {
      const input = 'a'.repeat(100);
      const result = sanitizeInput(input, 50);
      expect(result.length).toBe(50);
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should remove script tags and event handlers', () => {
      const input = '<div onclick="evil()">Click me</div>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('evil');
    });
  });

  describe('validateToken', () => {
    it('should validate correct UUID format', () => {
      const validToken = '550e8400-e29b-41d4-a716-446655440000';
      const result = validateToken(validToken);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token format', () => {
      const invalidToken = 'not-a-valid-token';
      const result = validateToken(invalidToken);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty token', () => {
      const result = validateToken('');
      expect(result.isValid).toBe(false);
    });

    it('should reject token with special characters', () => {
      const result = validateToken('<script>alert(1)</script>');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateMessage', () => {
    it('should accept valid message', () => {
      const result = validateMessage('Hello, how are you?');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty message', () => {
      const result = validateMessage('');
      expect(result.isValid).toBe(false);
    });

    it('should reject message exceeding max length', () => {
      const longMessage = 'a'.repeat(10001);
      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
    });

    it('should accept message at max length', () => {
      const maxMessage = 'a'.repeat(5000);
      const result = validateMessage(maxMessage);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
    });

    it('should reject short password', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('8'))).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumbers!!');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      const result = validateEmail('user@example.com');
      expect(result).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateEmail('not-an-email');
      expect(result).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      const result = escapeHtml('Tom & Jerry');
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});
