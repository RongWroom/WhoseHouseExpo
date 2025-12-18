-- Note: message_status enum already exists from 001_initial_schema.sql
-- CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- Drop existing messages table if it exists (development only)
DROP TABLE IF EXISTS messages CASCADE;

-- Create messages table with encryption and privacy
CREATE TABLE messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    case_id uuid REFERENCES cases(id) ON DELETE CASCADE,

    -- Encrypted content
    content text NOT NULL,

    -- Message metadata
    status message_status DEFAULT 'sent',
    is_urgent boolean DEFAULT false,
    delivered_at timestamptz,
    read_at timestamptz,

    -- Optional metadata for attachments, system messages, etc
    metadata jsonb DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Indexes for performance
    CONSTRAINT messages_case_required CHECK (case_id IS NOT NULL)
);

-- Create indexes for query performance
CREATE INDEX idx_messages_case_id ON messages(case_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_urgent ON messages(is_urgent) WHERE is_urgent = true;

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Function to validate message paths (enforces communication rules)
CREATE OR REPLACE FUNCTION validate_message_path()
RETURNS TRIGGER AS $$
DECLARE
    sender_role user_role;
    recipient_role user_role;
    sender_case_access boolean;
    recipient_case_access boolean;
BEGIN
    -- Get sender's role
    SELECT role INTO sender_role
    FROM profiles
    WHERE id = NEW.sender_id;

    -- Get recipient's role
    SELECT role INTO recipient_role
    FROM profiles
    WHERE id = NEW.recipient_id;

    -- Check if sender has access to the case
    SELECT EXISTS (
        SELECT 1 FROM cases
        WHERE id = NEW.case_id
        AND (social_worker_id = NEW.sender_id OR foster_carer_id = NEW.sender_id)
    ) INTO sender_case_access;

    -- Check if recipient has access to the case
    SELECT EXISTS (
        SELECT 1 FROM cases
        WHERE id = NEW.case_id
        AND (social_worker_id = NEW.recipient_id OR foster_carer_id = NEW.recipient_id)
    ) INTO recipient_case_access;

    -- Validate sender has case access
    IF NOT sender_case_access AND sender_role IS NOT NULL THEN
        RAISE EXCEPTION 'Sender does not have access to this case';
    END IF;

    -- Validate recipient has case access
    IF NOT recipient_case_access AND recipient_role IS NOT NULL THEN
        RAISE EXCEPTION 'Recipient does not have access to this case';
    END IF;

    -- Enforce communication path rules
    -- Block: Child to Foster Carer
    IF sender_role IS NULL AND recipient_role = 'foster_carer' THEN
        RAISE EXCEPTION 'Children cannot message foster carers directly';
    END IF;

    -- Block: Foster Carer to Child
    IF sender_role = 'foster_carer' AND recipient_role IS NULL THEN
        RAISE EXCEPTION 'Foster carers cannot message children directly';
    END IF;

    -- Block: Foster Carer to Foster Carer
    IF sender_role = 'foster_carer' AND recipient_role = 'foster_carer' THEN
        RAISE EXCEPTION 'Foster carers cannot message other foster carers';
    END IF;

    -- All other paths are allowed:
    -- - Social Worker <-> Anyone
    -- - Child -> Social Worker
    -- - Foster Carer -> Social Worker

    -- Log to audit table
    INSERT INTO audit_logs (
        action_type,
        user_id,
        table_name,
        record_id,
        metadata
    ) VALUES (
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
            'recipient_role', recipient_role::text
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate message paths
CREATE TRIGGER validate_message_path_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION validate_message_path();

-- Function to update message status
CREATE OR REPLACE FUNCTION update_message_status(
    p_message_id uuid,
    p_new_status message_status
)
RETURNS void AS $$
DECLARE
    v_recipient_id uuid;
    v_recipient_role user_role;
BEGIN
    -- Get message recipient info
    SELECT m.recipient_id, p.role
    INTO v_recipient_id, v_recipient_role
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.recipient_id
    WHERE m.id = p_message_id;

    -- Only update if the current user is the recipient
    IF v_recipient_id != auth.uid() AND v_recipient_role IS NOT NULL THEN
        RAISE EXCEPTION 'Only the recipient can update message status';
    END IF;

    -- Update the message status
    UPDATE messages
    SET
        status = p_new_status,
        delivered_at = CASE
            WHEN p_new_status = 'delivered' AND delivered_at IS NULL
            THEN now()
            ELSE delivered_at
        END,
        read_at = CASE
            WHEN p_new_status = 'read' AND read_at IS NULL
            THEN now()
            ELSE read_at
        END,
        updated_at = now()
    WHERE id = p_message_id;

    -- Log status update (but not for child recipients for privacy)
    IF v_recipient_role IS NOT NULL THEN
        INSERT INTO audit_logs (
            action_type,
            user_id,
            table_name,
            record_id,
            metadata
        ) VALUES (
            'message_status_updated',
            auth.uid(),
            'messages',
            p_message_id,
            jsonb_build_object('new_status', p_new_status)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Policy: Users can see messages where they are sender or recipient
CREATE POLICY "Users see own messages"
    ON messages FOR SELECT
    USING (
        auth.uid() IN (sender_id, recipient_id)
        OR
        -- Social workers can see all messages in their cases
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = messages.case_id
            AND c.social_worker_id = auth.uid()
        )
    );

-- Policy: Users can send messages if path is valid (validation in trigger)
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        OR
        -- Allow anonymous sends for child tokens
        sender_id IS NULL
    );

-- Policy: Recipients can update message status
CREATE POLICY "Recipients update status"
    ON messages FOR UPDATE
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- Function to get child display name (initials only)
CREATE OR REPLACE FUNCTION get_child_display_name(p_case_id uuid)
RETURNS text AS $$
DECLARE
    v_full_name text;
    v_initials text;
BEGIN
    -- Get the child's name from the case
    SELECT child_name INTO v_full_name
    FROM cases
    WHERE id = p_case_id;

    IF v_full_name IS NULL THEN
        RETURN 'Child';
    END IF;

    -- Extract initials (first letter of each word)
    SELECT string_agg(UPPER(LEFT(word, 1)), '.') INTO v_initials
    FROM unnest(string_to_array(v_full_name, ' ')) AS word;

    RETURN v_initials;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_message_path() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_message_status(uuid, message_status) TO authenticated;
GRANT EXECUTE ON FUNCTION get_child_display_name(uuid) TO authenticated, anon;

-- Create updated_at trigger
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
