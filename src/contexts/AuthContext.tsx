import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  getUserPermissions,
  signIn,
  signOut,
  signUp as supabaseSignUp,
} from '../lib/supabase';
import { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  role: UserRole | null;
  permissions: any;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'social_worker' | 'foster_carer',
    organizationId?: string,
    householdName?: string,
  ) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      // No session - user is not logged in
      setIsLoading(false);
      return;
    }

    try {
      // Use JWT metadata for immediate profile load
      const jwtClaims = currentSession.user.app_metadata || {};
      const userMetadata = currentSession.user.user_metadata || {};

      // Extract role from metadata
      const role = jwtClaims.role || userMetadata.role || 'social_worker';

      // Create profile object from JWT/session metadata for instant rendering
      const profileData: Profile = {
        id: currentSession.user.id,
        role: role as 'social_worker' | 'foster_carer' | 'admin',
        organization_id: jwtClaims.organization_id || userMetadata.organization_id || null,
        full_name: currentSession.user.user_metadata?.full_name || '',
        email: currentSession.user.email || '',
        avatar_url: currentSession.user.user_metadata?.avatar_url || null,
        phone_number: currentSession.user.user_metadata?.phone_number || null,
        is_active: true,
        last_login: new Date().toISOString(),
        created_at: currentSession.user.created_at,
        updated_at: currentSession.user.updated_at || new Date().toISOString(),
        metadata: (currentSession.user.user_metadata || {}) as Profile['metadata'],
        household_id: userMetadata.household_id || null,
        is_primary_carer: userMetadata.is_primary_carer || false,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        preferred_contact: 'app',
      };

      setProfile(profileData);
      console.log('✅ Profile loaded from session metadata:', profileData);

      // Refresh profile from Supabase to capture admin-led updates (e.g., name, phone)
      const { data: dbProfile, error: dbProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle<Profile>();

      if (dbProfile) {
        let mergedProfile: Profile = {
          ...profileData,
          ...dbProfile,
          metadata: (dbProfile.metadata as Profile['metadata']) ?? profileData.metadata,
          last_login: profileData.last_login,
        };

        // Check if foster carer needs household created (deferred from sign-up due to email confirmation)
        if (
          dbProfile.role === 'foster_carer' &&
          !dbProfile.household_id &&
          userMetadata.household_name
        ) {
          console.log(
            '🏠 Creating deferred household for foster carer:',
            userMetadata.household_name,
          );
          try {
            const { data: householdId, error: householdError } = await supabase.rpc(
              'create_household_for_carer',
              {
                p_user_id: currentSession.user.id,
                p_household_name: userMetadata.household_name,
              } as any,
            );
            if (householdError) {
              console.error('⚠️ Failed to create household:', householdError.message);
            } else {
              console.log('✅ Household created successfully:', householdId);
              // Refresh profile to get updated household_id
              const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .maybeSingle<Profile>();
              if (updatedProfile) {
                mergedProfile = {
                  ...mergedProfile,
                  ...updatedProfile,
                  metadata:
                    (updatedProfile.metadata as Profile['metadata']) ?? mergedProfile.metadata,
                };
              }
            }
          } catch (err) {
            console.error('⚠️ Household creation error:', err);
          }
        }

        setProfile(mergedProfile);
        console.log('✅ Profile refreshed from Supabase:', mergedProfile);
      } else if (dbProfileError) {
        console.warn('⚠️ Failed to refresh profile from Supabase:', dbProfileError);
      }

      // Get user permissions (RLS is now fixed)
      const { permissions: userPermissions, error: permError } = await getUserPermissions();
      if (!permError && userPermissions) {
        setPermissions(userPermissions);
        console.log('✅ Permissions loaded:', userPermissions);
      } else if (permError) {
        console.warn('⚠️ Failed to load permissions:', permError);
      }

      setUser(currentSession.user);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      fetchUserData(initialSession);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setSession(authSession);
      fetchUserData(authSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!session?.user) return;
    await fetchUserData(session);
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await signIn(email, password);
    if (!result.error && result.data?.user) {
      await fetchUserData(result.data.session);
    }
    setIsLoading(false);
    return { error: result.error };
  };

  const handleSignUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'social_worker' | 'foster_carer',
    organizationId?: string,
    householdName?: string,
  ) => {
    setIsLoading(true);
    const result = await supabaseSignUp(
      email,
      password,
      fullName,
      role,
      organizationId,
      householdName,
    );
    setIsLoading(false);
    return { error: result.error };
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    const result = await signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setPermissions(null);
    setIsLoading(false);
    return result;
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    role: profile?.role || null,
    permissions,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
