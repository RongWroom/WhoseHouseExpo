-- Push Notifications Infrastructure
-- Migration: 018_push_notifications.sql
-- Description: Tables and functions for push notification tokens and preferences

-- ============================================
-- PUSH TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one token per user (can have multiple devices in future)
  CONSTRAINT unique_user_token UNIQUE (user_id, token)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT true,
  messages BOOLEAN DEFAULT true,
  urgent_messages BOOLEAN DEFAULT true,
  case_updates BOOLEAN DEFAULT true,
  child_access BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);

-- ============================================
-- NOTIFICATION LOG TABLE (for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS push_tokens_own_access ON push_tokens;
DROP POLICY IF EXISTS notification_prefs_own_access ON notification_preferences;
DROP POLICY IF EXISTS notification_log_own_access ON notification_log;
DROP POLICY IF EXISTS notification_log_system_insert ON notification_log;

-- Users can only manage their own push tokens
CREATE POLICY push_tokens_own_access ON push_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only manage their own notification preferences
CREATE POLICY notification_prefs_own_access ON notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only see their own notification logs
CREATE POLICY notification_log_own_access ON notification_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notification logs (via service role)
CREATE POLICY notification_log_system_insert ON notification_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to register a push token
CREATE OR REPLACE FUNCTION register_push_token(
  p_token TEXT,
  p_platform TEXT,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert the token
  INSERT INTO push_tokens (user_id, token, platform, device_info)
  VALUES (v_user_id, p_token, p_platform, p_device_info)
  ON CONFLICT (user_id, token)
  DO UPDATE SET
    platform = EXCLUDED.platform,
    device_info = EXCLUDED.device_info,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences()
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_prefs notification_preferences;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get or create preferences
  INSERT INTO notification_preferences (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = v_user_id;

  RETURN v_prefs;
END;
$$;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_enabled BOOLEAN DEFAULT NULL,
  p_messages BOOLEAN DEFAULT NULL,
  p_urgent_messages BOOLEAN DEFAULT NULL,
  p_case_updates BOOLEAN DEFAULT NULL,
  p_child_access BOOLEAN DEFAULT NULL,
  p_quiet_hours_enabled BOOLEAN DEFAULT NULL,
  p_quiet_hours_start TIME DEFAULT NULL,
  p_quiet_hours_end TIME DEFAULT NULL
)
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_prefs notification_preferences;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update only provided fields
  UPDATE notification_preferences
  SET
    enabled = COALESCE(p_enabled, enabled),
    messages = COALESCE(p_messages, messages),
    urgent_messages = COALESCE(p_urgent_messages, urgent_messages),
    case_updates = COALESCE(p_case_updates, case_updates),
    child_access = COALESCE(p_child_access, child_access),
    quiet_hours_enabled = COALESCE(p_quiet_hours_enabled, quiet_hours_enabled),
    quiet_hours_start = COALESCE(p_quiet_hours_start, quiet_hours_start),
    quiet_hours_end = COALESCE(p_quiet_hours_end, quiet_hours_end),
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_prefs;

  -- If no row updated, create one
  IF v_prefs IS NULL THEN
    INSERT INTO notification_preferences (
      user_id, enabled, messages, urgent_messages, case_updates,
      child_access, quiet_hours_enabled, quiet_hours_start, quiet_hours_end
    )
    VALUES (
      v_user_id,
      COALESCE(p_enabled, true),
      COALESCE(p_messages, true),
      COALESCE(p_urgent_messages, true),
      COALESCE(p_case_updates, true),
      COALESCE(p_child_access, true),
      COALESCE(p_quiet_hours_enabled, false),
      COALESCE(p_quiet_hours_start, '22:00'::TIME),
      COALESCE(p_quiet_hours_end, '07:00'::TIME)
    )
    RETURNING * INTO v_prefs;
  END IF;

  RETURN v_prefs;
END;
$$;

-- Function to log a notification
CREATE OR REPLACE FUNCTION log_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO notification_log (user_id, notification_type, title, body, data)
  VALUES (p_user_id, p_notification_type, p_title, p_body, p_data)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to get push tokens for a user (for sending notifications)
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (
  token TEXT,
  platform TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pt.token, pt.platform
  FROM push_tokens pt
  WHERE pt.user_id = p_user_id
    AND pt.is_active = true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION register_push_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION log_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_push_tokens TO authenticated;

-- ============================================
-- TRIGGER: Update timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_tokens_updated
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER notification_prefs_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();
