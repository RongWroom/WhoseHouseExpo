/**
 * Type definitions for Supabase RPC functions
 * These types ensure type safety when calling database functions
 */

// Device information for audit logging
export interface DeviceInfo {
  platform: 'mobile' | 'web' | 'ios' | 'android';
  timestamp: string;
  userAgent?: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  ipAddress?: string;
}

// Token generation response
export interface TokenGenerationResponse {
  token: string;
  token_id: string;
  expires_at: string;
  access_url: string;
  case_id: string;
}

// Token validation response
export interface TokenValidationResponse {
  case_id: string;
  social_worker_id: string;
  social_worker_name: string;
  social_worker_email: string;
  case_number: string;
  child_name: string;
  expires_at: string;
  valid: boolean;
}

// Message sending response
export interface MessageSendResponse {
  message_id: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'failed';
}

// User permissions response
export interface UserPermissionsResponse {
  can_view_cases: boolean;
  can_manage_cases: boolean;
  can_generate_tokens: boolean;
  can_send_messages: boolean;
  organization_id?: string;
  role: 'social_worker' | 'foster_carer' | 'admin';
}

// RPC function parameters
export interface GenerateTokenParams {
  p_case_id: string;
  p_expires_in_hours?: number;
}

export interface ValidateTokenParams {
  p_token: string;
  p_device_info: DeviceInfo;
}

export interface SendChildMessageParams {
  p_token: string;
  p_content: string;
}

// Error types for better error handling
export enum SupabaseErrorCode {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class SupabaseError extends Error {
  constructor(
    public code: SupabaseErrorCode,
    message: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}
