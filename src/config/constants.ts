/**
 * Application constants and configuration
 * Centralized configuration for the WhoseHouse app
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// App configuration from expo config
const APP_CONFIG = Constants.expoConfig;

// Deep link configuration
export const DEEP_LINK_CONFIG = {
  scheme: APP_CONFIG?.scheme || 'whosehouseapp',
  childAccessPath: 'child/access',
  getChildAccessUrl: (token: string) =>
    `${APP_CONFIG?.scheme || 'whosehouseapp'}://child/access/${token}`,
} as const;

// Token expiry options
export const TOKEN_EXPIRY_OPTIONS = {
  SHORT: { hours: 24, label: '24 Hours' },
  MEDIUM: { hours: 72, label: '72 Hours' },
  LONG: { hours: 168, label: '1 Week' },
} as const;

// API retry configuration
export const API_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
  backoffMultiplier: 2,
} as const;

// Input validation rules
export const VALIDATION_RULES = {
  message: {
    minLength: 1,
    maxLength: 5000,
  },
  token: {
    pattern: /^[a-zA-Z0-9-_]+$/,
    minLength: 32,
    maxLength: 128,
  },
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  tokenRefreshInterval: 3600000, // 1 hour in milliseconds
  sessionTimeout: 86400000, // 24 hours in milliseconds
  maxLoginAttempts: 5,
  lockoutDuration: 900000, // 15 minutes in milliseconds
} as const;

// Platform-specific configuration
export const PLATFORM_CONFIG = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  osVersion: Platform.Version,
  deviceInfo: {
    platform: Platform.OS,
    version: Platform.Version,
    isTV: Platform.isTV,
    isPad: Platform.OS === 'ios' && (Platform as any).isPad === true,
  },
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  enableQRCodeSharing: true,
  enablePushNotifications: false,
  enableOfflineMode: true,
  enableBiometricAuth: false,
  enableAnalytics: false,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to connect. Please check your internet connection.',
  TOKEN_EXPIRED: 'Your access has expired. Please request a new access code.',
  TOKEN_INVALID: 'Invalid access code. Please check and try again.',
  UNAUTHORIZED: 'You do not have permission to perform this action.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
} as const;
