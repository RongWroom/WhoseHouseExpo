# WhoseHouse Color System

A consistent color guide for the WhoseHouse app. All colors are defined in `src/lib/theme.ts` and `tailwind.config.js`.

## Quick Reference

| Purpose              | Tailwind Class      | Theme Reference                    | Hex       |
| -------------------- | ------------------- | ---------------------------------- | --------- |
| **Social Worker**    | `social-worker-500` | `THEME.roles.socialWorker.primary` | `#007AFF` |
| **Foster Carer**     | `foster-carer-500`  | `THEME.roles.fosterCarer.primary`  | `#34C759` |
| **Child**            | `child-500`         | `THEME.roles.child.primary`        | `#14B8A6` |
| **Primary Action**   | `brand-500`         | `THEME.colors.primary`             | `#0D9488` |
| **Accent/Highlight** | `accent-500`        | `THEME.colors.accent`              | `#F59E0B` |
| **Success**          | `success-500`       | `THEME.colors.success`             | `#22C55E` |
| **Warning**          | `warning-500`       | `THEME.colors.warning`             | `#F59E0B` |
| **Danger**           | `danger-500`        | `THEME.colors.danger`              | `#EF4444` |
| **Info**             | `info-500`          | `THEME.colors.info`                | `#3B82F6` |

---

## When to Use Each Color

### Role Colors

Use for elements that identify or belong to a specific user role.

```tsx
// Social Worker elements (blue)
<Avatar backgroundColor="bg-social-worker-500" />
<Button style={{ backgroundColor: THEME.roles.socialWorker.primary }} />

// Foster Carer elements (green)
<Avatar backgroundColor="bg-foster-carer-500" />
<View className="bg-foster-carer-100" /> // Light background

// Child elements (teal)
<Avatar backgroundColor="bg-child-500" />
```

### Semantic Colors

Use for status indicators and meaningful actions.

```tsx
// Success - confirmations, completed states
<Icon color={THEME.colors.success} />
<View className="bg-success-100" /> // Light success background

// Warning - caution, pending states
<Icon color={THEME.colors.warning} />
<View className="bg-warning-100" />

// Danger - errors, destructive actions
<Icon color={THEME.colors.danger} />
<View className="bg-danger-100" />

// Info - informational, calendar, links
<Icon color={THEME.colors.info} />
<View className="bg-info-100" />
```

### Accent Color (Warm Amber)

Use for highlights, badges, and emphasis elements that need to stand out without being a role color.

```tsx
// Accent highlights
<Icon color={THEME.colors.accent} />
<Icon color={THEME.colors.accentMuted} /> // Darker variant
<View className="bg-accent-100" /> // Light amber background
```

### Text Colors

```tsx
// Primary text - main content
style={{ color: THEME.colors.text.primary }}  // #111827

// Secondary text - supporting content, labels
style={{ color: THEME.colors.text.secondary }}  // #4B5563

// Muted text - hints, placeholders
style={{ color: THEME.colors.text.muted }}  // #9CA3AF

// Inverse text - on dark backgrounds
style={{ color: THEME.colors.text.inverse }}  // #FFFFFF
```

### Background & Surface Colors

```tsx
// Page backgrounds
<Screen backgroundColor="bg-gray-50" />  // Standard
className="bg-surface-muted"  // Muted surface

// Card surfaces
style={{ backgroundColor: THEME.colors.surface.primary }}
```

---

## Do's and Don'ts

### ✅ DO

- Use `THEME.colors.*` for inline styles
- Use Tailwind classes like `bg-accent-100` for backgrounds
- Keep icon colors consistent with their container backgrounds
- Use light variants (`-100`) for backgrounds, primary (`-500`) for icons

### ❌ DON'T

- Use hardcoded hex colors like `#F9F506` or `#181811`
- Mix unrelated colors (e.g., bright yellow with green)
- Use role colors for non-role-related UI elements
- Use `bg-yellow-*` - use `bg-accent-*` instead

---

## Common Patterns

### Activity Rows with Icons

```tsx
// Success activity
icon={<CheckCircle2 color={THEME.colors.success} />}
iconContainerClassName="bg-success-100"

// Messages/notifications
icon={<MessageCircle color={THEME.colors.accent} />}
iconContainerClassName="bg-accent-100"

// Calendar/info
icon={<Calendar color={THEME.colors.info} />}
iconContainerClassName="bg-info-100"
```

### Action Tiles

```tsx
// Primary action (uses accent)
iconContainerClassName="bg-accent-100"
icon={<Icon color={THEME.colors.accentMuted} />}

// Secondary action (uses info)
iconContainerClassName="bg-info-100"
icon={<Icon color={THEME.colors.info} />}
```

---

## Files to Update

When adding new colors or modifying the palette:

1. `src/lib/theme.ts` - TypeScript theme constants
2. `tailwind.config.js` - Tailwind color definitions

Keep both files in sync!
