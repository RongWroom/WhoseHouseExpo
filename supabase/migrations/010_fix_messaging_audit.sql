-- Fix audit logging for messaging triggers to align with updated audit_logs schema
-- Replaces direct INSERTs using legacy column names with the canonical log_audit_action helper.

-- Update validate_message_path to log via log_audit_action
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
    IF sender_role IS NULL AND recipient_role = 'foster_carer' THEN
        RAISE EXCEPTION 'Children cannot message foster carers directly';
    END IF;

    IF sender_role = 'foster_carer' AND recipient_role IS NULL THEN
        RAISE EXCEPTION 'Foster carers cannot message children directly';
    END IF;

    IF sender_role = 'foster_carer' AND recipient_role = 'foster_carer' THEN
        RAISE EXCEPTION 'Foster carers cannot message other foster carers';
    END IF;

    -- Log to audit table using helper
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
            'recipient_role', recipient_role::text
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update update_message_status to log via log_audit_action
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
            WHEN p_new_status = 'delivered' AND delivered_at IS NULL THEN now()
            ELSE delivered_at
        END,
        read_at = CASE
            WHEN p_new_status = 'read' AND read_at IS NULL THEN now()
            ELSE read_at
        END,
        updated_at = now()
    WHERE id = p_message_id;

    -- Log status update (not for child recipients for privacy)
    IF v_recipient_role IS NOT NULL THEN
        PERFORM log_audit_action(
            'message_status_updated',
            auth.uid(),
            'messages',
            p_message_id,
            jsonb_build_object('new_status', p_new_status)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
