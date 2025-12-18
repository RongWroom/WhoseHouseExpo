# Production Setup Guide

## Overview

This guide covers deploying WhoseHouse to production with proper security, environment configuration, and app store submissions.

## 1. Environment Configuration

### Create Production Environment File

```bash
cp .env.example .env.production
```

### Required Environment Variables

```env
# Supabase Production
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# App Configuration
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_DEEP_LINK_SCHEME=whosehouse

# Optional: Analytics
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

### Security Checklist

- [ ] Never commit `.env.production` to git
- [ ] Use different Supabase project for production
- [ ] Enable Supabase email confirmation in production
- [ ] Set strong JWT secret in Supabase
- [ ] Configure proper CORS origins

## 2. Supabase Production Setup

### Create Production Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project (separate from development)
3. Note the project URL and anon key

### Apply Migrations

```bash
# Link to production project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
npx supabase db push
```

### Configure Authentication

1. **Dashboard → Authentication → Providers → Email**
   - Enable email confirmation for production
   - Set secure password requirements

2. **Dashboard → Authentication → URL Configuration**
   - Site URL: `https://your-app-domain.com`
   - Redirect URLs: Add `whosehouse://` for deep linking

### Enable Row Level Security

Verify all tables have RLS enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Create Admin Account

```bash
node scripts/create-admin-account.js
```

Update with production admin email.

## 3. Expo Application Services (EAS)

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Configure EAS

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build for Production

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

## 4. iOS App Store Setup

### Requirements

- Apple Developer Account ($99/year)
- Mac with Xcode (for testing)

### Steps

1. **Create App Store Connect Entry**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create new app with bundle ID: `com.whosehouse.app`

2. **Configure Push Notifications**
   - Create APNs key in Apple Developer portal
   - Upload to Expo: `eas credentials`

3. **Privacy & Compliance**
   - Complete privacy questionnaire
   - Add privacy policy URL
   - GDPR compliance statement

4. **Submit for Review**
   ```bash
   eas submit --platform ios
   ```

### Required App Store Assets

- [ ] App icon (1024x1024)
- [ ] Screenshots (6.5" and 5.5" iPhone)
- [ ] App description
- [ ] Keywords
- [ ] Privacy policy URL
- [ ] Support URL

## 5. Google Play Store Setup

### Requirements

- Google Play Developer Account ($25 one-time)

### Steps

1. **Create Play Console Entry**
   - Go to [Play Console](https://play.google.com/console)
   - Create new app

2. **Configure Firebase (for Push)**
   - Create Firebase project
   - Download `google-services.json`
   - Configure in `app.config.js`

3. **Content Rating**
   - Complete content rating questionnaire
   - WhoseHouse likely: "Everyone" with sensitive data handling

4. **Submit for Review**
   ```bash
   eas submit --platform android
   ```

### Required Play Store Assets

- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone and tablet)
- [ ] App description (short and full)
- [ ] Privacy policy URL

## 6. Push Notification Production Setup

### Expo Push Service

Already configured. For production:

1. Create Expo account at [expo.dev](https://expo.dev)
2. Link project: `eas init`
3. Push tokens automatically use production certificates

### Server-Side Sending (Optional)

For sending notifications from backend:

```javascript
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const messages = [
  {
    to: 'ExponentPushToken[xxx]',
    title: 'New Message',
    body: 'You have a new message',
    data: { type: 'message', caseId: '...' },
  },
];

const tickets = await expo.sendPushNotificationsAsync(messages);
```

## 7. Security Hardening

### Supabase Security

```sql
-- Ensure audit logs are immutable
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'cases';
```

### App Security

1. **Secure Storage**
   - Tokens stored in AsyncStorage (encrypted on iOS)
   - Consider `expo-secure-store` for sensitive data

2. **Certificate Pinning** (Optional)
   - Add to `app.config.js` for enhanced security

3. **Deep Link Validation**
   - Only accept `whosehouse://` scheme
   - Validate token format before use

## 8. Monitoring & Analytics

### Error Tracking

Consider adding Sentry:

```bash
npx expo install @sentry/react-native
```

### Analytics

Consider adding:

- Expo Analytics (free)
- Mixpanel
- Amplitude

## 9. Pre-Launch Checklist

### Code Quality

- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Tests pass (`npm test`)

### Security

- [ ] Production Supabase project created
- [ ] RLS enabled on all tables
- [ ] Email confirmation enabled
- [ ] Audit logging verified
- [ ] GDPR compliance reviewed

### App Configuration

- [ ] App icons and splash screens finalized
- [ ] Version numbers set correctly
- [ ] Deep linking tested
- [ ] Push notifications tested on physical devices

### Legal

- [ ] Privacy Policy created and hosted
- [ ] Terms of Service created
- [ ] GDPR documentation complete
- [ ] Data Processing Agreement (if needed)

### App Stores

- [ ] Developer accounts created
- [ ] App store listings complete
- [ ] Screenshots prepared
- [ ] Marketing materials ready

## 10. Post-Launch

### Monitoring

- Monitor Supabase dashboard for errors
- Check Expo push notification receipts
- Review app store crash reports

### Updates

```bash
# OTA update (JS changes only)
eas update --branch production

# Full build (native changes)
eas build --platform all --profile production
```

## Support Contacts

- **Supabase**: support@supabase.io
- **Expo**: https://expo.dev/support
- **App Store**: App Store Connect support
- **Play Store**: Play Console help

---

**Note**: This is a safeguarding application handling sensitive data. Ensure all security measures are properly implemented and tested before production deployment.
