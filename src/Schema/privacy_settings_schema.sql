-- ===============================================
-- PRIVACY SETTINGS SCHEMA UPDATES
-- ===============================================
-- This script adds privacy settings fields to the user_preferences table

-- First check if user_preferences table exists, if not create it
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  
  -- Privacy Settings
  profile_visibility VARCHAR(50) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'contacts_only')),
  location_sharing BOOLEAN DEFAULT false,
  show_online_status BOOLEAN DEFAULT true,
  allow_direct_messages BOOLEAN DEFAULT true,
  allow_data_analytics BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  two_factor_auth BOOLEAN DEFAULT false,
  
  -- Visibility Settings
  visibility_phone BOOLEAN DEFAULT true,
  visibility_email BOOLEAN DEFAULT false,
  visibility_address BOOLEAN DEFAULT false,
  visibility_work_history BOOLEAN DEFAULT true,
  
  -- UI Preferences
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- Add any missing columns to existing table
DO $$ 
BEGIN
  -- Privacy columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'profile_visibility') THEN
    ALTER TABLE user_preferences ADD COLUMN profile_visibility VARCHAR(50) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'contacts_only'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'show_online_status') THEN
    ALTER TABLE user_preferences ADD COLUMN show_online_status BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'allow_direct_messages') THEN
    ALTER TABLE user_preferences ADD COLUMN allow_direct_messages BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'allow_data_analytics') THEN
    ALTER TABLE user_preferences ADD COLUMN allow_data_analytics BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'two_factor_auth') THEN
    ALTER TABLE user_preferences ADD COLUMN two_factor_auth BOOLEAN DEFAULT false;
  END IF;
  
  -- Visibility columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'visibility_phone') THEN
    ALTER TABLE user_preferences ADD COLUMN visibility_phone BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'visibility_email') THEN
    ALTER TABLE user_preferences ADD COLUMN visibility_email BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'visibility_address') THEN
    ALTER TABLE user_preferences ADD COLUMN visibility_address BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'visibility_work_history') THEN
    ALTER TABLE user_preferences ADD COLUMN visibility_work_history BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

-- RLS Policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 PRIVACY SETTINGS SCHEMA CREATED/UPDATED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Table created/updated:';
    RAISE NOTICE '  ✅ user_preferences - Stores all user preferences including privacy settings';
    RAISE NOTICE '';
    RAISE NOTICE 'Privacy fields added:';
    RAISE NOTICE '  ✅ profile_visibility - Controls who can see the profile';
    RAISE NOTICE '  ✅ location_sharing - Controls location data sharing';
    RAISE NOTICE '  ✅ show_online_status - Controls online status visibility';
    RAISE NOTICE '  ✅ allow_direct_messages - Controls who can send direct messages';
    RAISE NOTICE '  ✅ allow_data_analytics - Controls data collection for analytics';
    RAISE NOTICE '  ✅ two_factor_auth - Enables/disables 2FA';
    RAISE NOTICE '  ✅ visibility_* - Controls individual field visibility';
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  🔒 Row Level Security enabled';
    RAISE NOTICE '  🔒 Users can only access their own preferences';
    RAISE NOTICE '';
END $$;