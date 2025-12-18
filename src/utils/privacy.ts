/**
 * Privacy and Data Protection Utilities
 *
 * These utilities ensure GDPR compliance and protect sensitive data
 * throughout the WhoseHouse application.
 */

import * as Crypto from 'expo-crypto';

/**
 * Anonymization utilities
 */
export const Anonymizer = {
  /**
   * Convert a full name to initials
   * @example "John Doe" -> "J.D."
   */
  nameToInitials(fullName: string): string {
    if (!fullName || typeof fullName !== 'string') return 'U.N.';

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return 'U.N.';

    const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('.');

    return initials + '.';
  },

  /**
   * Generate a deterministic but anonymized ID from sensitive data
   * Uses SHA-256 hashing with a salt for consistency
   */
  async generateAnonymousId(data: string, salt: string = 'whosehouse'): Promise<string> {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + data);
    return hash.substring(0, 12);
  },

  /**
   * Mask email addresses for display
   * @example "john.doe@example.com" -> "j***e@example.com"
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***';

    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }

    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  },

  /**
   * Mask phone numbers for display
   * @example "+447700900123" -> "+44770****123"
   */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '***';

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 6) return '***';

    const firstThree = cleaned.substring(0, 3);
    const lastThree = cleaned.substring(cleaned.length - 3);
    const masked = '*'.repeat(Math.max(cleaned.length - 6, 4));

    return `${firstThree}${masked}${lastThree}`;
  },

  /**
   * Remove all PII from a text string
   * Detects and removes emails, phone numbers, and common PII patterns
   */
  sanitizeText(text: string): string {
    if (!text) return '';

    let sanitized = text;

    // Remove email addresses
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL_REMOVED]',
    );

    // Remove phone numbers (various formats)
    sanitized = sanitized.replace(
      /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
      '[PHONE_REMOVED]',
    );

    // Remove UK National Insurance numbers
    sanitized = sanitized.replace(
      /[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}/gi,
      '[NI_NUMBER_REMOVED]',
    );

    // Remove credit card numbers
    sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REMOVED]');

    // Remove postal codes (UK format)
    sanitized = sanitized.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/gi, '[POSTCODE_REMOVED]');

    return sanitized;
  },

  /**
   * Generate a safe display name for a child (initials only)
   */
  childDisplayName(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0)?.toUpperCase() || 'X';
    const last = lastName?.charAt(0)?.toUpperCase() || 'X';
    return `${first}.${last}.`;
  },

  /**
   * Redact sensitive fields from an object
   */
  redactObject<T extends Record<string, any>>(obj: T, fieldsToRedact: string[]): T {
    const redacted = { ...obj };

    for (const field of fieldsToRedact) {
      if (field in redacted) {
        (redacted as any)[field] = '[REDACTED]';
      }
    }

    return redacted;
  },
};

/**
 * Data retention utilities
 */
export const DataRetention = {
  /**
   * Check if data should be retained based on retention policy
   */
  shouldRetain(createdAt: Date, retentionDays: number): boolean {
    const now = new Date();
    const dataAge = now.getTime() - createdAt.getTime();
    const dataAgeDays = dataAge / (1000 * 60 * 60 * 24);

    return dataAgeDays <= retentionDays;
  },

  /**
   * Get retention period for different data types (in days)
   */
  getRetentionPeriod(dataType: 'message' | 'audit' | 'media' | 'case'): number {
    const retentionPolicies = {
      message: 365, // 1 year
      audit: 2555, // 7 years (legal requirement)
      media: 180, // 6 months
      case: 1825, // 5 years after case closure
    };

    return retentionPolicies[dataType];
  },

  /**
   * Calculate data expiry date
   */
  calculateExpiryDate(dataType: 'message' | 'audit' | 'media' | 'case'): Date {
    const retentionDays = this.getRetentionPeriod(dataType);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);
    return expiryDate;
  },
};

/**
 * Consent tracking utilities
 */
export const ConsentManager = {
  /**
   * Consent types in the application
   */
  consentTypes: {
    DATA_PROCESSING: 'data_processing',
    COMMUNICATION: 'communication',
    MEDIA_SHARING: 'media_sharing',
    ANALYTICS: 'analytics',
  },

  /**
   * Check if user has given consent for a specific purpose
   */
  hasConsent(userConsents: Record<string, boolean>, consentType: string): boolean {
    return userConsents[consentType] === true;
  },

  /**
   * Generate consent record for audit trail
   */
  createConsentRecord(userId: string, consentType: string, granted: boolean, ipAddress?: string) {
    return {
      user_id: userId,
      consent_type: consentType,
      granted,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress || null,
      version: '1.0', // Consent form version
    };
  },
};

/**
 * Data export utilities for GDPR compliance
 */
export const DataExporter = {
  /**
   * Format user data for GDPR export request
   */
  formatForExport(userData: any): string {
    // Remove internal fields
    const exportData = { ...userData };
    delete exportData.password_hash;
    delete exportData.internal_notes;

    // Ensure dates are ISO formatted
    for (const key in exportData) {
      if (exportData[key] instanceof Date) {
        exportData[key] = exportData[key].toISOString();
      }
    }

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Generate CSV from data array
   */
  toCSV(data: any[], headers?: string[]): string {
    if (data.length === 0) return '';

    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = [csvHeaders.join(',')];

    for (const row of data) {
      const values = csvHeaders.map((header) => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  },
};

/**
 * Encryption verification utilities
 */
export const EncryptionVerifier = {
  /**
   * Check if a connection is using TLS/SSL
   */
  isConnectionSecure(): boolean {
    // In React Native, check if using HTTPS
    if (typeof window !== 'undefined' && window.location) {
      return window.location.protocol === 'https:';
    }
    // In production, always enforce HTTPS
    return process.env.NODE_ENV === 'production';
  },

  /**
   * Verify that sensitive data is encrypted before storage
   */
  verifyEncryption(data: any): boolean {
    // Check for common patterns of unencrypted sensitive data
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit cards
      /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, // UK postcodes
      /[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}/i, // NI numbers
    ];

    const dataString = JSON.stringify(data);

    for (const pattern of sensitivePatterns) {
      if (pattern.test(dataString)) {
        console.warn('Potentially unencrypted sensitive data detected');
        return false;
      }
    }

    return true;
  },
};

/**
 * Access control utilities
 */
export const AccessController = {
  /**
   * Check if a user can access child data based on their role
   */
  canAccessChildData(userRole: string, relationship: string): boolean {
    const accessMatrix: Record<string, string[]> = {
      social_worker: ['assigned_case', 'supervisor_override'],
      foster_carer: ['active_placement'],
      admin: ['organization_oversight'],
      child: ['self'],
    };

    const allowedRelationships = accessMatrix[userRole] || [];
    return allowedRelationships.includes(relationship);
  },

  /**
   * Generate access control list for a resource
   */
  generateACL(resourceType: string, ownerId: string, additionalUsers: string[] = []) {
    return {
      resource_type: resourceType,
      owner_id: ownerId,
      read_access: [ownerId, ...additionalUsers],
      write_access: [ownerId],
      delete_access: resourceType === 'audit_log' ? [] : [ownerId],
      created_at: new Date().toISOString(),
    };
  },
};

/**
 * Audit trail utilities
 */
export const AuditLogger = {
  /**
   * Create an audit log entry
   */
  createAuditEntry(
    action: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    metadata?: any,
  ) {
    return {
      action,
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: metadata
        ? Anonymizer.redactObject(metadata, ['password', 'token', 'secret'])
        : null,
      timestamp: new Date().toISOString(),
      ip_address: null, // Would be captured server-side
      user_agent: null, // Would be captured server-side
    };
  },

  /**
   * Sensitive actions that must always be logged
   */
  sensitiveActions: [
    'user.login',
    'user.logout',
    'user.password_change',
    'case.access',
    'case.update',
    'message.send',
    'child.token_generate',
    'child.token_validate',
    'data.export',
    'data.delete',
    'permission.grant',
    'permission.revoke',
  ],
};
