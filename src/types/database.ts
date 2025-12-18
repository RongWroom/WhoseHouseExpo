// Database types generated from Supabase schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          full_name: string;
          role: 'social_worker' | 'foster_carer' | 'admin';
          avatar_url: string | null;
          phone_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login: string | null;
          metadata: Json;
          household_id: string | null;
          is_primary_carer: boolean;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relationship: string | null;
          preferred_contact: 'email' | 'phone' | 'app' | null;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email: string;
          full_name: string;
          role: 'social_worker' | 'foster_carer' | 'admin';
          avatar_url?: string | null;
          phone_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          metadata?: Json;
          household_id?: string | null;
          is_primary_carer?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string;
          full_name?: string;
          role?: 'social_worker' | 'foster_carer' | 'admin';
          avatar_url?: string | null;
          phone_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          metadata?: Json;
          household_id?: string | null;
          is_primary_carer?: boolean;
        };
      };
      households: {
        Row: {
          id: string;
          name: string;
          organization_id: string | null;
          created_at: string;
          updated_at: string;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          postcode: string | null;
          country: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          postcode?: string | null;
          country?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          postcode?: string | null;
          country?: string | null;
        };
      };
      household_invitations: {
        Row: {
          id: string;
          household_id: string;
          invited_by: string | null;
          email: string;
          status: 'pending' | 'accepted' | 'declined' | 'expired';
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          invited_by?: string | null;
          email: string;
          status?: 'pending' | 'accepted' | 'declined' | 'expired';
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          invited_by?: string | null;
          email?: string;
          status?: 'pending' | 'accepted' | 'declined' | 'expired';
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
        };
      };
      cases: {
        Row: {
          id: string;
          case_number: string;
          social_worker_id: string | null;
          foster_carer_id: string | null;
          household_id: string | null;
          status: 'active' | 'pending' | 'closed';
          created_at: string;
          updated_at: string;
          closed_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          case_number: string;
          social_worker_id?: string | null;
          foster_carer_id?: string | null;
          household_id?: string | null;
          status?: 'active' | 'pending' | 'closed';
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          case_number?: string;
          social_worker_id?: string | null;
          foster_carer_id?: string | null;
          household_id?: string | null;
          status?: 'active' | 'pending' | 'closed';
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
          metadata?: Json;
        };
      };
      child_access_tokens: {
        Row: {
          id: string;
          case_id: string;
          token_hash: string;
          status: 'active' | 'used' | 'expired' | 'revoked';
          created_by: string | null;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          device_info: Json;
        };
        Insert: {
          id?: string;
          case_id: string;
          token_hash: string;
          status?: 'active' | 'used' | 'expired' | 'revoked';
          created_by?: string | null;
          created_at?: string;
          expires_at: string;
          used_at?: string | null;
          device_info?: Json;
        };
        Update: {
          id?: string;
          case_id?: string;
          token_hash?: string;
          status?: 'active' | 'used' | 'expired' | 'revoked';
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
          used_at?: string | null;
          device_info?: Json;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string | null;
          recipient_id: string | null;
          case_id: string;
          content: string;
          status: 'sent' | 'delivered' | 'read';
          is_urgent: boolean;
          delivered_at: string | null;
          read_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id?: string | null;
          recipient_id?: string | null;
          case_id: string;
          content: string;
          status?: 'sent' | 'delivered' | 'read';
          is_urgent?: boolean;
          delivered_at?: string | null;
          read_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string | null;
          recipient_id?: string | null;
          case_id?: string;
          content?: string;
          status?: 'sent' | 'delivered' | 'read';
          is_urgent?: boolean;
          delivered_at?: string | null;
          read_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      case_media: {
        Row: {
          id: string;
          case_id: string;
          uploaded_by: string | null;
          file_url: string;
          file_type: string;
          description: string | null;
          is_visible_to_child: boolean;
          uploaded_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          case_id: string;
          uploaded_by?: string | null;
          file_url: string;
          file_type: string;
          description?: string | null;
          is_visible_to_child?: boolean;
          uploaded_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          case_id?: string;
          uploaded_by?: string | null;
          file_url?: string;
          file_type?: string;
          description?: string | null;
          is_visible_to_child?: boolean;
          uploaded_at?: string;
          metadata?: Json;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          action: AuditAction;
          user_id: string | null;
          target_type: string | null;
          target_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: AuditAction;
          user_id?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          // Audit logs are immutable - no updates allowed
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_child_access_token: {
        Args: {
          p_case_id: string;
          p_expires_in_hours?: number;
        };
        Returns: Json;
      };
      use_child_access_token: {
        Args: {
          p_token: string;
          p_device_info?: Json;
        };
        Returns: Json;
      };
      send_child_message: {
        Args: {
          p_token: string;
          p_content: string;
        };
        Returns: Json;
      };
      update_last_login: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      handle_logout: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      get_user_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      assign_foster_carer: {
        Args: {
          p_case_id: string;
          p_foster_carer_id: string;
        };
        Returns: Json;
      };
      log_audit_action: {
        Args: {
          p_action: AuditAction;
          p_user_id?: string;
          p_target_type?: string;
          p_target_id?: string;
          p_details?: Json;
          p_ip_address?: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
      update_message_status: {
        Args: {
          p_message_id: string;
          p_new_status: 'sent' | 'delivered' | 'read';
        };
        Returns: void;
      };
      get_child_display_name: {
        Args: {
          p_case_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: 'social_worker' | 'foster_carer' | 'admin';
      message_status: 'sent' | 'delivered' | 'read';
      case_status: 'active' | 'pending' | 'closed';
      token_status: 'active' | 'used' | 'expired' | 'revoked';
      audit_action: AuditAction;
    };
  };
};

export type UserRole = Database['public']['Enums']['user_role'];
export type MessageStatus = Database['public']['Enums']['message_status'];
export type CaseStatus = Database['public']['Enums']['case_status'];
export type TokenStatus = Database['public']['Enums']['token_status'];

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'case_created'
  | 'case_updated'
  | 'case_accessed'
  | 'message_sent'
  | 'message_read'
  | 'token_generated'
  | 'token_used'
  | 'assignment_created'
  | 'assignment_removed'
  | 'profile_updated'
  | 'unauthorized_access_attempt'
  | 'household_created'
  | 'household_invitation_sent'
  | 'household_invitation_accepted'
  | 'household_member_left'
  | 'household_primary_transferred';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Case = Database['public']['Tables']['cases']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type ChildAccessToken = Database['public']['Tables']['child_access_tokens']['Row'];
export type CaseMedia = Database['public']['Tables']['case_media']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];
export type HouseholdInvitation = Database['public']['Tables']['household_invitations']['Row'];

// Helper types for forms and mutations
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type CaseInsert = Database['public']['Tables']['cases']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type CaseUpdate = Database['public']['Tables']['cases']['Update'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
