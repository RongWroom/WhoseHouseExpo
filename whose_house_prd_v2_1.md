# Whose House: Product Requirements Document (v2.1)

**Version:** 2.1  
**Status:** Active  
**Supersedes:** v2.0  
**Last Updated:** 2026-03-13

---

## 1. Executive Summary

"Whose House" is a secure, privacy-first communication platform for the foster care ecosystem. The product serves three role-specific experiences—**Social Worker**, **Foster Carer**, and **Child**—with strict data segregation and safeguarding-first defaults.

The primary objective is to improve case management and secure communications while protecting vulnerable users and maintaining compliance with **GDPR** and the **Data Protection Act 2018 (DPA 2018)**.

---

## 2. Technical Stack

- **Framework:** Expo (React Native)
- **Database & Auth:** Supabase
- **UI:** Shadcn (React Native) via Nativewind
- **Routing:** Expo Router (file-based)

---

## 3. User Personas

- **Social Worker (Sarah):** Needs secure, efficient communication with carers and children on assigned caseloads.
- **Foster Carer (David):** Needs clear access to active case context and direct support from assigned social worker.
- **Child (Alex, 10):** Needs a simple, safe, no-credential way to contact their social worker.

---

## 4. Roles and Authentication

### 4.1 Social Worker
- Full authenticated access.
- Can manage assigned cases and communicate with assigned carers and children.

### 4.2 Foster Carer
- Full authenticated access.
- Can access only their assigned active case(s) and communicate with assigned social worker.

### 4.3 Child
- **No username/password credentials.**
- Access is granted only by secure, time-limited tokenized links/QR codes created by a social worker.
- Child experience remains constrained to safeguarding-safe actions.

### 4.4 Organization Admin
- Provision/deactivate staff accounts.
- Manage social-worker/carer assignment relationships.
- View compliance and operational dashboards as permitted by policy.

---

## 5. Core User Flows

### 5.1 Social Worker `(social_worker)`
- Dashboard: active caseload summary, unread messages, alerts.
- Caseload: assigned case list and statuses.
- Messaging: secure messaging with carers and child-originated conversations.
- Settings: profile and organizational controls.

### 5.2 Foster Carer `(foster_carer)`
- Dashboard: active placement summary and unread messages.
- Active Case: anonymized case details and approved media.
- Messaging: secure communication with assigned social worker.

### 5.3 Child `(child)`
- Single-screen secure access from tokenized link/QR.
- Displays safe welcome content, approved photos, and assigned social worker profile.
- Single action: **"Message My Social Worker"**.

---

## 6. Privacy, Security, and Compliance (Highest Priority)

- **Compliance:** Full GDPR and DPA 2018 alignment.
- **Anonymization:** No child PII in UI labels, notifications, logs, or exports unless explicitly required and authorized.
- **Access Segregation:** Strict role- and assignment-based access boundaries with DB-level enforcement.
- **Encryption:** TLS in transit and encryption at rest.
- **Auditability:** Immutable logging for critical actions and data access events.
- **Least Privilege:** Every role gets only the minimum data/actions required.

---

## 7. Messaging Policy and Rules

### 7.1 Allowed Paths
- Social Worker ↔ Foster Carer
- Child → Assigned Social Worker
- Social Worker → Child (reply path as policy allows)

### 7.2 Forbidden Paths
- Child ↔ Foster Carer
- Foster Carer ↔ Foster Carer
- Child ↔ Child

### 7.3 Messaging Safeguards
- DB trigger/function-level path validation for all inserts.
- Child-originated messages require valid token context.
- Authenticated user messages must bind `sender_id` to authenticated user identity.
- Read receipts (`sent`, `delivered`, `read`) enabled for staff roles; child-facing read-state indicators remain disabled.
- Urgent flag allowed for social-worker-originated messages to carers.

---

## 8. Child Access Token Security (New in v2.1)

- **TTL:** Token expiration must be explicit and short-lived by default.
- **Replay Controls:** Tokens support single-use or constrained multi-use policy by case policy.
- **Revocation:** Social workers/admins can revoke tokens immediately.
- **Rate Limiting:** Token validation and child message endpoints enforce anti-abuse limits.
- **Routing Integrity:** Child message routing must verify token-case-recipient alignment.
- **Telemetry:** Token generation, use, reuse attempts, expiry, and revocation events are audit logged.

---

## 9. Media Access and Delivery Controls (New in v2.1)

- Child-visible media must be explicitly flagged (`is_visible_to_child = true`).
- Media authorization checks must be tied to `case_id` ownership and role policy.
- Prefer expiring signed URLs for sensitive media access; avoid long-lived public URLs for restricted content.
- If public URLs are used for a limited transition period, scope must be minimized and migration to signed URLs scheduled.
- Media metadata and categories must avoid child PII.

---

## 10. Notifications and Privacy (New in v2.1)

- Push notification previews must not include child PII, case details, or sensitive message content.
- Default lock-screen safe text (e.g., "You have a new secure message").
- Deep links must require re-validation of auth/role before content reveal.
- Notification delivery and opens should be logged without leaking protected content.

---

## 11. Data Lifecycle, DSAR, and Retention (New in v2.1)

- Define retention schedules by data class (messages, media, audit logs, account artifacts).
- Support DSAR workflows (access, export, correction, deletion) with legal-review checkpoints.
- Support legal hold to suspend deletion where required by investigation/regulatory need.
- Data exports and deletion events must be auditable.

---

## 12. Authorization and Testing Requirements (New in v2.1)

- Row Level Security (RLS) policies are mandatory for all sensitive tables.
- Add explicit negative test coverage for forbidden communication paths and cross-case access attempts.
- Security acceptance criteria includes:
  - role-spoofing prevention,
  - token misuse prevention,
  - child-media authorization correctness,
  - audit log integrity checks.
- Release gates must include passing security policy tests.

---

## 13. Safeguarding Incident Response (New in v2.1)

- Define severity model (Sev-1 to Sev-3 minimum).
- Define response SLAs per severity.
- Define escalation path (engineering, safeguarding lead, compliance owner).
- Incident records must include timeline, impacted scope, mitigation, and follow-up controls.

---

## 14. Non-Functional Requirements

- Reliability and clear fallback behavior for messaging and token validation.
- Accessibility-first UI for all role experiences.
- Performance targets for key user flows (dashboard load, message send/receive, child screen load).
- Monitoring and alerting for auth, messaging, and policy failures.

---

## 15. Success Metrics

- Message delivery success rate and latency thresholds.
- Unauthorized access attempts blocked (with trend reporting).
- Token misuse incidents detected/prevented.
- SLA adherence for safeguarding incidents.
- DSAR completion within legal timelines.

---

## 16. Open Decisions / Follow-Ups

1. Confirm token default policy (single-use vs controlled multi-use window).
2. Confirm signed URL rollout timeline for child-visible media.
3. Confirm retention durations with legal/compliance stakeholders.
4. Confirm staff notification content policy and exception process.
5. Confirm minimum mandatory security test suite for CI.
