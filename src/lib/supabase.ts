import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import {
  TokenGenerationResponse,
  TokenValidationResponse,
  MessageSendResponse,
  UserPermissionsResponse,
  GenerateTokenParams,
  ValidateTokenParams,
  SendChildMessageParams,
  SupabaseError,
  SupabaseErrorCode,
} from '../types/supabase-functions';
import { getDeviceInfo } from '../utils/device-info';
import { validateToken, sanitizeInput } from '../utils/validation';
import { DEEP_LINK_CONFIG, API_RETRY_CONFIG } from '../config/constants';
import Constants from 'expo-constants';

// Get environment variables
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with AsyncStorage for React Native
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Debug logging for development
if (__DEV__) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth Event:', event);
    if (session?.user) {
      console.log('👤 User:', session.user.email, '| Role:', session.user.user_metadata?.role);
    }
  });
}

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  console.log('🔑 Attempting sign in for:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign in error:', error.message);
  } else if (data.user) {
    console.log('✅ Sign in successful:', data.user.email);
    // Update last login
    await supabase.rpc('update_last_login');
  }

  return { data, error };
};

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  role: 'social_worker' | 'foster_carer' | 'admin',
  organizationId?: string,
  householdName?: string,
) => {
  console.log('📝 Attempting sign up for:', email, '| Role:', role);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        organization_id: organizationId,
        household_name: householdName,
      },
    },
  });

  if (error) {
    console.error('❌ Sign up error:', error.message);
  } else if (data.user) {
    console.log('✅ Sign up successful:', data.user.email);
    console.log('📧 Email confirmation required:', !data.session);

    // If foster carer with household name, create the household
    if (role === 'foster_carer' && householdName && data.session) {
      try {
        const { error: householdError } = await supabase.rpc('create_household_for_carer', {
          p_user_id: data.user.id,
          p_household_name: householdName,
        } as any);
        if (householdError) {
          console.error('⚠️ Failed to create household:', householdError.message);
        } else {
          console.log('🏠 Household created:', householdName);
        }
      } catch (err) {
        console.error('⚠️ Household creation error:', err);
      }
    }
  }

  return { data, error };
};

export const signOut = async () => {
  // Log the logout action
  await supabase.rpc('handle_logout');

  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null, error };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile, error: profileError };
};

export const getUserPermissions = async (): Promise<{
  permissions: UserPermissionsResponse | null;
  error: any;
}> => {
  const { data, error } = await supabase.rpc('get_user_permissions');
  return { permissions: data as UserPermissionsResponse | null, error };
};

// Child access token functions with retry logic
export const generateChildAccessToken = async (
  caseId: string,
  expiresInHours: number = 24,
): Promise<{
  data: TokenGenerationResponse | null;
  error: SupabaseError | null;
}> => {
  const params: GenerateTokenParams = {
    p_case_id: caseId,
    p_expires_in_hours: expiresInHours,
  };

  let retries = 0;
  let lastError: any = null;

  while (retries < API_RETRY_CONFIG.maxRetries) {
    try {
      const { data, error } = await supabase.rpc('generate_child_access_token', params as any);

      if (error) {
        lastError = error;
        retries++;
        if (retries < API_RETRY_CONFIG.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              API_RETRY_CONFIG.retryDelay *
                Math.pow(API_RETRY_CONFIG.backoffMultiplier, retries - 1),
            ),
          );
          continue;
        }
      }

      if (data) {
        const tokenData = data as TokenGenerationResponse;
        // Add the deep link URL using the configured scheme
        return {
          data: {
            ...tokenData,
            access_url: DEEP_LINK_CONFIG.getChildAccessUrl(tokenData.token),
          },
          error: null,
        };
      }
    } catch (error) {
      lastError = error;
      retries++;
      if (retries < API_RETRY_CONFIG.maxRetries) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            API_RETRY_CONFIG.retryDelay * Math.pow(API_RETRY_CONFIG.backoffMultiplier, retries - 1),
          ),
        );
        continue;
      }
    }
  }

  return {
    data: null,
    error: new SupabaseError(
      SupabaseErrorCode.NETWORK_ERROR,
      'Failed to generate access token after multiple attempts',
      lastError,
    ),
  };
};

export const validateChildToken = async (
  token: string,
): Promise<{
  data: TokenValidationResponse | null;
  error: SupabaseError | null;
}> => {
  // Validate token format first
  const validation = validateToken(token);
  if (!validation.isValid) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.VALIDATION_ERROR,
        validation.error || 'Invalid token format',
      ),
    };
  }

  // Get comprehensive device info for audit logging
  const deviceInfo = await getDeviceInfo();

  const params: ValidateTokenParams = {
    p_token: token,
    p_device_info: deviceInfo,
  };

  try {
    const { data, error } = await supabase.rpc('use_child_access_token', params as any);

    if (error) {
      // Check for specific error types
      if (error.message?.includes('expired')) {
        return {
          data: null,
          error: new SupabaseError(SupabaseErrorCode.TOKEN_EXPIRED, 'Access token has expired'),
        };
      }
      if (error.message?.includes('invalid')) {
        return {
          data: null,
          error: new SupabaseError(SupabaseErrorCode.TOKEN_INVALID, 'Invalid access token'),
        };
      }
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.NETWORK_ERROR, error.message, error),
      };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.NETWORK_ERROR, 'Failed to validate token', error),
    };
  }
};

export const sendChildMessage = async (
  token: string,
  content: string,
): Promise<{
  data: MessageSendResponse | null;
  error: SupabaseError | null;
}> => {
  // Sanitize message content
  const sanitizedContent = sanitizeInput(content, 5000);
  if (!sanitizedContent) {
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.VALIDATION_ERROR, 'Message cannot be empty'),
    };
  }

  const params: SendChildMessageParams = {
    p_token: token,
    p_content: sanitizedContent,
  };

  try {
    const { data, error } = await supabase.rpc('send_child_message', params as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.NETWORK_ERROR, 'Failed to send message', error),
      };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.NETWORK_ERROR, 'Failed to send message', error),
    };
  }
};

// Real-time subscriptions
export const subscribeToMessages = (caseId: string, onMessage: (message: any) => void) => {
  const subscription = supabase
    .channel(`messages:${caseId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `case_id=eq.${caseId}`,
      },
      (payload) => {
        onMessage(payload.new);
      },
    )
    .subscribe();

  return subscription;
};

export const subscribeToCase = (caseId: string, onUpdate: (caseData: any) => void) => {
  const subscription = supabase
    .channel(`case:${caseId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'cases',
        filter: `id=eq.${caseId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      },
    )
    .subscribe();

  return subscription;
};

// Audit logging helper
export const logAction = async (
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, any> = {},
) => {
  const { error } = await supabase.rpc('log_audit_action', {
    p_action: action,
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_target_type: targetType,
    p_target_id: targetId,
    p_details: details,
  } as any);

  if (error) {
    console.error('Failed to log audit action:', error);
  }
};

// ============================================
// ADMIN MANAGEMENT FUNCTIONS
// ============================================

// Create a new user account (admin only)
export const createUserAccount = async (params: {
  email: string;
  fullName: string;
  role: 'social_worker' | 'foster_carer' | 'admin';
  organizationId: string;
  phoneNumber?: string;
}): Promise<{
  data: { userId: string; tempPassword?: string } | null;
  error: SupabaseError | null;
}> => {
  try {
    const sanitizedEmail = sanitizeInput(params.email);
    const sanitizedFullName = sanitizeInput(params.fullName);
    const sanitizedPhone = params.phoneNumber ? sanitizeInput(params.phoneNumber) : null;

    const { data, error } = await supabase.rpc('create_user_account', {
      p_email: sanitizedEmail,
      p_full_name: sanitizedFullName,
      p_role: params.role,
      p_organization_id: params.organizationId,
      p_phone_number: sanitizedPhone,
    } as any);

    if (error) {
      console.error('Failed to create user account:', error);
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.DATABASE_ERROR, 'Failed to create user', error),
      };
    }

    return { data: { userId: data }, error: null };
  } catch (error: any) {
    console.error('Error in createUserAccount:', error);
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to create user account',
        error,
      ),
    };
  }
};

// Deactivate a user account (admin only)
export const deactivateUserAccount = async (
  userId: string,
  reason?: string,
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const { error } = await supabase.rpc('deactivate_user_account', {
      p_user_id: userId,
      p_reason: reason,
    } as any);

    if (error) {
      console.error('Failed to deactivate user:', error);
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to deactivate user',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deactivateUserAccount:', error);
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to deactivate account',
        error,
      ),
    };
  }
};

// Reactivate a user account (admin only)
export const reactivateUserAccount = async (
  userId: string,
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const { error } = await supabase.rpc('reactivate_user_account', {
      p_user_id: userId,
    } as any);

    if (error) {
      console.error('Failed to reactivate user:', error);
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to reactivate user',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in reactivateUserAccount:', error);
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to reactivate account',
        error,
      ),
    };
  }
};

// Assign a social worker to a foster carer (admin only)
export const assignSocialWorkerToCarer = async (params: {
  socialWorkerId: string;
  fosterCarerId: string;
  caseNumber?: string;
}): Promise<{ data: { caseId: string } | null; error: SupabaseError | null }> => {
  try {
    const { data, error } = await supabase.rpc('assign_social_worker_to_carer', {
      p_social_worker_id: params.socialWorkerId,
      p_foster_carer_id: params.fosterCarerId,
      p_case_number: params.caseNumber,
    } as any);

    if (error) {
      console.error('Failed to create assignment:', error);
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to create assignment',
          error,
        ),
      };
    }

    return { data: { caseId: data }, error: null };
  } catch (error: any) {
    console.error('Error in assignSocialWorkerToCarer:', error);
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to assign users', error),
    };
  }
};

// Get organization statistics (admin only)
export const getOrganizationStats = async (): Promise<{
  data: {
    totalUsers: number;
    activeUsers: number;
    socialWorkers: number;
    fosterCarers: number;
    admins: number;
    activeCases: number;
    closedCases: number;
    messagesThisMonth: number;
  } | null;
  error: SupabaseError | null;
}> => {
  try {
    const { data, error } = (await supabase.rpc('get_organization_stats')) as any;

    if (error) {
      console.error('Failed to get organization stats:', error);
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to get statistics',
          error,
        ),
      };
    }

    const stats = data?.[0];
    if (!stats) {
      return { data: null, error: null };
    }

    return {
      data: {
        totalUsers: stats.total_users,
        activeUsers: stats.active_users,
        socialWorkers: stats.social_workers,
        fosterCarers: stats.foster_carers,
        admins: stats.admins,
        activeCases: stats.active_cases,
        closedCases: stats.closed_cases,
        messagesThisMonth: stats.messages_this_month,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Error in getOrganizationStats:', error);
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to fetch stats', error),
    };
  }
};

// List organization users (admin only)
export const listOrganizationUsers = async (params?: {
  roleFilter?: 'social_worker' | 'foster_carer' | 'admin';
  activeOnly?: boolean;
}): Promise<{
  data: Array<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    phoneNumber?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    activeCaseCount: number;
  }> | null;
  error: SupabaseError | null;
}> => {
  try {
    const { data, error } = await supabase.rpc('list_organization_users', {
      p_role_filter: params?.roleFilter,
      p_active_only: params?.activeOnly ?? true,
    } as any);

    if (error) {
      console.error('Failed to list organization users:', error);
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.DATABASE_ERROR, 'Failed to list users', error),
      };
    }

    return {
      data:
        (data as any[])?.map((user: any) => ({
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phoneNumber: user.phone_number,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          activeCaseCount: user.active_case_count,
        })) || [],
      error: null,
    };
  } catch (error: any) {
    console.error('Error in listOrganizationUsers:', error);
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to fetch users', error),
    };
  }
};

// Update user details (admin only)
export const updateUserDetails = async (params: {
  userId: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
}): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const sanitizedFullName = params.fullName ? sanitizeInput(params.fullName) : null;
    const sanitizedPhone = params.phoneNumber ? sanitizeInput(params.phoneNumber) : null;
    const sanitizedEmail = params.email ? sanitizeInput(params.email) : null;

    const { error } = await supabase.rpc('update_user_details', {
      p_user_id: params.userId,
      p_full_name: sanitizedFullName,
      p_phone_number: sanitizedPhone,
      p_email: sanitizedEmail,
    } as any);

    if (error) {
      console.error('Failed to update user details:', error);
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.DATABASE_ERROR, 'Failed to update user', error),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in updateUserDetails:', error);
    return {
      success: false,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to update details', error),
    };
  }
};

// ============================================
// HOUSEHOLD MANAGEMENT FUNCTIONS
// ============================================

export interface HouseholdMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_primary_carer: boolean;
  last_login: string | null;
}

export interface HouseholdInvitation {
  id: string;
  household_id: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
}

// Get household members
export const getHouseholdMembers = async (
  householdId: string,
): Promise<{ data: HouseholdMember[] | null; error: SupabaseError | null }> => {
  try {
    const { data, error } = await supabase.rpc('get_household_members', {
      p_household_id: householdId,
    } as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to get household members',
          error,
        ),
      };
    }

    return { data: data as HouseholdMember[], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to fetch household members',
        error,
      ),
    };
  }
};

// Invite a carer to household
export const inviteCarerToHousehold = async (
  email: string,
): Promise<{ data: { invitationId: string } | null; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { data, error } = await supabase.rpc('invite_carer_to_household', {
      p_inviter_id: user.id,
      p_email: sanitizeInput(email),
    } as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to send invitation',
          error,
        ),
      };
    }

    return { data: { invitationId: data }, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to send invitation', error),
    };
  }
};

// Accept household invitation
export const acceptHouseholdInvitation = async (
  invitationId: string,
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { error } = await supabase.rpc('accept_household_invitation', {
      p_user_id: user.id,
      p_invitation_id: invitationId,
    } as any);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to accept invitation',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to accept invitation',
        error,
      ),
    };
  }
};

// Get pending invitations for current user
export const getPendingInvitations = async (): Promise<{
  data: HouseholdInvitation[] | null;
  error: SupabaseError | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { data: profile } = (await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()) as { data: { email: string } | null; error: any };

    if (!profile?.email) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('household_invitations' as any)
      .select('*')
      .eq('email', profile.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to fetch invitations',
          error,
        ),
      };
    }

    return { data: data as HouseholdInvitation[], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to fetch invitations',
        error,
      ),
    };
  }
};

// Leave household (non-primary carer only)
export const leaveHousehold = async (): Promise<{
  success: boolean;
  error: SupabaseError | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { error } = await supabase.rpc('leave_household', {
      p_user_id: user.id,
    } as any);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to leave household',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to leave household', error),
    };
  }
};

// Transfer primary carer status
export const transferPrimaryCarer = async (
  newPrimaryId: string,
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { error } = await supabase.rpc('transfer_primary_carer', {
      p_current_primary_id: user.id,
      p_new_primary_id: newPrimaryId,
    } as any);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to transfer primary status',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to transfer primary status',
        error,
      ),
    };
  }
};

// Get household info for current user
export const getMyHousehold = async (): Promise<{
  data: { id: string; name: string; members: HouseholdMember[] } | null;
  error: SupabaseError | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    // Get profile with household info
    const { data: profile, error: profileError } = (await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single()) as { data: { household_id: string | null } | null; error: any };

    if (profileError || !profile?.household_id) {
      return { data: null, error: null }; // No household yet
    }

    // Get household details
    const { data: household, error: householdError } = (await supabase
      .from('households' as any)
      .select('id, name')
      .eq('id', profile.household_id)
      .single()) as { data: { id: string; name: string } | null; error: any };

    if (householdError || !household) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to fetch household',
          householdError,
        ),
      };
    }

    // Get members
    const { data: members } = await getHouseholdMembers(household.id);

    return {
      data: {
        id: household.id,
        name: household.name,
        members: members || [],
      },
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to fetch household', error),
    };
  }
};

// Update household name (primary carer only)
export const updateHouseholdName = async (
  householdId: string,
  newName: string,
): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const sanitizedName = sanitizeInput(newName);
    if (!sanitizedName) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.VALIDATION_ERROR, 'Invalid household name'),
      };
    }

    const { error } = await (supabase.from('households' as any) as any)
      .update({ name: sanitizedName })
      .eq('id', householdId);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to update household name',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to update household name',
        error,
      ),
    };
  }
};

// ============================================
// CASE CREATION & PLACEMENT REQUEST FUNCTIONS
// ============================================

export type PlacementType = 'respite' | 'long_term' | 'emergency';
export type AvailabilityStatus = 'available' | 'away' | 'full';
export type PlacementRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface AvailableHousehold {
  household_id: string;
  household_name: string;
  total_bedrooms: number;
  available_beds: number;
  availability_status: AvailabilityStatus;
  allows_house_sharing: boolean;
  primary_carer_name: string;
  primary_carer_id: string;
  active_cases_count: number;
}

export interface PlacementRequest {
  request_id: string;
  case_number: string;
  placement_type: PlacementType;
  child_can_share: boolean;
  child_age_range: string | null;
  social_worker_name: string;
  message: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  created_at: string;
  expires_at: string;
}

export interface HouseholdCapacity {
  total_bedrooms: number;
  available_beds: number;
  availability_status: AvailabilityStatus;
  allows_house_sharing: boolean;
  away_from: string | null;
  away_until: string | null;
  availability_notes: string | null;
}

// Create a new case (social worker only)
export const createCase = async (params: {
  placementType?: PlacementType;
  childCanShare?: boolean;
  childAgeRange?: string;
  childGender?: string;
  internalNotes?: string;
  expectedEndDate?: string;
}): Promise<{ data: { caseId: string } | null; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { data, error } = await supabase.rpc('create_case', {
      p_social_worker_id: user.id,
      p_placement_type: params.placementType || 'long_term',
      p_child_can_share: params.childCanShare ?? true,
      p_child_age_range: params.childAgeRange || null,
      p_child_gender: params.childGender || null,
      p_internal_notes: params.internalNotes ? sanitizeInput(params.internalNotes) : null,
      p_expected_end_date: params.expectedEndDate || null,
    } as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to create case',
          error,
        ),
      };
    }

    return { data: { caseId: data }, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to create case', error),
    };
  }
};

// Search for available households
export const searchAvailableHouseholds = async (params: {
  childCanShare?: boolean;
  placementType?: PlacementType;
}): Promise<{ data: AvailableHousehold[] | null; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    // Get user's organization
    const { data: profile } = (await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()) as { data: { organization_id: string } | null; error: any };

    if (!profile?.organization_id) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.DATABASE_ERROR, 'User has no organization'),
      };
    }

    const { data, error } = await supabase.rpc('search_available_households', {
      p_organization_id: profile.organization_id,
      p_child_can_share: params.childCanShare ?? true,
      p_placement_type: params.placementType || 'long_term',
    } as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to search households',
          error,
        ),
      };
    }

    return { data: data as AvailableHousehold[], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to search households',
        error,
      ),
    };
  }
};

// Send a placement request
export const sendPlacementRequest = async (params: {
  caseId: string;
  householdId: string;
  message?: string;
  expectedStartDate?: string;
  expectedEndDate?: string;
}): Promise<{ data: { requestId: string } | null; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { data, error } = await supabase.rpc('send_placement_request', {
      p_social_worker_id: user.id,
      p_case_id: params.caseId,
      p_household_id: params.householdId,
      p_message: params.message ? sanitizeInput(params.message) : null,
      p_expected_start_date: params.expectedStartDate || null,
      p_expected_end_date: params.expectedEndDate || null,
    } as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to send placement request',
          error,
        ),
      };
    }

    return { data: { requestId: data }, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to send placement request',
        error,
      ),
    };
  }
};

// Respond to a placement request (foster carer)
export const respondToPlacementRequest = async (params: {
  requestId: string;
  accept: boolean;
  responseMessage?: string;
}): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { error } = await supabase.rpc('respond_to_placement_request', {
      p_carer_id: user.id,
      p_request_id: params.requestId,
      p_accept: params.accept,
      p_response_message: params.responseMessage ? sanitizeInput(params.responseMessage) : null,
    } as any);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to respond to request',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to respond to request',
        error,
      ),
    };
  }
};

// Get pending placement requests for household
export const getHouseholdPendingRequests = async (): Promise<{
  data: PlacementRequest[] | null;
  error: SupabaseError | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    // Get user's household
    const { data: profile } = (await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single()) as { data: { household_id: string | null } | null; error: any };

    if (!profile?.household_id) {
      return { data: [], error: null }; // No household, no requests
    }

    const { data, error } = await supabase.rpc('get_household_pending_requests', {
      p_household_id: profile.household_id,
    } as any);

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to fetch placement requests',
          error,
        ),
      };
    }

    return { data: data as PlacementRequest[], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to fetch placement requests',
        error,
      ),
    };
  }
};

// Update household availability (foster carer)
export const updateHouseholdAvailability = async (params: {
  availabilityStatus: AvailabilityStatus;
  awayFrom?: string;
  awayUntil?: string;
  notes?: string;
}): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { error } = await supabase.rpc('update_household_availability', {
      p_carer_id: user.id,
      p_availability_status: params.availabilityStatus,
      p_away_from: params.awayFrom || null,
      p_away_until: params.awayUntil || null,
      p_notes: params.notes ? sanitizeInput(params.notes) : null,
    } as any);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to update availability',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to update availability',
        error,
      ),
    };
  }
};

// Update household capacity (primary carer only)
export const updateHouseholdCapacity = async (params: {
  totalBedrooms: number;
  allowsHouseSharing?: boolean;
}): Promise<{ success: boolean; error: SupabaseError | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    const { error } = await supabase.rpc('update_household_capacity', {
      p_carer_id: user.id,
      p_total_bedrooms: params.totalBedrooms,
      p_allows_house_sharing: params.allowsHouseSharing ?? true,
    } as any);

    if (error) {
      return {
        success: false,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          error.message || 'Failed to update capacity',
          error,
        ),
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return {
      success: false,
      error: new SupabaseError(SupabaseErrorCode.UNKNOWN_ERROR, 'Failed to update capacity', error),
    };
  }
};

// Get household capacity and availability info
export const getHouseholdCapacity = async (): Promise<{
  data: HouseholdCapacity | null;
  error: SupabaseError | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    // Get user's household
    const { data: profile } = (await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single()) as { data: { household_id: string | null } | null; error: any };

    if (!profile?.household_id) {
      return { data: null, error: null };
    }

    // Get household with capacity info
    const { data: household, error } = (await supabase
      .from('households' as any)
      .select(
        'total_bedrooms, availability_status, allows_house_sharing, away_from, away_until, availability_notes',
      )
      .eq('id', profile.household_id)
      .single()) as { data: any; error: any };

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to fetch household capacity',
          error,
        ),
      };
    }

    // Calculate available beds
    const { data: availableBeds } = await supabase.rpc('get_household_available_beds', {
      p_household_id: profile.household_id,
    } as any);

    return {
      data: {
        total_bedrooms: household.total_bedrooms,
        available_beds: availableBeds || 0,
        availability_status: household.availability_status,
        allows_house_sharing: household.allows_house_sharing,
        away_from: household.away_from,
        away_until: household.away_until,
        availability_notes: household.availability_notes,
      },
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to fetch household capacity',
        error,
      ),
    };
  }
};

// Get pending cases (unassigned) for social worker
export const getPendingCases = async (): Promise<{
  data: Array<{
    id: string;
    case_number: string;
    placement_type: PlacementType;
    child_can_share: boolean;
    child_age_range: string | null;
    child_gender: string | null;
    created_at: string;
    expected_end_date: string | null;
    pending_requests_count: number;
  }> | null;
  error: SupabaseError | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        data: null,
        error: new SupabaseError(SupabaseErrorCode.UNAUTHORIZED, 'Not authenticated'),
      };
    }

    // Get pending cases for this social worker
    const { data: cases, error } = await supabase
      .from('cases')
      .select(
        `
        id,
        case_number,
        placement_type,
        child_can_share,
        child_age_range,
        child_gender,
        created_at,
        expected_end_date
      `,
      )
      .eq('social_worker_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: null,
        error: new SupabaseError(
          SupabaseErrorCode.DATABASE_ERROR,
          'Failed to fetch pending cases',
          error,
        ),
      };
    }

    // Get pending request counts for each case
    const casesWithCounts = await Promise.all(
      (cases || []).map(async (c: any) => {
        const { count } = await supabase
          .from('placement_requests' as any)
          .select('*', { count: 'exact', head: true })
          .eq('case_id', c.id)
          .eq('status', 'pending');

        return {
          ...c,
          pending_requests_count: count || 0,
        };
      }),
    );

    return { data: casesWithCounts, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: new SupabaseError(
        SupabaseErrorCode.UNKNOWN_ERROR,
        'Failed to fetch pending cases',
        error,
      ),
    };
  }
};

// Subscribe to placement requests for real-time updates
export const subscribeToPlacementRequests = (
  householdId: string,
  onRequest: (request: any) => void,
) => {
  const subscription = supabase
    .channel(`placement_requests:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'placement_requests',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        onRequest(payload.new);
      },
    )
    .subscribe();

  return subscription;
};
