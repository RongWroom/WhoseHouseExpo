# Push Notification Testing Guide

## Prerequisites

1. **Physical Device Required** - Push notifications do NOT work in simulators/emulators
2. **Expo Go App** - Install from App Store / Google Play
3. **Supabase Project** - Ensure migrations are applied (especially `018_push_notifications.sql`)

## Quick Start

### 1. Start the Development Server

```bash
npx expo start -c
```

### 2. Connect Physical Device

Scan the QR code with:

- **iOS**: Camera app → tap the notification
- **Android**: Expo Go app → Scan QR Code

### 3. Test Notification Registration

1. Log in as a Social Worker or Foster Carer
2. Go to **Settings** tab
3. Tap **Notification Settings**
4. Toggle notifications ON
5. Accept permission prompt when asked

**Expected Result**: You should see "Notifications are enabled" status

### 4. Verify Token Registration

Check Supabase dashboard:

```sql
SELECT * FROM push_tokens ORDER BY created_at DESC LIMIT 5;
```

You should see an entry with:

- `user_id` matching logged-in user
- `expo_push_token` starting with `ExponentPushToken[...]`
- `is_active = true`

## Testing Notification Scenarios

### Test 1: Message Notification

1. Log in as **Social Worker** on Device A
2. Log in as **Foster Carer** on Device B (or use Supabase dashboard)
3. Social Worker sends a message to Foster Carer
4. Foster Carer should receive push notification

### Test 2: Urgent Message

1. Social Worker sends message with "Urgent" toggle ON
2. Foster Carer receives high-priority notification with "🚨" prefix

### Test 3: Quiet Hours

1. Enable Quiet Hours in Notification Settings
2. Set current time within quiet hours range
3. Send a message
4. Notification should be suppressed (check logs)

### Test 4: Notification Preferences

1. Disable "Messages" in preferences
2. Send a message
3. Notification should NOT be delivered

## Manual Push Test (via Expo Tool)

Use Expo's push notification tool:
https://expo.dev/notifications

1. Get your device's push token from Settings → Notification Settings
2. Enter the token in Expo's tool
3. Send a test notification

```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "title": "Test Notification",
  "body": "This is a test message",
  "data": { "type": "test" }
}
```

## Database Functions for Testing

### Send Test Notification (via SQL)

```sql
-- Insert a test notification record
INSERT INTO notification_queue (user_id, type, title, body, data, priority)
VALUES (
  'YOUR_USER_UUID',
  'message',
  'Test Notification',
  'This is a test notification body',
  '{"test": true}',
  'default'
);
```

### Check Notification Queue

```sql
SELECT * FROM notification_queue
WHERE sent_at IS NULL
ORDER BY created_at DESC;
```

## Troubleshooting

### Notifications Not Appearing

1. **Check Permissions**
   - iOS: Settings → WhoseHouse → Notifications → Allow
   - Android: Settings → Apps → Expo Go → Notifications

2. **Check Token Registration**

   ```sql
   SELECT * FROM push_tokens WHERE user_id = 'YOUR_UUID';
   ```

3. **Check Preferences**
   ```sql
   SELECT * FROM notification_preferences WHERE user_id = 'YOUR_UUID';
   ```

### "Permission not granted" Error

- User denied notification permission
- Must be reset in device Settings app

### Token Not Registering

1. Ensure using physical device (not simulator)
2. Check network connectivity
3. Try signing out and back in

## Production Considerations

### Expo Push Service

- Free tier: 10,000 notifications/month
- Need to set up Expo account for production
- Consider Expo Application Services (EAS) for production builds

### iOS Requirements

1. Apple Developer Account ($99/year)
2. Push notification certificate
3. App Store submission

### Android Requirements

1. Google Play Developer Account ($25 one-time)
2. Firebase Cloud Messaging (FCM) setup
3. Play Store submission

## Notification Types Reference

| Type             | Description                | Default Priority |
| ---------------- | -------------------------- | ---------------- |
| `message`        | Regular message            | default          |
| `urgent_message` | Urgent message from SW     | high             |
| `case_update`    | Case status change         | default          |
| `child_access`   | Child accessed secure link | high             |
| `system`         | System announcement        | default          |

## Code Reference

- **Service**: `src/lib/notifications.ts`
- **Hook**: `src/hooks/useNotifications.ts`
- **Settings UI**: `src/components/settings/NotificationSettings.tsx`
- **Database**: `supabase/migrations/018_push_notifications.sql`
