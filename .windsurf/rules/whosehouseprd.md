---
trigger: always_on
---

```markdown:whose_house_prd_v2.md
# Whose House: Product Requirements Document (v2.0)

## 1. Executive Summary
"Whose House" is a secure, privacy-first mobile communication platform designed for the foster care ecosystem. It addresses a critical gap in safeguarding by providing distinct, role-based interfaces for **Social Workers**, **Foster Carers**, and **Children**. The platform's primary objective is to improve case management efficiency, create a secure communication channel for all parties, and provide a safe, simple way for a child to connect with their social worker, while strictly adhering to data protection regulations (including GDPR).

## 2. Technical Stack
* **Framework:** Expo (React Native)
* **Database & Auth:** Supabase
* **UI:** Shadcn (React Native) via Nativewind
* **Routing:** Expo File-Based Router

## 3. User Personas

* **As a Social Worker (Sarah),** I want to securely message any carer or child on my caseload from one app so that I can efficiently manage communications and maintain a single source of truth for case-related interactions.
* **As a Foster Carer (David),** I want to easily communicate with my assigned social worker and access information about my current placement so that I can get the support I need and provide the best care.
* **As a Child (Alex, 10),** I want a simple, safe way to see my social worker's picture and send them a message so that I know who to contact and feel secure.

## 4. User Profiles & Authentication


* **Social Worker:** Full login. Manages caseloads, communicates with Carers and Children.
* **Foster Carer:** Full login. Manages their active case, communicates with their assigned Social Worker.
* **Child:** **No login/password.** Access is granted *only* via a secure, time-limited, single-use link or QR code provided by their Social Worker. This ensures the child never has credentials that can be lost or stolen.

## 5. Core User Flows (Navigation)

### 5.1. Social Worker `(social_worker)`
* **Dashboard:** Overview of active cases, unread messages, and high-priority alerts.
* **Caseload:** List of all assigned cases (Children).
* **Secure Messaging:** Interface to communicate with Foster Carers and Children.
* **Settings:** Profile management.

### 5.2. Foster Carer `(foster_carer)`
* **Dashboard:** Overview of their active placement, unread messages.
* **My Active Case:** Details on the child currently in their care (anonymized).
* **Secure Messaging:** Interface to communicate with their assigned Social Worker.

### 5.3. Child `(child)`
* **Single Screen View:** Accessed via secure link/QR code.
* **Content:** "Welcome" message, pictures of the house (uploaded by Carer/Social Worker), and profile of their Social Worker.
* **Action:** **One single button:** "Message My Social Worker (Sarah)."

## 6. Privacy, Security & Compliance (Highest Priority)
This platform will handle highly sensitive data and must be built with a "security-first" architecture.

* **Data Compliance:** All data storage and processing must be fully compliant with **GDPR** and the **Data Protection Act 2018 (DPA 2018)**.
* **Anonymization:** No PII (Personally Identifiable Information) for children will be used on any screen. All references will be via unique, anonymized Case IDs.
* **Access Control:** Data access must be strictly segregated. A Foster Carer must *never* be ableto see another Carer's data or any child's data not assigned to them.
* **Data Encryption:** All data must be encrypted **in-transit** (SSL/TLS) and **at-rest** (Supabase database-level encryption).
* **Audit Logging:** A secure, immutable log must be kept of all critical actions (e.g., "Social Worker X accessed Case Y," "Message sent from Carer A to Social Worker B"). This is non-negotiable for safeguarding investigations.

## 7. Secure Messaging Rules


* **Social Worker <-> Foster Carer:** Full two-way communication.
* **Child -> Social Worker:** One-way initiation from Child to their *assigned* Social Worker. Social Worker can reply.
* **Forbidden Paths:**
    * Child <-> Foster Carer
    * Foster Carer <-> Foster Carer
    * Child <-> Child

* **Messaging Features:**
    * **Read Receipts:** Social Workers and Foster Carers can see "Sent," "Delivered," and "Read" status. (This feature is **disabled** for the Child profile for safeguarding reasons).
    * **Urgent Flag:** A Social Worker can mark a message to a Carer as "Urgent," triggering a high-priority push notification.

## 8. Admin & Onboarding (New Role)
* **Organization Admin:** A new web-based portal (or secure app route) must exist for a designated Admin (e.g., the Care company manager) to:
    * Create and provision new Social Worker accounts.
    * Assign Social Workers to Foster Carers.
    * Deactivate accounts for staff who have left the organization.
```
