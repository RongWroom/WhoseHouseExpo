-- ============================================
-- Typing Indicators Support
-- ============================================

-- Create a simple table for tracking typing status
-- This is ephemeral data, so we'll use it sparingly
CREATE TABLE typing_indicators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, case_id)
);

-- Index for fast lookups
CREATE INDEX idx_typing_indicators_case ON typing_indicators(case_id);
CREATE INDEX idx_typing_indicators_updated ON typing_indicators(updated_at);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own typing status"
  ON typing_indicators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own typing status"
  ON typing_indicators FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view typing status for their cases"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = typing_indicators.case_id
      AND (c.social_worker_id = auth.uid() OR c.foster_carer_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own typing status"
  ON typing_indicators FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION clean_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to set/update typing status
CREATE OR REPLACE FUNCTION set_typing_status(
  p_case_id UUID,
  p_is_typing BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
  INSERT INTO typing_indicators (user_id, case_id, is_typing, updated_at)
  VALUES (auth.uid(), p_case_id, p_is_typing, NOW())
  ON CONFLICT (user_id, case_id)
  DO UPDATE SET 
    is_typing = EXCLUDED.is_typing,
    updated_at = NOW();
    
  -- Clean up old indicators
  PERFORM clean_old_typing_indicators();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
