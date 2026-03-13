-- ============================================
-- Harden messaging path validation + draft status support
-- ============================================

-- 1) Add draft support to case status enum
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'draft';

-- 2) Ensure child_token_id exists on messages for child-originated messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'child_token_id'
  ) THEN
    ALTER TABLE public.messages
      ADD COLUMN child_token_id UUID REFERENCES public.child_access_tokens(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_child_token_id ON public.messages(child_token_id);

-- 3) Tighten INSERT policy so authenticated users cannot send anonymous messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users send messages" ON public.messages;

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND child_token_id IS NULL
  );

-- 4) Harden trigger validation to prevent spoofed anonymous sends
CREATE OR REPLACE FUNCTION public.validate_message_path()
RETURNS TRIGGER AS $$
DECLARE
  sender_role user_role;
  recipient_role user_role;
  sender_case_access boolean;
  recipient_case_access boolean;
BEGIN
  -- Child-originated message path (anonymous sender with token)
  IF NEW.sender_id IS NULL THEN
    IF NEW.child_token_id IS NULL THEN
      RAISE EXCEPTION 'Anonymous messages must include child_token_id';
    END IF;

    IF NEW.recipient_id IS NULL THEN
      RAISE EXCEPTION 'Child messages must include a recipient';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM child_access_tokens t
      JOIN cases c ON c.id = t.case_id
      WHERE t.id = NEW.child_token_id
        AND t.case_id = NEW.case_id
        AND c.social_worker_id = NEW.recipient_id
        AND t.status IN ('active', 'used')
        AND t.expires_at > now()
    ) THEN
      RAISE EXCEPTION 'Invalid child message routing';
    END IF;

    PERFORM log_audit_action(
      'message_sent',
      NULL,
      'messages',
      NEW.id,
      jsonb_build_object(
        'sender_id', NEW.sender_id,
        'recipient_id', NEW.recipient_id,
        'case_id', NEW.case_id,
        'is_urgent', NEW.is_urgent,
        'sender_role', NULL,
        'recipient_role', 'social_worker',
        'child_message', true
      )
    );

    RETURN NEW;
  END IF;

  -- Authenticated sender path must not carry child token context
  IF NEW.child_token_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only child-originated messages may include child_token_id';
  END IF;

  SELECT role INTO sender_role
  FROM profiles
  WHERE id = NEW.sender_id;

  SELECT role INTO recipient_role
  FROM profiles
  WHERE id = NEW.recipient_id;

  IF sender_role IS NULL THEN
    RAISE EXCEPTION 'Sender profile is required';
  END IF;

  IF recipient_role IS NULL THEN
    RAISE EXCEPTION 'Recipient profile is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM cases
    WHERE id = NEW.case_id
      AND (social_worker_id = NEW.sender_id OR foster_carer_id = NEW.sender_id)
  ) INTO sender_case_access;

  SELECT EXISTS (
    SELECT 1
    FROM cases
    WHERE id = NEW.case_id
      AND (social_worker_id = NEW.recipient_id OR foster_carer_id = NEW.recipient_id)
  ) INTO recipient_case_access;

  IF NOT sender_case_access THEN
    RAISE EXCEPTION 'Sender does not have access to this case';
  END IF;

  IF NOT recipient_case_access THEN
    RAISE EXCEPTION 'Recipient does not have access to this case';
  END IF;

  -- Block forbidden communication paths
  IF sender_role = 'foster_carer' AND recipient_role = 'foster_carer' THEN
    RAISE EXCEPTION 'Foster carers cannot message other foster carers';
  END IF;

  PERFORM log_audit_action(
    'message_sent',
    auth.uid(),
    'messages',
    NEW.id,
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'case_id', NEW.case_id,
      'is_urgent', NEW.is_urgent,
      'sender_role', sender_role::text,
      'recipient_role', recipient_role::text,
      'child_message', false
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_message_path IS
'Validates message paths for authenticated users and child-token messages; blocks anonymous spoofing and enforces recipient/case constraints.';
