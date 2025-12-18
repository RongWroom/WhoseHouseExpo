/**
 * Device information collection utilities
 * Gathers comprehensive device info for security auditing
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DeviceInfo } from '../types/supabase-functions';

// Note: expo-device package has dependency conflicts
// Using basic device detection until resolved

/**
 * Gets comprehensive device information for audit logging
 * @returns DeviceInfo object with all available device details
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {
    platform: Platform.OS as 'ios' | 'android' | 'web',
    timestamp: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version || 'unknown',
    osVersion: Platform.Version?.toString() || 'unknown',
  };

  try {
    // Basic device information without expo-device
    const deviceType = getDeviceType();
    deviceInfo.deviceModel = `${Platform.OS} ${deviceType}`;
    deviceInfo.osVersion = `${Platform.OS} ${Platform.Version}`;

    // Get user agent if in web environment
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      deviceInfo.userAgent = navigator.userAgent;
    }

    // Add app-specific information
    const appInfo = {
      sdkVersion: Constants.expoConfig?.sdkVersion || 'Unknown',
      appOwnership: Constants.appOwnership || 'Unknown',
      debugMode: __DEV__ ? 'true' : 'false',
      expoVersion: Constants.expoVersion || 'Unknown',
    };

    // Add app info to user agent string for better tracking
    deviceInfo.userAgent = deviceInfo.userAgent
      ? `${deviceInfo.userAgent} WhoseHouse/${deviceInfo.appVersion}`
      : `WhoseHouse/${deviceInfo.appVersion} (${Platform.OS}; SDK ${appInfo.sdkVersion})`;
  } catch (error) {
    console.warn('Error collecting device info:', error);
    // Continue with basic info if detailed collection fails
  }

  return deviceInfo;
}

/**
 * Determines the type of device
 * @returns Device type string
 */
function getDeviceType(): string {
  // Return a default value for now since async is complex here
  // In a real implementation, this would be handled differently
  if (Platform.OS === 'ios') {
    return (Platform as any).isPad ? 'Tablet' : 'Phone';
  }
  if (Platform.OS === 'android') {
    // Android tablets detection would require more complex logic
    return 'Phone';
  }
  return Platform.OS === 'web' ? 'Desktop' : 'Unknown';
}

/**
 * Gets a unique device identifier (for tracking, not for identification)
 * This should be used carefully and in compliance with privacy policies
 * @returns A pseudo-anonymous device identifier
 */
export async function getDeviceIdentifier(): Promise<string> {
  try {
    // Use installation ID which persists until app is uninstalled
    const installationId = Constants.sessionId || 'unknown';

    // Create a hash combining various device properties for better uniqueness
    const deviceString = `${Platform.OS}-${Platform.Version}-${installationId}`;

    // Simple hash function for consistency
    let hash = 0;
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      hash = (hash << 5) - hash + char;
      // eslint-disable-next-line no-bitwise
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `device_${Math.abs(hash).toString(36)}`;
  } catch (error) {
    console.warn('Error generating device identifier:', error);
    return 'device_unknown';
  }
}

/**
 * Checks if the device has biometric authentication available
 * @returns Boolean indicating biometric availability
 */
export async function hasBiometricAuth(): Promise<boolean> {
  // This would need expo-local-authentication package
  // For now, return false as it's not implemented
  return Promise.resolve(false);
}

/**
 * Gets network connection information
 * @returns Network info object
 */
export async function getNetworkInfo(): Promise<{
  isConnected: boolean;
  connectionType?: string;
}> {
  // This would need @react-native-community/netinfo package
  // For now, return basic info
  return Promise.resolve({
    isConnected: true,
    connectionType: 'unknown',
  });
}
