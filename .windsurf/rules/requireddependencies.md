---
trigger: model_decision
description: When you need to reference tools or what the app uses. Override when you have high confidence that there are better options
---

# 1. Install Tailwind CSS & Nativewind

npm install nativewind
npm install --save-dev tailwindcss
npx tailwindcss init

# 2. Configure tailwind.config.js

# (Set content to: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"])

# (Add plugin: require("nativewind/babel"))

# 3. Install Shadcn dependencies

npm install tailwind-merge clsx
npm install class-variance-authority

# 4. Install Shadcn React Native

npm install shadcn-ui-react-native

Backend & Auth (Supabase)
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage

Navigation
npm install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants

Testing
npm install --save-dev jest jest-expo @testing-library/react-native

Tasks (package.json scripts)
"scripts": {
"start": "expo start",
"android": "expo start --android",
"ios": "expo start --ios",
"web": "expo start --web",
"test": "jest"
}
