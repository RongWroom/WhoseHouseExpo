# WhoseHouse Quick Start

## 🚀 Make the App Usable in 3 Steps

### Step 1: Configure Supabase

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
# Get them from: Supabase Dashboard → Settings → API
```

### Step 2: Run Migrations

In Supabase SQL Editor, run each file from `supabase/migrations/` in order (001 through 008).

**Don't forget:** Disable email confirmation in Authentication → Providers → Email

### Step 3: Seed Database

```bash
node scripts/seed-database.js
```

This creates 3 social workers, 5 foster carers, 8 cases, and sample messages.

## 🎯 Test Accounts

**Social Worker:**

- sarah.williams@test.com / Test123!

**Foster Carer:**

- david.carter@test.com / Test123!

**Admin:**

```bash
node scripts/create-admin-account.js
# Creates: admin@whosehouse.com / Admin123!
```

## 🏃 Run the App

```bash
npx expo start
```

Then press:

- `i` for iOS Simulator
- `a` for Android Emulator
- `w` for Web Browser
- Scan QR code for Expo Go on your phone

## ✅ What You Can Now Do

### Social Worker View

- ✅ View dashboard with caseload statistics
- ✅ Browse all assigned cases
- ✅ Click into case details
- ✅ Generate secure child access links/QR codes
- ✅ Send/receive messages with foster carers

### Foster Carer View

- ✅ View active placement dashboard
- ✅ See case details for child in care
- ✅ Message assigned social worker

### Admin View

- ✅ View organization statistics
- ✅ Manage users (create, deactivate)
- ✅ Assign social workers to foster carers

### Child Access (No Login)

- ✅ Generate token as social worker
- ✅ Open secure link
- ✅ View child-friendly interface
- ✅ Message social worker

## 🔧 Troubleshooting

**No data showing?**

```bash
node scripts/seed-database.js
```

**Metro bundler issues?**

```bash
npx expo start -c
```

**Database connection failed?**

- Check `.env` has correct Supabase credentials
- Verify Supabase project is active (not paused)

## 📚 Full Documentation

See `GETTING_STARTED.md` for complete setup instructions and troubleshooting.
