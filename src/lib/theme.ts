/**
 * Theme constants for WhoseHouse app
 * Defines role-based colors, spacing, and accessibility defaults
 *
 * COLOR USAGE GUIDELINES:
 * ─────────────────────────────────────────────────────────────
 *
 * ROLE COLORS (use for role-specific UI elements):
 * - socialWorker: Blue (#007AFF) - Social worker interfaces, avatars, buttons
 * - fosterCarer: Green (#34C759) - Foster carer interfaces, avatars, buttons
 * - child: Teal (#14B8A6) - Child interfaces (softer, friendlier)
 *
 * SEMANTIC COLORS (use for meaning/status):
 * - primary: Main brand/action color (teal-green)
 * - accent: Highlight/emphasis color (warm amber - replaces bright yellow)
 * - success: Positive actions, confirmations
 * - warning: Caution states
 * - danger: Errors, destructive actions
 *
 * NEUTRAL COLORS (use for structure):
 * - surface: Card/container backgrounds
 * - background: Page backgrounds
 * - border: Dividers, outlines
 * - text: Primary, secondary, muted text
 *
 * ─────────────────────────────────────────────────────────────
 */

export const THEME = {
  // Role-based color schemes
  roles: {
    socialWorker: {
      primary: '#007AFF',
      light: '#EFF6FF',
      medium: '#BFDBFE',
      dark: '#1D4ED8',
    },
    fosterCarer: {
      primary: '#34C759',
      light: '#F0FDF4',
      medium: '#BBF7D0',
      dark: '#166534',
    },
    child: {
      primary: '#14B8A6', // Teal - softer than harsh green
      light: '#F0FDFA',
      medium: '#99F6E4',
      dark: '#0F766E',
    },
  },

  // Primary brand colors
  colors: {
    // Main action color (teal-green, harmonious with role colors)
    primary: '#0D9488',
    onPrimary: '#FFFFFF',
    primaryLight: '#CCFBF1',

    // Accent color (warm amber - replaces clashing yellow)
    accent: '#F59E0B',
    onAccent: '#FFFFFF',
    accentLight: '#FEF3C7',
    accentMuted: '#D97706',

    // Semantic status colors
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',

    // Text colors
    text: {
      primary: '#111827', // Near black - main content
      secondary: '#4B5563', // Dark gray - supporting text
      muted: '#9CA3AF', // Medium gray - hints, placeholders
      inverse: '#FFFFFF', // White - on dark backgrounds
    },

    // Background colors
    background: {
      primary: '#FFFFFF', // White - main surfaces
      secondary: '#F9FAFB', // Off-white - page backgrounds
      tertiary: '#F3F4F6', // Light gray - nested containers
      warm: '#FEFDFB', // Warm white - softer pages
    },

    // Surface colors (cards, containers)
    surface: {
      primary: '#FFFFFF',
      elevated: '#FFFFFF',
      muted: '#F9FAFB',
    },

    // Border colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderDark: '#D1D5DB',
  },

  // Spacing scale (in px)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  },

  // Accessibility - minimum touch target sizes
  accessibility: {
    minTouchTarget: 44, // iOS minimum (44x44), Android is 48x48
    fontSize: {
      min: 14, // Minimum readable font size
      body: 16,
      heading: 20,
    },
    contrast: {
      normal: 4.5, // WCAG AA for normal text
      large: 3, // WCAG AA for large text (18pt+ or 14pt+ bold)
    },
  },

  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;

/**
 * Get role-based theme colors
 */
export function getRoleTheme(role: 'social_worker' | 'foster_carer' | 'child') {
  const themeMap = {
    social_worker: THEME.roles.socialWorker,
    foster_carer: THEME.roles.fosterCarer,
    child: THEME.roles.child,
  };
  return themeMap[role];
}
