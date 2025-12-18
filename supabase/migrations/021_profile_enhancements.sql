-- ============================================
-- Whose House App - Profile & Household Enhancements
-- ============================================
-- Adds missing fields for foster carer profiles and household addresses

-- ============================================
-- ADD ADDRESS FIELDS TO HOUSEHOLDS
-- ============================================
-- Address is at household level since all carers share the same address

ALTER TABLE households ADD COLUMN address_line1 TEXT;
ALTER TABLE households ADD COLUMN address_line2 TEXT;
ALTER TABLE households ADD COLUMN city TEXT;
ALTER TABLE households ADD COLUMN postcode TEXT;
ALTER TABLE households ADD COLUMN country TEXT DEFAULT 'United Kingdom';

-- ============================================
-- ADD EMERGENCY CONTACT TO PROFILES
-- ============================================
-- Emergency contact is individual per carer

ALTER TABLE profiles ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE profiles ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE profiles ADD COLUMN emergency_contact_relationship TEXT;

-- ============================================
-- ADD PREFERRED CONTACT METHOD
-- ============================================

CREATE TYPE contact_preference AS ENUM ('email', 'phone', 'app');

ALTER TABLE profiles ADD COLUMN preferred_contact contact_preference DEFAULT 'app';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN households.address_line1 IS 'First line of household address';
COMMENT ON COLUMN households.address_line2 IS 'Second line of household address (optional)';
COMMENT ON COLUMN households.city IS 'City/town of household';
COMMENT ON COLUMN households.postcode IS 'Postal code of household';
COMMENT ON COLUMN households.country IS 'Country of household';

COMMENT ON COLUMN profiles.emergency_contact_name IS 'Name of emergency contact person';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Phone number of emergency contact';
COMMENT ON COLUMN profiles.emergency_contact_relationship IS 'Relationship to emergency contact (e.g., spouse, parent)';
COMMENT ON COLUMN profiles.preferred_contact IS 'Preferred method of contact for notifications';
