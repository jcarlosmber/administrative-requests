-- Create custom types for status and priority
CREATE TYPE request_status AS ENUM ('pendiente', 'en_progreso', 'resuelto', 'rechazado');
CREATE TYPE request_priority AS ENUM ('baja', 'media', 'alta');

-- Create the administrative_requests table
CREATE TABLE IF NOT EXISTS administrative_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status request_status DEFAULT 'pendiente',
    priority request_priority DEFAULT 'media',
    admin_notes TEXT,
    attachments TEXT[] -- Array of URLs for images/documents
);

-- Enable Row Level Security
ALTER TABLE administrative_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view their own requests
CREATE POLICY "Users can view their own requests" 
ON administrative_requests FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can create their own requests
CREATE POLICY "Users can create their own requests" 
ON administrative_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own requests (only title/description if still pending)
CREATE POLICY "Users can update their own pending requests" 
ON administrative_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'pendiente')
WITH CHECK (auth.uid() = user_id AND status = 'pendiente');

-- Note: Admin policies would typically check a 'role' column in a profiles table.
-- Assuming there is a profiles table or a way to check if the user is an admin.
-- For now, I'll add a placeholder or assume a specific check.
-- If we use Supabase roles or a custom claim:
-- CREATE POLICY "Admins can manage all requests" 
-- ON administrative_requests FOR ALL 
-- TO authenticated
-- USING (auth.jwt() ->> 'role' = 'admin');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_administrative_requests_updated_at
    BEFORE UPDATE ON administrative_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
