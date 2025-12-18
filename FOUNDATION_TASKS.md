# Whose House App – Foundational Task List

## 1. Project & Tooling Setup

- **Status:** Complete. Expo scaffold, styling tooling, env management, and CI quality checks are established.
- Confirm Expo project scaffolding, TypeScript, Nativewind, and baseline linting/formatting. ✅
- Establish environment management (dotenv, secure handling of Supabase keys). ✅ `.env.example` added with Supabase placeholders; secrets gitignored.
- Configure CI basics for linting and tests. ✅ GitHub Actions workflow runs lint, typecheck, format.

## 2. Supabase Backend Foundations

- **Status:** Complete. Database schema, RLS policies, auth functions, and audit logging are implemented.
- Define core database schema (users, roles, cases, messages, audit logs). ✅
- Implement row-level security policies and role-based access control. ✅
- Build auth flows: social worker/foster carer logins, child single-use tokens. ✅
- Create immutable audit logging for critical actions. ✅

## 3. Role-Based App Shells

- **Status:** Complete. Auth gating, role-based routing, and navigation structures are implemented.
- Implement root layout with auth gating and role-based routing. ✅
- Scaffold Social Worker, Foster Carer, and Child navigators per directory structure. ✅
- Enforce secure redirects for unauthorized role access. ✅

## 4. UI Foundations

- **Status:** Complete. Design system with role-based theming and accessibility-first components implemented.
- Establish shared design system components (typography, buttons, cards). ✅
- Configure theming, spacing, and accessibility defaults (contrast, tap targets). ✅
- Add placeholder dashboards, caseload, and messaging screens. ✅
- **Components Built:**
  - Core: Text, Button, Card, Input, Badge
  - Layout: Screen, Container, Section
  - Feedback: LoadingSpinner, EmptyState, Alert
  - Utility: Avatar, Divider
  - Theme system with role-based colors (Social Worker blue, Foster Carer green, Child green)
  - Accessibility: WCAG AA compliant, minimum 44x44 touch targets
  - Documentation: UI_COMPONENT_GUIDE.md
- **All dashboards refactored to use design system consistently** ✅

## 5. Messaging Infrastructure

- **Status:** Complete. Real-time messaging with privacy safeguards and communication path enforcement implemented.
- Model message entities with status flags and urgent flag support. ✅
- Implement real-time message subscriptions/notifications. ✅
- Enforce permitted communication paths; disable child read receipts. ✅
- **Components Built:**
  - Database migration with message status tracking and path validation
  - useMessages hook with real-time Supabase subscriptions
  - MessageList component with role-based read receipts
  - MessageComposer with urgent flag (social workers only)
  - Child privacy: Display as initials only (e.g., "J.D." not "John Doe")
  - Offline queue support for message resilience
- **Security Features:**
  - Database-level path validation (no child-to-carer messaging)
  - Read receipts disabled for children
  - Urgent flag restricted to social workers
  - Child names automatically converted to initials

## 6. Child Secure Access Flow

- **Status:** Complete. Secure token generation, QR codes, and child-facing UI implemented.
- Implement single-use link/QR generation and validation pipeline. ✅
- Build child-facing single screen with social worker profile preview and messaging entry. ✅
- Add link expiry handling and device security checks. ✅
- **Components Built:**
  - Case detail screen for social workers (`app/(social_worker)/case/[id].tsx`)
  - Token generation with 24-hour and 72-hour options
  - QR code generation and sharing functionality
  - Child access screen refactored with design system components
  - Token validation with expiry checking
  - Secure link copying and sharing
- **Security Features:**
  - Database-level token validation and expiry checking
  - Single-use token generation (revokes previous tokens)
  - Device info logging for audit trail
  - Automatic expiry handling in UI
  - Deep linking support (`whosehouse://child/access/[token]`)

## 7. Admin & Onboarding Portal

- **Status:** Complete. Full admin portal with user management, organization stats, and case assignment workflows implemented.
- Scaffold admin portal/route for account provisioning and role assignments. ✅
- Implement workflows for social worker onboarding, assignments, and deactivation. ✅
- **Database Features:**
  - Migration 006_admin_management.sql with admin-only functions
  - User account creation with temporary passwords
  - User deactivation/reactivation with case reassignment
  - Social worker to foster carer assignment system
  - Organization-wide statistics and reporting
- **Admin Portal Screens:**
  - Dashboard: Organization statistics and activity overview
  - Users: List, filter, activate/deactivate users
  - Create User: Add new social workers, foster carers, or admins
  - Assignments: Assign social workers to foster carers
  - Settings: Organization and security configuration
- **Security Features:**
  - Admin-only access with role verification
  - Organization-scoped data access (multi-tenancy ready)
  - Audit logging for all admin actions
  - Last admin protection (can't deactivate last admin)

## 8. Privacy & Compliance Safeguards

- **Status:** Complete. Comprehensive privacy utilities, secure media storage, GDPR compliance, and documentation implemented.
- Enforce anonymized identifiers and secure media storage. ✅
- Verify encryption in transit/at rest and document data handling procedures. ✅
- **Privacy Utilities Created** (`src/utils/privacy.ts`):
  - Anonymizer: Name to initials, email/phone masking, PII sanitization
  - DataRetention: Policy enforcement, expiry calculations
  - ConsentManager: Consent tracking and validation
  - DataExporter: GDPR-compliant data exports (JSON/CSV)
  - EncryptionVerifier: Connection security checks
  - AccessController: Role-based access validation
  - AuditLogger: Comprehensive audit trail creation
- **Secure Media Storage** (`src/lib/media-storage.ts`):
  - File validation and size limits
  - SHA-256 checksum verification
  - Encrypted storage buckets with RLS
  - Signed URLs with 60-second expiry
  - Media access grants and audit logging
  - Support for camera and gallery uploads
- **Database Migrations Created**:
  - 007_secure_media_storage.sql: Media metadata, access control, audit logging
  - 008_gdpr_compliance.sql: Consent tracking, data exports, deletion requests, retention policies
- **Documentation** (`PRIVACY_DATA_HANDLING.md`):
  - Complete privacy principles and GDPR compliance guide
  - Data classification tiers (Red/Amber/Green)
  - Detailed data handling procedures
  - Incident response protocols
  - Implementation guide for developers
  - Privacy checklist for product managers

## 9. Observability & QA

- **Status:** In Progress. Testing infrastructure and error handling implemented.
- Add logging/monitoring integrations (Supabase logs, Sentry if used). ⏳
- Define test strategy across unit, integration, and E2E layers. ✅
- Prepare anonymized seed data and fixtures for testing. ⏳
- **Testing Infrastructure Created:**
  - Jest configuration (`jest.config.js`)
  - Jest setup with mocks (`jest.setup.js`)
  - Test files for validation utilities (`__tests__/utils/validation.test.ts`)
  - Test files for privacy utilities (`__tests__/utils/privacy.test.ts`)
  - Package.json updated with test scripts (`npm test`, `npm run test:watch`, `npm run test:coverage`)
  - Dependencies added: `@types/jest`, `jest`, `jest-expo`, `react-test-renderer`
- **Error Handling:**
  - ErrorBoundary component (`src/components/ErrorBoundary.tsx`)
  - useErrorHandler hook for functional components
  - withErrorBoundary HOC for wrapping components
  - Development-only technical error details display

## 10. Push Notifications

- **Status:** Complete. Full push notification infrastructure implemented.
- **Notification Service** (`src/lib/notifications.ts`):
  - Push token registration with Expo
  - Notification preferences management
  - Quiet hours support
  - Local notification scheduling
  - Notification handlers setup
  - Badge count management
- **Database Migration** (`supabase/migrations/018_push_notifications.sql`):
  - Push tokens table with platform info
  - Notification preferences table
  - Notification log for analytics
  - RLS policies for data security
  - Functions: `register_push_token`, `get_notification_preferences`, `update_notification_preferences`
- **Settings Component** (`src/components/settings/NotificationSettings.tsx`):
  - Master toggle for all notifications
  - Per-type toggles (messages, urgent, case updates, child access)
  - Quiet hours configuration
  - Beautiful UI with role-based theming
- **Dependency Added:** `expo-notifications`

## 11. Offline Support

- **Status:** Complete. Offline storage foundation implemented.
- **Offline Storage Service** (`src/lib/offline-storage.ts`):
  - Message queue for offline sending
  - Pending actions queue with retry logic
  - Data caching with expiration
  - Sync status tracking
  - User preferences persistence
  - Cleanup utilities for expired data
- **React Hooks:**
  - `useSyncStatus` for monitoring sync state
  - `usePendingMessageCount` for badge display

## 12. Admin Audit Log Viewer

- **Status:** Complete. Full audit log viewer implemented.
- **Audit Logs Screen** (`app/(admin)/audit-logs.tsx`):
  - Filterable log list by category and date range
  - Category filters: auth, message, case, admin, access
  - Date range filters: 24h, 7d, 30d, all time
  - Export functionality placeholder
  - Stats summary (total events, warnings)
  - Action icons and color-coded badges
  - Pull-to-refresh

## 13. Loading Skeletons

- **Status:** Complete. Comprehensive skeleton components implemented.
- **Skeleton Components** (`src/components/ui/Skeleton.tsx`):
  - Base Skeleton with shimmer animation
  - SkeletonText for text lines
  - SkeletonAvatar for profile pictures
  - SkeletonCard for card placeholders
  - SkeletonMessage for chat messages
  - SkeletonMessageList for message threads
  - SkeletonCaseCard for case cards
  - SkeletonStats for dashboard stats
  - SkeletonPhotoGrid for photo galleries
  - SkeletonUserList for user lists
  - SkeletonForm for forms
  - SkeletonProfile for profile pages
- All components exported from `src/components/ui/index.ts`
