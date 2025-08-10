-- ===============================================
-- CREATE COMMUNICATION LOGS TABLES
-- ===============================================
-- This creates tables to log email and SMS communications
-- Run this in Supabase SQL Editor

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  message_id TEXT, -- From email service provider
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  message_id TEXT, -- From SMS service provider
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_id ON email_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_id ON sms_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
CREATE POLICY "Providers can view their email logs" ON email_logs
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert email logs" ON email_logs
  FOR INSERT WITH CHECK (provider_id = auth.uid());

-- RLS Policies for sms_logs
CREATE POLICY "Providers can view their SMS logs" ON sms_logs
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert SMS logs" ON sms_logs
  FOR INSERT WITH CHECK (provider_id = auth.uid());

-- Grant permissions to service role for Edge Functions
GRANT ALL ON email_logs TO service_role;
GRANT ALL ON sms_logs TO service_role;

SELECT 'Communication logs tables created successfully' as status;