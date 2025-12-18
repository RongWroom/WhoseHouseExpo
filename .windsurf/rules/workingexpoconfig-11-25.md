---
trigger: always_on
---

# Expo SDK 54 - Working Configuration Reference

**Last Updated:** November 9, 2025
**Status:** ✅ Verified Working

## Overview

This document captures the exact working configuration for WhoseHouse app with Expo SDK 54. This setup is clean, with no workarounds, patches, or legacy-peer-deps flags required.

## Package Versions

### Core Dependencies

```json
{
  "expo": "~54.0.23",
  "react": "19.1.0",
  "react-native": "0.81.5"
}
```

### Navigation & Routing

```json
{
  "expo-router": "^6.0.14",
  "expo-linking": "~8.0.8",
  "react-native-screens": "~4.16.0",
  "react-native-safe-area-context": "^5.6.2"
}
```

### Animation & Gestures

```json
{
  "react-native-reanimated": "^3.15.0",
  "react-native-worklets": "^0.6.0"
}
```

**Important Note:** We use Reanimated v3 (not v4) because Nativewind v4.2.1 does not yet support Reanimated v4. This is intentional and will show a version warning that can be safely ignored.

### UI & Styling

```json
{
  "nativewind": "^4.2.1",
  "tailwindcss": "^3.4.18",
  "react-native-svg": "^15.12.1",
  "lucide-react-native": "^0.553.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1"
}
```

### Backend & Storage

```json
{
  "@supabase/supabase-js": "^2.80.0",
  "@react-native-async-storage/async-storage": "^2.2.0"
}
```

### Expo Modules

```json
{
  "expo-constants": "^18.0.10",
  "expo-status-bar": "~3.0.8"
}
```

### Development Dependencies

```json
{
  "@types/react": "~19.1.10",
  "typescript": "~5.9.2",
  "babel-preset-expo": "^54.0.7",
  "eslint": "^8.57.1",
  "prettier": "^3.6.2"
}
```

## Babel Configuration

**File:** `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
        },
      ],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Key Points:**

- `babel-preset-expo` automatically handles Reanimated v3 plugin configuration
- No manual worklets configuration needed
- Nativewind integration via jsxImportSource and preset

## Installation Instructions

### Clean Installation (Recommended)

```bash
# 1. Clean existing installation
rm -rf node_modules package-lock.json .expo

# 2. Remove any legacy workaround files
rm -f .npmrc
rm -rf scripts/setup-worklets-stub.js

# 3. Install dependencies (no flags needed!)
npm install

# 4. Start with clean cache
npx expo start -c
```

### From Scratch

```bash
# Initialize new Expo project with SDK 54
npx create-expo-app@latest my-app

# Update package.json with the versions above

# Install dependencies
npm install

# Start development
npx expo start
```

## What NOT to Do

❌ **Do NOT use `--legacy-peer-deps`** - Not needed with correct versions
❌ **Do NOT use `.npmrc` with legacy-peer-deps=true** - Causes issues
❌ **Do NOT install react-native-worklets-core** - Wrong package for SDK 54
❌ **Do NOT use React 18.x** - SDK 54 requires React 19.1.0
❌ **Do NOT create postinstall workaround scripts** - Not needed

## Expected Warnings (Safe to Ignore)

### 1. Simctl Warning (macOS without Xcode)

```
Unable to run simctl:
Error: xcrun simctl help exited with non-zero code: 72
```

**Why:** Xcode is not installed
**Impact:** None if using Expo Go on physical device or web
**Fix (optional):** Install Xcode from Mac App Store

### 2. Reanimated Version Warning

```
react-native-reanimated@3.15.0 - expected version: ~4.1.1
```

**Why:** Nativewind doesn't support Reanimated v4 yet
**Impact:** None - v3 works perfectly with Nativewind
**Action:** Ignore until Nativewind supports v4

### 3. SafeAreaView Deprecation

```
SafeAreaView has been deprecated
```

**Why:** Old React Native component
**Impact:** None - we use react-native-safe-area-context
**Action:** Ignore (already using the correct package)

## Troubleshooting

### Metro Bundler Fails

```bash
# Clear all caches
npx expo start -c
```

### Module Resolution Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors After Update

```bash
# Regenerate types
npm run typecheck
```

## Version Compatibility Matrix

| Package      | Version  | Requirement     |
| ------------ | -------- | --------------- |
| Node.js      | 20.19.x+ | Minimum         |
| Xcode        | 16.1+    | iOS development |
| Expo CLI     | Latest   | Auto-updated    |
| React        | 19.1.0   | Exact           |
| React Native | 0.81.5   | SDK 54          |

## Key Features Supported

✅ Expo Router (file-based routing)
✅ Nativewind v4 (Tailwind CSS)
✅ Supabase (backend & auth)
✅ TypeScript
✅ Reanimated v3 animations
✅ Safe area handling
✅ Vector icons (Lucide)
✅ Expo Go compatibility

## Verification Checklist

After installation, verify:

- [ ] Metro bundler starts without errors
- [ ] App loads in Expo Go
- [ ] No red error screens
- [ ] TypeScript compilation passes (`npm run typecheck`)
- [ ] Sign In screen displays correctly

## Additional Notes

- This configuration uses **Expo Go** workflow (not custom dev client)
- All packages installed via `npm install` without flags
- No native module linking required
- Hot reload works properly
- Fast refresh enabled by default

## References

- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)
- [Expo SDK 54 Upgrade Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Nativewind Documentation](https://www.nativewind.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)

---

**Status:** This configuration is production-ready and actively used in the WhoseHouse app.
