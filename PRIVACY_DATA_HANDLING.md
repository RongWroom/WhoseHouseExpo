# WhoseHouse Privacy & Data Handling Documentation

## Table of Contents

1. [Overview](#overview)
2. [Privacy Principles](#privacy-principles)
3. [Data Classification](#data-classification)
4. [Data Handling Procedures](#data-handling-procedures)
5. [GDPR Compliance](#gdpr-compliance)
6. [Security Measures](#security-measures)
7. [Incident Response](#incident-response)
8. [Privacy Implementation Guide](#privacy-implementation-guide)

## Overview

WhoseHouse is a secure communication platform for the foster care ecosystem, handling highly sensitive personal data including information about vulnerable children. This document outlines our comprehensive approach to privacy and data protection.

**Regulatory Compliance:**

- GDPR (General Data Protection Regulation)
- UK Data Protection Act 2018
- Children's Online Privacy Protection Act (COPPA) principles
- UK Safeguarding regulations

## Privacy Principles

### 1. Privacy by Design

- All features are built with privacy as the default setting
- Data minimization - only collect what's necessary
- Purpose limitation - use data only for stated purposes
- Anonymization wherever possible

### 2. Data Subject Rights

- Right to access (data export)
- Right to rectification (data correction)
- Right to erasure (right to be forgotten)
- Right to data portability
- Right to object to processing

### 3. Special Considerations for Children

- No persistent authentication for children
- Access only via time-limited, single-use tokens
- Display names as initials only
- No direct child-to-foster-carer communication
- Enhanced audit trails for all child data access

## Data Classification

### Tier 1: Highly Sensitive (Red)

- **Definition:** Data requiring maximum protection
- **Examples:**
  - Child personal information
  - Case details and history
  - Safeguarding concerns
  - Medical/health information
- **Handling:**
  - Encrypted at rest and in transit
  - Access on strict need-to-know basis
  - Full audit logging
  - Anonymized in all non-essential contexts

### Tier 2: Sensitive (Amber)

- **Definition:** Professional and adult personal data
- **Examples:**
  - Social worker profiles
  - Foster carer information
  - Communication logs
  - System access logs
- **Handling:**
  - Encrypted storage
  - Role-based access control
  - Regular audit reviews
  - Retention policies applied

### Tier 3: Internal (Green)

- **Definition:** Non-personal operational data
- **Examples:**
  - System configuration
  - Anonymous statistics
  - Public documentation
- **Handling:**
  - Standard security measures
  - Internal access only
  - Regular backups

## Data Handling Procedures

### 1. Data Collection

```typescript
// ALWAYS anonymize child data when displaying
const childDisplay = Anonymizer.childDisplayName(firstName, lastName);

// NEVER store sensitive data in plain text
const sanitizedMessage = Anonymizer.sanitizeText(userInput);

// Validate and sanitize all inputs
const validatedInput = validateInput(userInput);
```

### 2. Data Storage

**Encryption Requirements:**

- Database: AES-256 encryption at rest (Supabase)
- File Storage: Encrypted buckets with access control
- Backups: Encrypted with separate keys

**Storage Locations:**

- Production: EU-West region (GDPR compliance)
- Backups: Geographically separated, encrypted storage
- Media: Supabase Storage with signed URLs

### 3. Data Access

**Access Control Matrix:**
| Data Type | Social Worker | Foster Carer | Child | Admin |
|-----------|--------------|--------------|-------|--------|
| Child Profile | Own cases only | Active placement only | Self only (limited) | All |
| Messages | Own conversations | With SW only | With SW only | Audit only |
| Case Files | Own cases | Active case (limited) | No | All |
| Media | Case-related | Approved only | Approved only | All |
| Audit Logs | No | No | No | Yes |

### 4. Data Transmission

- **HTTPS Only:** All API calls use TLS 1.3+
- **WebSocket Security:** Authenticated real-time connections
- **File Transfers:** Temporary signed URLs (60-second expiry)
- **Deep Links:** Token-based with expiry timestamps

### 5. Data Retention

| Data Type       | Retention Period      | Legal Basis         |
| --------------- | --------------------- | ------------------- |
| Messages        | 1 year                | Legitimate interest |
| Media Files     | 6 months              | Legitimate interest |
| Audit Logs      | 7 years               | Legal requirement   |
| Case Data       | 5 years after closure | Legal requirement   |
| Access Logs     | 90 days               | Security monitoring |
| Consent Records | 7 years               | Legal requirement   |

**Implementation:**

```typescript
// Check retention compliance
const retentionCheck = await DataRetention.shouldRetain(
  createdAt,
  DataRetention.getRetentionPeriod('messages'),
);

// Schedule deletion
if (!retentionCheck) {
  await scheduleForDeletion(recordId);
}
```

### 6. Data Deletion

**Soft Deletion Process:**

1. Mark record as deleted (retain for audit)
2. Anonymize personal information
3. Remove from active queries
4. Schedule for permanent deletion

**Hard Deletion Process:**

1. Verify deletion authorization
2. Export data for final backup
3. Remove from primary database
4. Purge from backups after grace period
5. Update audit log

## GDPR Compliance

### Lawful Basis for Processing

1. **Consent:** Explicit consent for optional features
2. **Legal Obligation:** Safeguarding and child protection requirements
3. **Vital Interests:** Protection of children's safety
4. **Legitimate Interests:** Service provision and security

### Consent Management

```typescript
// Recording consent
await recordUserConsent({
  consentType: 'data_processing',
  granted: true,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});

// Checking consent
const hasConsent = ConsentManager.hasConsent(userConsents, 'communication');
```

### Data Subject Requests

**Export Request Process:**

1. User initiates request via privacy settings
2. System validates identity
3. Data collected and anonymized
4. Export generated (JSON/CSV)
5. Secure download link provided (7-day expiry)
6. Audit trail updated

**Deletion Request Process:**

1. User submits deletion request
2. 30-day grace period initiated
3. Admin review for safeguarding implications
4. Data anonymization begins
5. Confirmation sent to user
6. Permanent deletion after legal retention period

### Privacy Impact Assessments (PIA)

Required for:

- New features handling personal data
- Changes to data processing
- Third-party integrations
- Cross-border data transfers

## Security Measures

### Technical Safeguards

1. **Encryption:**
   - AES-256 for data at rest
   - TLS 1.3 for data in transit
   - End-to-end encryption for sensitive communications (planned)

2. **Access Control:**
   - Multi-factor authentication (for staff)
   - Role-based permissions
   - Session management
   - IP allowlisting (optional)

3. **Monitoring:**
   - Real-time threat detection
   - Anomaly detection for data access
   - Failed login monitoring
   - Data exfiltration prevention

### Organizational Measures

1. **Staff Training:**
   - Annual GDPR training
   - Safeguarding protocols
   - Incident response procedures
   - Security awareness

2. **Policies:**
   - Data Protection Policy
   - Information Security Policy
   - Incident Response Plan
   - Business Continuity Plan

3. **Auditing:**
   - Quarterly security reviews
   - Annual penetration testing
   - Regular compliance audits
   - Third-party assessments

## Incident Response

### Breach Detection & Response

**Severity Levels:**

- **Critical:** Child data exposed, immediate risk
- **High:** Adult personal data breach
- **Medium:** System vulnerability discovered
- **Low:** Minor policy violation

**Response Timeline:**

1. **0-1 hour:** Incident containment
2. **1-4 hours:** Initial assessment
3. **4-24 hours:** Stakeholder notification
4. **24-72 hours:** Regulatory notification (if required)
5. **7 days:** Full investigation report
6. **30 days:** Remediation complete

**Notification Requirements:**

- ICO notification within 72 hours (GDPR)
- Affected users notified without undue delay
- Local authority safeguarding team (if child data affected)

## Privacy Implementation Guide

### For Developers

```typescript
// 1. Always use privacy utilities
import { Anonymizer, DataRetention, ConsentManager } from '@/utils/privacy';

// 2. Anonymize sensitive data
const safeDisplay = Anonymizer.nameToInitials(fullName);
const cleanText = Anonymizer.sanitizeText(userInput);

// 3. Check retention policies
const shouldDelete = !DataRetention.shouldRetain(
  recordDate,
  DataRetention.getRetentionPeriod('messages'),
);

// 4. Verify consent before processing
if (!ConsentManager.hasConsent(userConsents, 'analytics')) {
  return; // Don't process
}

// 5. Log all sensitive operations
AuditLogger.createAuditEntry('data.access', userId, 'case', caseId, { reason: 'routine_check' });
```

### For Product Managers

**Privacy Checklist for New Features:**

- [ ] Conduct Privacy Impact Assessment
- [ ] Define lawful basis for data processing
- [ ] Implement consent mechanisms (if needed)
- [ ] Set retention periods
- [ ] Plan anonymization strategy
- [ ] Design audit logging
- [ ] Create user privacy controls
- [ ] Document data flows
- [ ] Review with DPO/legal team

### For System Administrators

**Regular Privacy Tasks:**

- Weekly: Review access logs for anomalies
- Monthly: Run retention policy cleanup
- Quarterly: Audit user permissions
- Annually: Update privacy documentation
- As needed: Process data subject requests

## Appendices

### A. Useful Privacy Utilities

```typescript
// Privacy utilities available in src/utils/privacy.ts
Anonymizer.nameToInitials();
Anonymizer.maskEmail();
Anonymizer.sanitizeText();
DataRetention.shouldRetain();
ConsentManager.hasConsent();
DataExporter.formatForExport();
EncryptionVerifier.isConnectionSecure();
AccessController.canAccessChildData();
AuditLogger.createAuditEntry();
```

### B. Database Functions

```sql
-- GDPR compliance functions (migration 008)
record_user_consent()
request_data_export()
request_data_deletion()
collect_user_data_for_export()
anonymize_user_data()
check_retention_compliance()
apply_retention_policies()
```

### C. Regulatory Contacts

- **Data Protection Officer:** [To be appointed]
- **ICO Registration:** [Registration number]
- **Legal Counsel:** [Contact details]
- **Safeguarding Lead:** [Contact details]

### D. Version History

| Version | Date     | Changes               | Author           |
| ------- | -------- | --------------------- | ---------------- |
| 1.0     | Nov 2024 | Initial documentation | Development Team |

---

**Last Updated:** November 2024  
**Review Date:** February 2025  
**Classification:** Internal Use Only
