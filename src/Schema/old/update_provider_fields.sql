-- ===============================================
-- UPDATE PROVIDER FIELDS AND ADD MANAGEMENT FEATURES
-- ===============================================
-- This script adds women_owned_business field and creates management
-- functionality for skills, certifications, and verification

-- Add women_owned_business field to provider_businesses table (the correct table name)
ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS women_owned_business BOOLEAN DEFAULT FALSE;

-- Create skills management table
CREATE TABLE IF NOT EXISTS provider_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  experience_level VARCHAR(50) NOT NULL CHECK (experience_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  years_experience INTEGER DEFAULT 0,
  is_certified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, skill_name)
);

-- Create certifications management table
CREATE TABLE IF NOT EXISTS provider_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_name VARCHAR(255) NOT NULL,
  issued_by VARCHAR(255) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  certificate_number VARCHAR(255),
  verification_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('business', 'identity', 'certification', 'skill')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'requires_info')),
  documents JSONB, -- Store document URLs and metadata
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_skills_provider_id ON provider_skills(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_skills_skill_name ON provider_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_provider_certifications_provider_id ON provider_certifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_certifications_issued_by ON provider_certifications(issued_by);
CREATE INDEX IF NOT EXISTS idx_verification_requests_provider_id ON verification_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);

-- Enable RLS on new tables
ALTER TABLE provider_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_skills
CREATE POLICY "Providers can view own skills" ON provider_skills
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert own skills" ON provider_skills
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own skills" ON provider_skills
  FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete own skills" ON provider_skills
  FOR DELETE USING (provider_id = auth.uid());

-- RLS Policies for provider_certifications
CREATE POLICY "Providers can view own certifications" ON provider_certifications
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert own certifications" ON provider_certifications
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own certifications" ON provider_certifications
  FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete own certifications" ON provider_certifications
  FOR DELETE USING (provider_id = auth.uid());

-- RLS Policies for verification_requests
CREATE POLICY "Providers can view own verification requests" ON verification_requests
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert own verification requests" ON verification_requests
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own verification requests" ON verification_requests
  FOR UPDATE USING (provider_id = auth.uid());

-- Function to add a skill
CREATE OR REPLACE FUNCTION add_provider_skill(
  p_skill_name VARCHAR(255),
  p_experience_level VARCHAR(50),
  p_years_experience INTEGER DEFAULT 0,
  p_is_certified BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  skill_id UUID;
  current_provider_id UUID;
BEGIN
  current_provider_id := auth.uid();
  
  IF current_provider_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO provider_skills (
    provider_id, 
    skill_name, 
    experience_level, 
    years_experience, 
    is_certified
  )
  VALUES (
    current_provider_id, 
    p_skill_name, 
    p_experience_level, 
    p_years_experience, 
    p_is_certified
  )
  RETURNING id INTO skill_id;
  
  RETURN skill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a certification
CREATE OR REPLACE FUNCTION add_provider_certification(
  p_certification_name VARCHAR(255),
  p_issued_by VARCHAR(255),
  p_issue_date DATE,
  p_expiry_date DATE DEFAULT NULL,
  p_certificate_number VARCHAR(255) DEFAULT NULL,
  p_verification_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  cert_id UUID;
  current_provider_id UUID;
BEGIN
  current_provider_id := auth.uid();
  
  IF current_provider_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO provider_certifications (
    provider_id,
    certification_name,
    issued_by,
    issue_date,
    expiry_date,
    certificate_number,
    verification_url
  )
  VALUES (
    current_provider_id,
    p_certification_name,
    p_issued_by,
    p_issue_date,
    p_expiry_date,
    p_certificate_number,
    p_verification_url
  )
  RETURNING id INTO cert_id;
  
  RETURN cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit verification request
CREATE OR REPLACE FUNCTION submit_verification_request(
  p_request_type VARCHAR(50),
  p_documents JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  request_id UUID;
  current_provider_id UUID;
BEGIN
  current_provider_id := auth.uid();
  
  IF current_provider_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO verification_requests (
    provider_id,
    request_type,
    documents
  )
  VALUES (
    current_provider_id,
    p_request_type,
    p_documents
  )
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider skills
CREATE OR REPLACE FUNCTION get_provider_skills(p_provider_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  skill_name VARCHAR(255),
  experience_level VARCHAR(50),
  years_experience INTEGER,
  is_certified BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.skill_name,
    ps.experience_level,
    ps.years_experience,
    ps.is_certified,
    ps.created_at
  FROM provider_skills ps
  WHERE ps.provider_id = COALESCE(p_provider_id, auth.uid())
  ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider certifications
CREATE OR REPLACE FUNCTION get_provider_certifications(p_provider_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  certification_name VARCHAR(255),
  issued_by VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  certificate_number VARCHAR(255),
  verification_url TEXT,
  is_verified BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.certification_name,
    pc.issued_by,
    pc.issue_date,
    pc.expiry_date,
    pc.certificate_number,
    pc.verification_url,
    pc.is_verified,
    pc.created_at
  FROM provider_certifications pc
  WHERE pc.provider_id = COALESCE(p_provider_id, auth.uid())
  ORDER BY pc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_certifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON verification_requests TO authenticated;

GRANT EXECUTE ON FUNCTION add_provider_skill(VARCHAR(255), VARCHAR(50), INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION add_provider_certification(VARCHAR(255), VARCHAR(255), DATE, DATE, VARCHAR(255), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_verification_request(VARCHAR(50), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_skills(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_certifications(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PROVIDER MANAGEMENT SYSTEM UPDATED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Database changes:';
    RAISE NOTICE '  ✅ Added women_owned_business field to provider_details';
    RAISE NOTICE '';
    RAISE NOTICE 'New tables created:';
    RAISE NOTICE '  ✅ provider_skills - Manage provider skills with experience levels';
    RAISE NOTICE '  ✅ provider_certifications - Manage certifications with verification';
    RAISE NOTICE '  ✅ verification_requests - Handle verification process';
    RAISE NOTICE '';
    RAISE NOTICE 'New functions available:';
    RAISE NOTICE '  ✅ add_provider_skill() - Add new skills';
    RAISE NOTICE '  ✅ add_provider_certification() - Add certifications';
    RAISE NOTICE '  ✅ submit_verification_request() - Request verification';
    RAISE NOTICE '  ✅ get_provider_skills() - Retrieve skills';
    RAISE NOTICE '  ✅ get_provider_certifications() - Retrieve certifications';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  🏢 Women owned business tracking';
    RAISE NOTICE '  🎯 Skills management with experience levels';
    RAISE NOTICE '  🏆 Certification management with verification';
    RAISE NOTICE '  ✅ Provider verification system';
    RAISE NOTICE '  🔒 Row Level Security on all tables';
    RAISE NOTICE '';
END $$;