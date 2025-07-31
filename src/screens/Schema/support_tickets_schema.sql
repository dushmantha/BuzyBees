-- ===============================================
-- SUPPORT TICKETS SCHEMA FOR BUZYBEES
-- ===============================================
-- This script creates the support ticket system tables

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Ticket Information
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('booking', 'payment', 'technical', 'account', 'service_quality', 'other')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  
  -- User Information (stored for quick access)
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_phone VARCHAR(20),
  user_type VARCHAR(20) CHECK (user_type IN ('consumer', 'provider')),
  
  -- Assignment and Resolution
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket messages table for conversation thread
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Message Content
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false, -- For internal staff notes
  
  -- Attachments (stored as JSON array of URLs)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket attachments table
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  
  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket tags table for categorization
CREATE TABLE IF NOT EXISTS support_ticket_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  tag_name VARCHAR(50) NOT NULL,
  
  -- Ensure unique tags per ticket
  UNIQUE(ticket_id, tag_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON support_ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON support_ticket_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON support_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message_id ON support_ticket_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket_id ON support_ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag_name ON support_ticket_tags(tag_name);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR AS $$
DECLARE
  ticket_num VARCHAR(50);
  current_year INTEGER;
  ticket_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get count of tickets this year
  SELECT COUNT(*) + 1 INTO ticket_count
  FROM support_tickets
  WHERE EXTRACT(YEAR FROM created_at) = current_year;
  
  -- Format: TICK-YYYY-00001
  ticket_num := FORMAT('TICK-%s-%s', current_year, LPAD(ticket_count::TEXT, 5, '0'));
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can create their own tickets" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own open tickets" ON support_tickets
  FOR UPDATE USING (user_id = auth.uid() AND status IN ('open', 'pending'));

-- RLS Policies for support_ticket_messages
CREATE POLICY "Users can view messages for their tickets" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_ticket_messages.ticket_id 
      AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can add messages to their tickets" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_ticket_messages.ticket_id 
      AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid())
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;
GRANT SELECT, INSERT ON support_ticket_messages TO authenticated;
GRANT SELECT, INSERT ON support_ticket_attachments TO authenticated;
GRANT SELECT, INSERT, DELETE ON support_ticket_tags TO authenticated;

-- Create functions for ticket operations
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_subject VARCHAR(255),
  p_description TEXT,
  p_category VARCHAR(50),
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_user_name VARCHAR(255) DEFAULT NULL,
  p_user_email VARCHAR(255) DEFAULT NULL,
  p_user_phone VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_ticket_id UUID;
  current_user_id UUID;
  current_user_type VARCHAR(20);
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user type
  SELECT account_type INTO current_user_type
  FROM users
  WHERE id = current_user_id;
  
  -- Create ticket
  INSERT INTO support_tickets (
    user_id,
    subject,
    description,
    category,
    priority,
    user_name,
    user_email,
    user_phone,
    user_type
  ) VALUES (
    current_user_id,
    p_subject,
    p_description,
    p_category,
    p_priority,
    p_user_name,
    p_user_email,
    p_user_phone,
    current_user_type
  ) RETURNING id INTO new_ticket_id;
  
  -- Add initial message
  INSERT INTO support_ticket_messages (
    ticket_id,
    sender_id,
    message
  ) VALUES (
    new_ticket_id,
    current_user_id,
    p_description
  );
  
  RETURN new_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add message to ticket
CREATE OR REPLACE FUNCTION add_ticket_message(
  p_ticket_id UUID,
  p_message TEXT,
  p_is_internal BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  new_message_id UUID;
  ticket_status VARCHAR(20);
BEGIN
  -- Check if user has access to this ticket
  SELECT status INTO ticket_status
  FROM support_tickets
  WHERE id = p_ticket_id
  AND (user_id = auth.uid() OR assigned_to = auth.uid());
  
  IF ticket_status IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or access denied';
  END IF;
  
  IF ticket_status = 'closed' THEN
    RAISE EXCEPTION 'Cannot add messages to closed tickets';
  END IF;
  
  -- Add message
  INSERT INTO support_ticket_messages (
    ticket_id,
    sender_id,
    message,
    is_internal_note
  ) VALUES (
    p_ticket_id,
    auth.uid(),
    p_message,
    p_is_internal
  ) RETURNING id INTO new_message_id;
  
  -- Update ticket updated_at
  UPDATE support_tickets
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = p_ticket_id;
  
  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_support_ticket(VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION add_ticket_message(UUID, TEXT, BOOLEAN) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎫 SUPPORT TICKET SYSTEM CREATED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✅ support_tickets - Main ticket records';
    RAISE NOTICE '  ✅ support_ticket_messages - Conversation threads';
    RAISE NOTICE '  ✅ support_ticket_attachments - File attachments';
    RAISE NOTICE '  ✅ support_ticket_tags - Ticket categorization';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  🎯 Auto-generated ticket numbers (TICK-YYYY-00001)';
    RAISE NOTICE '  💬 Message threading with internal notes';
    RAISE NOTICE '  📎 File attachment support';
    RAISE NOTICE '  🏷️ Tag-based categorization';
    RAISE NOTICE '  🔒 Row Level Security enabled';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  ✅ create_support_ticket() - Create new ticket';
    RAISE NOTICE '  ✅ add_ticket_message() - Add message to ticket';
    RAISE NOTICE '';
END $$;