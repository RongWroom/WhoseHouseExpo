# UI Component Guide

**WhoseHouse Design System** - Accessibility-first, role-based component library

## Overview

This design system provides a comprehensive set of UI components built with:

- **Nativewind v4** (Tailwind CSS for React Native)
- **Accessibility defaults** (WCAG AA compliant)
- **Role-based theming** (Social Worker, Foster Carer, Child)
- **TypeScript** for type safety

---

## Theme System

### Role-Based Colors

```typescript
import { THEME, getRoleTheme } from '@/lib/theme';

// Get role-specific colors
const socialWorkerTheme = getRoleTheme('social_worker'); // { primary: '#007AFF', ... }
const fosterCarerTheme = getRoleTheme('foster_carer'); // { primary: '#34C759', ... }
const childTheme = getRoleTheme('child'); // { primary: '#4CAF50', ... }
```

### Tailwind Classes

```tsx
// Social Worker blue
<View className="bg-social-worker-500" />

// Foster Carer green
<View className="bg-foster-carer-500" />

// Child friendly green
<View className="bg-child-500" />
```

---

## Core Components

### Text

Typography component with semantic variants.

```tsx
import { Text } from '@/components/ui';

<Text variant="h1" weight="bold">Heading 1</Text>
<Text variant="h2" weight="semibold">Heading 2</Text>
<Text variant="h3">Heading 3</Text>
<Text variant="body">Body text</Text>
<Text variant="caption" color="muted">Small text</Text>
<Text variant="label">LABEL TEXT</Text>
```

**Props:**

- `variant`: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label'
- `weight`: 'normal' | 'medium' | 'semibold' | 'bold'
- `color`: 'default' | 'muted' | 'primary' | 'success' | 'danger'

---

### Button

Accessible button with loading states and variants.

```tsx
import { Button } from '@/components/ui';

<Button onPress={handlePress}>Primary Button</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button size="lg" loading>Large Loading</Button>
```

**Props:**

- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `disabled`: boolean

**Accessibility:**

- Minimum touch target: 44x44 (meets iOS & Android guidelines)
- Loading state shows accessible ActivityIndicator

---

### Card

Container component for grouped content.

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>
      <Text variant="h3" weight="semibold">
        Card Title
      </Text>
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Text>Card content goes here</Text>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

**Variants:**

- `default`: White background
- `elevated`: With shadow
- `outlined`: With border

---

### Input

Form input with label, error, and helper text.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email Address"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  autoCapitalize="none"
  keyboardType="email-address"
/>

<Input
  label="Password"
  error="Password must be at least 8 characters"
  secureTextEntry
/>

<Input
  label="Username"
  helperText="Choose a unique username"
/>
```

**Props:**

- `label`: string
- `error`: string (shows error styling)
- `helperText`: string (shows hint text)
- All standard TextInput props

---

### Badge

Small status or category indicator.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Urgent</Badge>
```

**Variants:** default | primary | success | warning | danger

---

## Layout Components

### Screen

Base container for all screens with safe area handling.

```tsx
import { Screen } from '@/components/ui';

// Simple screen
<Screen>
  <Text>Content</Text>
</Screen>

// Scrollable screen
<Screen scroll>
  <Text>Long content that scrolls...</Text>
</Screen>

// Form screen with keyboard avoidance
<Screen keyboardAvoiding scroll>
  <Input label="Name" />
  <Input label="Email" />
  <Button>Submit</Button>
</Screen>

// Custom background
<Screen backgroundColor="bg-gray-50">
  <Text>Custom background</Text>
</Screen>
```

**Props:**

- `scroll`: boolean (makes content scrollable)
- `keyboardAvoiding`: boolean (avoids keyboard on forms)
- `safeArea`: boolean (default: true)
- `backgroundColor`: string (Tailwind class)

---

### Container

Standard content padding wrapper.

```tsx
import { Container } from '@/components/ui';

<Container>
  <Text>Padded content</Text>
</Container>;
```

---

### Section

Content section with optional title.

```tsx
import { Section } from '@/components/ui';

<Section title={<Text variant="h3">Section Title</Text>}>
  <Text>Section content</Text>
</Section>;
```

---

## Feedback Components

### LoadingSpinner

Loading indicator with optional message.

```tsx
import { LoadingSpinner } from '@/components/ui';

<LoadingSpinner />
<LoadingSpinner size="small" />
<LoadingSpinner message="Loading cases..." />
<LoadingSpinner color="#34C759" message="Saving..." />
```

**Props:**

- `size`: 'small' | 'large'
- `color`: string (hex color)
- `message`: string
- `centered`: boolean (default: true)

---

### EmptyState

Display when lists or views are empty.

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
  icon={<InboxIcon size={48} color="#9CA3AF" />}
  title="No messages yet"
  description="When you receive messages, they'll appear here"
  actionLabel="Start a conversation"
  onAction={handleNewMessage}
/>;
```

**Props:**

- `icon`: ReactNode
- `title`: string (required)
- `description`: string
- `actionLabel`: string
- `onAction`: () => void

---

### Alert

Informational messages and notifications.

```tsx
import { Alert } from '@/components/ui';

<Alert
  variant="info"
  title="Important Update"
  message="New features are now available"
/>

<Alert
  variant="success"
  message="Profile updated successfully"
/>

<Alert
  variant="warning"
  title="Action Required"
  message="Please complete your profile"
  icon={<AlertIcon />}
/>

<Alert
  variant="danger"
  message="Failed to save changes"
/>
```

**Variants:** info | success | warning | danger

---

## Utility Components

### Avatar

User profile picture or initials.

```tsx
import { Avatar } from '@/components/ui';

<Avatar
  source={{ uri: 'https://example.com/avatar.jpg' }}
  size="lg"
/>

<Avatar
  initials="SW"
  size="md"
  backgroundColor="bg-social-worker-500"
/>
```

**Props:**

- `source`: ImageSourcePropType
- `initials`: string (fallback when no image)
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `backgroundColor`: string (Tailwind class)

---

### Divider

Visual separator.

```tsx
import { Divider } from '@/components/ui';

<Divider />
<Divider orientation="vertical" />
<Divider spacing="lg" />
```

**Props:**

- `orientation`: 'horizontal' | 'vertical'
- `spacing`: 'none' | 'sm' | 'md' | 'lg'

---

## Accessibility Features

### Touch Targets

All interactive components meet minimum touch target sizes:

- iOS: 44x44 points
- Android: 48x48 dp
- Configured in `tailwind.config.js` as `min-touch` utilities

### Color Contrast

All color combinations meet WCAG AA standards:

- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio

### Screen Readers

Components include proper accessibility props:

- `accessibilityLabel`
- `accessibilityHint`
- `accessibilityRole`
- `role` attributes for web

### Keyboard Navigation

Forms support proper tab order and keyboard submission.

---

## Usage Examples

### Social Worker Dashboard

```tsx
import {
  Screen,
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Text,
  Badge,
  Button,
} from '@/components/ui';

export default function SocialWorkerDashboard() {
  return (
    <Screen scroll backgroundColor="bg-gray-50">
      <Container className="py-lg">
        <Text variant="h2" weight="bold" className="mb-md">
          Dashboard
        </Text>

        <Card variant="elevated" className="mb-md">
          <CardHeader>
            <CardTitle>
              <View className="flex-row items-center justify-between">
                <Text variant="h3" weight="semibold">
                  Active Cases
                </Text>
                <Badge variant="primary">12</Badge>
              </View>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text color="muted">You have 3 urgent messages</Text>
          </CardContent>
        </Card>

        <Button variant="primary" className="bg-social-worker-500">
          View All Cases
        </Button>
      </Container>
    </Screen>
  );
}
```

### Foster Carer Login Form

```tsx
import { Screen, Container, Input, Button, Alert, Text } from '@/components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <Screen keyboardAvoiding scroll>
      <Container className="py-xl">
        <Text variant="h1" weight="bold" className="mb-lg text-center">
          Welcome Back
        </Text>

        {error && <Alert variant="danger" message={error} className="mb-md" />}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-md"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="mb-lg"
        />

        <Button variant="primary" className="bg-foster-carer-500" onPress={handleLogin}>
          Sign In
        </Button>
      </Container>
    </Screen>
  );
}
```

---

## Best Practices

### 1. Use Semantic Colors

```tsx
// ✅ Good - uses role-based colors
<Button className="bg-social-worker-500">Social Worker Action</Button>
<Button className="bg-foster-carer-500">Foster Carer Action</Button>

// ❌ Avoid - hardcoded colors
<Button className="bg-blue-600">Action</Button>
```

### 2. Always Include Labels

```tsx
// ✅ Good
<Input label="Email Address" />

// ❌ Avoid
<Input placeholder="Email" /> // No label for screen readers
```

### 3. Use Proper Hierarchy

```tsx
// ✅ Good
<Text variant="h2">Page Title</Text>
<Text variant="h3">Section Title</Text>
<Text variant="body">Content</Text>

// ❌ Avoid
<Text className="text-2xl">Title</Text> // No semantic meaning
```

### 4. Provide Empty States

```tsx
// ✅ Good
{
  messages.length === 0 ? (
    <EmptyState title="No messages" description="Start a conversation" />
  ) : (
    <MessageList messages={messages} />
  );
}

// ❌ Avoid
{
  messages.length > 0 && <MessageList messages={messages} />;
}
// Leaves blank screen if empty
```

### 5. Handle Loading States

```tsx
// ✅ Good
{
  loading ? <LoadingSpinner message="Loading cases..." /> : <CaseList cases={cases} />;
}

// ❌ Avoid
{
  !loading && <CaseList cases={cases} />;
}
// Leaves blank screen while loading
```

---

## Component Checklist

When creating new screens:

- [ ] Use `Screen` component for safe areas
- [ ] Add proper loading states with `LoadingSpinner`
- [ ] Include `EmptyState` for empty lists
- [ ] Use semantic `Text` variants for hierarchy
- [ ] Apply role-based colors from theme
- [ ] Ensure all interactive elements meet minimum touch targets
- [ ] Add labels to all form inputs
- [ ] Handle error states with `Alert` component
- [ ] Test with screen reader enabled
- [ ] Verify color contrast meets WCAG AA

---

## Resources

- **Tailwind Config**: `/tailwind.config.js`
- **Theme Constants**: `/src/lib/theme.ts`
- **Component Source**: `/src/components/ui/`
- **PRD Reference**: `/MEMORY/whosehouseprd.md`

For questions or additions to the design system, refer to the PRD requirements or discuss with the team.
