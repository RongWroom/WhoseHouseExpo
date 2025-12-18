import { Anonymizer, DataRetention, ConsentManager } from '../../src/utils/privacy';

describe('privacy utilities', () => {
  describe('Anonymizer', () => {
    describe('nameToInitials', () => {
      it('should convert full name to initials', () => {
        expect(Anonymizer.nameToInitials('John Doe')).toBe('J.D.');
      });

      it('should handle single name', () => {
        expect(Anonymizer.nameToInitials('John')).toBe('J.');
      });

      it('should handle multiple names', () => {
        expect(Anonymizer.nameToInitials('John Michael Doe')).toBe('J.M.D.');
      });

      it('should handle empty input', () => {
        expect(Anonymizer.nameToInitials('')).toBe('U.N.');
        expect(Anonymizer.nameToInitials(null as any)).toBe('U.N.');
      });

      it('should handle lowercase names', () => {
        expect(Anonymizer.nameToInitials('john doe')).toBe('J.D.');
      });
    });

    describe('maskEmail', () => {
      it('should mask email address', () => {
        const result = Anonymizer.maskEmail('user@example.com');
        expect(result).toContain('@example.com');
        expect(result).toContain('***');
      });

      it('should handle short local part', () => {
        const result = Anonymizer.maskEmail('a@example.com');
        expect(result).toBe('a***@example.com');
      });

      it('should handle empty input', () => {
        expect(Anonymizer.maskEmail('')).toBe('***@***.***');
      });
    });

    describe('maskPhone', () => {
      it('should mask phone number', () => {
        const result = Anonymizer.maskPhone('07123456789');
        expect(result).toContain('***');
        expect(result).toContain('789');
      });

      it('should handle short numbers', () => {
        const result = Anonymizer.maskPhone('1234');
        expect(result).toBe('***');
      });
    });

    describe('sanitizeText', () => {
      it('should remove email addresses', () => {
        const text = 'Contact me at user@example.com for more info';
        const result = Anonymizer.sanitizeText(text);
        expect(result).not.toContain('user@example.com');
        expect(result).toContain('[EMAIL_REMOVED]');
      });

      it('should remove phone numbers', () => {
        const text = 'Call me at 07123456789';
        const result = Anonymizer.sanitizeText(text);
        expect(result).not.toContain('07123456789');
        expect(result).toContain('[PHONE_REMOVED]');
      });

      it('should handle text without PII', () => {
        const text = 'Hello, how are you?';
        const result = Anonymizer.sanitizeText(text);
        expect(result).toBe(text);
      });
    });

    describe('childDisplayName', () => {
      it('should generate initials from first and last name', () => {
        const result = Anonymizer.childDisplayName('John', 'Doe');
        expect(result).toBe('J.D.');
      });

      it('should handle missing names', () => {
        const result = Anonymizer.childDisplayName('', '');
        expect(result).toBe('X.X.');
      });
    });
  });

  describe('DataRetention', () => {
    describe('getRetentionPeriod', () => {
      it('should return correct retention period for messages', () => {
        const period = DataRetention.getRetentionPeriod('message');
        expect(period).toBe(365);
      });

      it('should return correct retention period for audit logs', () => {
        const period = DataRetention.getRetentionPeriod('audit');
        expect(period).toBe(2555); // 7 years
      });

      it('should return correct retention period for media', () => {
        const period = DataRetention.getRetentionPeriod('media');
        expect(period).toBe(180); // 6 months
      });

      it('should return correct retention period for cases', () => {
        const period = DataRetention.getRetentionPeriod('case');
        expect(period).toBe(1825); // 5 years
      });
    });

    describe('calculateExpiryDate', () => {
      it('should calculate expiry date in the future', () => {
        const expiry = DataRetention.calculateExpiryDate('message');
        const now = new Date();
        expect(expiry.getTime()).toBeGreaterThan(now.getTime());
      });

      it('should calculate correct expiry for audit data', () => {
        const expiry = DataRetention.calculateExpiryDate('audit');
        const now = new Date();
        const expectedDays = 2555;
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(expectedDays);
      });
    });

    describe('shouldRetain', () => {
      it('should return true for recent data', () => {
        const recentDate = new Date();
        expect(DataRetention.shouldRetain(recentDate, 365)).toBe(true);
      });

      it('should return false for old data', () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2);
        expect(DataRetention.shouldRetain(oldDate, 365)).toBe(false);
      });
    });
  });

  describe('ConsentManager', () => {
    describe('createConsentRecord', () => {
      it('should create valid consent record', () => {
        const record = ConsentManager.createConsentRecord('user-123', 'data_processing', true);
        expect(record.user_id).toBe('user-123');
        expect(record.consent_type).toBe('data_processing');
        expect(record.granted).toBe(true);
        expect(record.version).toBe('1.0');
        expect(typeof record.timestamp).toBe('string');
      });

      it('should include IP address when provided', () => {
        const record = ConsentManager.createConsentRecord(
          'user-123',
          'data_processing',
          true,
          '192.168.1.1',
        );
        expect(record.ip_address).toBe('192.168.1.1');
      });
    });

    describe('hasConsent', () => {
      it('should return true when consent is granted', () => {
        const consents = { data_processing: true, communication: false };
        expect(ConsentManager.hasConsent(consents, 'data_processing')).toBe(true);
      });

      it('should return false when consent is not granted', () => {
        const consents = { data_processing: true, communication: false };
        expect(ConsentManager.hasConsent(consents, 'communication')).toBe(false);
      });

      it('should return false for missing consent type', () => {
        const consents = { data_processing: true };
        expect(ConsentManager.hasConsent(consents, 'analytics')).toBe(false);
      });
    });

    describe('consentTypes', () => {
      it('should have standard consent types defined', () => {
        expect(ConsentManager.consentTypes.DATA_PROCESSING).toBe('data_processing');
        expect(ConsentManager.consentTypes.COMMUNICATION).toBe('communication');
        expect(ConsentManager.consentTypes.MEDIA_SHARING).toBe('media_sharing');
        expect(ConsentManager.consentTypes.ANALYTICS).toBe('analytics');
      });
    });
  });
});
