# Getting Started with WhoseHouse

This guide will help you set up and run the WhoseHouse app with test data.

## Prerequisites

- Node.js 20.19.x or higher
- Expo CLI (installed automatically)
- Supabase account with a project created
- iOS Simulator (Xcode) or Android Emulator, or Expo Go app on your phone

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these:**

- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the Project URL, anon/public key, and service_role key

### 3. Run Database Migrations

In your Supabase project dashboard:

1. Go to SQL Editor
2. Create a new query
3. Copy and paste each migration file from `supabase/migrations/` in order:
   - `001_initial_schema.sql`
   - `002_row_level_security.sql`
   - `003_auth_functions.sql`
   - `004_fix_user_registration.sql`
   - `005_messaging_system.sql`
   - `006_admin_management.sql`
   - `007_secure_media_storage.sql`
   - `008_gdpr_compliance.sql`
4. Run each migration

**Important:** Disable email confirmation for development:

- Go to Authentication → Providers → Email
- Uncheck "Confirm email"

### 4. Seed the Database

Run the seed script to populate your database with test data:

```bash
node scripts/seed-database.js
```

This will create:

- **3 Social Workers** with full caseloads
- **5 Foster Carers** with assigned cases
- **8 Cases** (children) in various states (active, pending, closed)
- **Sample messages** between social workers and foster carers

## Running the App

### Start the Development Server

```bash
npx expo start
```

Or clear cache and start:

```bash
npx expo start -c
```

### Open the App

Choose one of these options:

1. **iOS Simulator** (Mac only): Press `i`
2. **Android Emulator**: Press `a`
3. **Web Browser**: Press `w`
4. **Physical Device**: Scan the QR code with Expo Go app

## Test Accounts

After running the seed script, you can log in with these accounts:

### Social Workers

| Email                   | Password | Name           |
| ----------------------- | -------- | -------------- |
| sarah.williams@test.com | Test123! | Sarah Williams |
| james.brown@test.com    | Test123! | James Brown    |
| emma.davis@test.com     | Test123! | Emma Davis     |

### Foster Carers

| Email                  | Password | Name          |
| ---------------------- | -------- | ------------- |
| david.carter@test.com  | Test123! | David Carter  |
| lisa.johnson@test.com  | Test123! | Lisa Johnson  |
| michael.smith@test.com | Test123! | Michael Smith |
| rachel.green@test.com  | Test123! | Rachel Green  |
| tom.anderson@test.com  | Test123! | Tom Anderson  |

### Admin Account

To create an admin account for testing the admin portal:

```bash
node scripts/create-admin-account.js
```

This creates:

- Email: `admin@whosehouse.com`
- Password: `Admin123!`

## What You Can Test

### As a Social Worker

1. **Dashboard** - View your caseload overview and statistics
2. **Caseload** - Browse all assigned cases, search and filter
3. **Case Details** - Click any case to view details
4. **Generate Access Token** - Create secure links/QR codes for children
5. **Messages** - Send and receive messages with foster carers
6. **Settings** - View profile and sign out

### As a Foster Carer

1. **Dashboard** - View your active placement and messages
2. **My Case** - See details about the child in your care
3. **Messages** - Communicate with your assigned social worker
4. **Settings** - View profile and sign out

### As an Admin

1. **Dashboard** - View organization statistics
2. **Users** - List, filter, activate/deactivate users
3. **Create User** - Add new social workers, foster carers, or admins
4. **Assignments** - Assign social workers to foster carers
5. **Settings** - Organization configuration

### Child Access (No Login Required)

1. Log in as a social worker
2. Go to a case detail screen
3. Generate a 24-hour or 72-hour access token
4. Copy the link or scan the QR code
5. Open the link in a new browser/device
6. View the child-friendly interface with social worker info

## Troubleshooting

### "Unable to run simctl" Warning

This warning appears on Mac without Xcode. It's harmless if you're:

- Using Expo Go on a physical device
- Developing for web or Android only

To remove it, install Xcode from the Mac App Store.

### Metro Bundler Fails

Clear all caches:

```bash
npx expo start -c
```

### Database Connection Issues

1. Check your `.env` file has correct Supabase credentials
2. Verify your Supabase project is active (not paused)
3. Check the Supabase dashboard for any errors

### No Data Showing

Re-run the seed script:

```bash
node scripts/seed-database.js
```

### TypeScript Errors

Regenerate types:

```bash
npm run typecheck
```

## Development Workflow

### Making Code Changes

1. Edit files in `app/` or `src/`
2. Save - hot reload will update automatically
3. If changes don't appear, press `r` in the terminal to reload

### Running Linting

```bash
npm run lint
```

### Running Type Checking

```bash
npm run typecheck
```

### Formatting Code

```bash
npm run format
```

## Project Structure

```
WhoseHouseApp/
├── app/                    # Expo Router file-based routing
│   ├── (auth)/            # Login, sign up screens
│   ├── (social_worker)/   # Social worker protected routes
│   ├── (foster_carer)/    # Foster carer protected routes
│   ├── (child)/           # Child secure access
│   └── (admin)/           # Admin portal
├── src/
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts (Auth, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Libraries (Supabase client)
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── supabase/
│   └── migrations/        # Database migrations
└── scripts/               # Helper scripts

```

## Next Steps

- Read `PRIVACY_DATA_HANDLING.md` for privacy and compliance information
- Check `UI_COMPONENT_GUIDE.md` for UI component documentation
- Review `FOUNDATION_TASKS.md` for completed features
- See `whose_house_prd_v2.md` for full product requirements

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the Supabase logs in your dashboard
3. Check the Expo console for error messages
4. Verify all migrations have been run successfully
