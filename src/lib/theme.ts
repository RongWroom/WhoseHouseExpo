/**
 * Theme constants for WhoseHouse app
 * Defines role-based colors, spacing, and accessibility defaults
 */

export const THEME = {
  // Role-based color schemes
  roles: {
    socialWorker: {
      primary: '#007AFF',
      light: '#dbeafe',
      dark: '#004fa3',
    },
    fosterCarer: {
      primary: '#34C759',
      light: '#dcfce7',
      dark: '#166534',
    },
    child: {
      primary: '#4CAF50',
      light: '#E8F5E9',
      dark: '#2E7D32',
    },
  },

  // Semantic colors
  colors: {
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
    muted: '#6b7280',
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      inverse: '#ffffff',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
    },
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
