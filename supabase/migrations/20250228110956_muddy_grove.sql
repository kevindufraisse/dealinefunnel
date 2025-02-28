/*
  # Add visitor tracking features

  1. New Tables
    - `visitor_sessions`
      - `id` (uuid, primary key)
      - `visitor_id` (text, unique)
      - `ip_address` (text)
      - `user_agent` (text)
      - `fingerprint` (text)
      - `created_at` (timestamp)
      - `last_seen` (timestamp)

  2. Changes
    - Add `last_seen` column to `visitors` table
    - Add `user_agent` column to `visitors` table

  3. Security
    - Enable RLS on new table
    - Add policies for service role access
*/

-- Create visitor_sessions table
CREATE TABLE visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  fingerprint text,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  FOREIGN KEY (visitor_id) REFERENCES visitors(visitor_id)
);

-- Add new columns to visitors table
ALTER TABLE visitors ADD COLUMN last_seen timestamptz DEFAULT now();
ALTER TABLE visitors ADD COLUMN user_agent text;

-- Enable RLS
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for service role
CREATE POLICY "Allow service role to manage visitor sessions"
  ON visitor_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_visitor_sessions_last_seen
  BEFORE UPDATE ON visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

CREATE TRIGGER update_visitors_last_seen
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();