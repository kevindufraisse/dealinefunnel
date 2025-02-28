/*
  # Create visitors and campaigns tables

  1. New Tables
    - `campaigns`
      - `id` (uuid, primary key)
      - `title` (text)
      - `type` (text) - 'evergreen' or 'fixed'
      - `duration_minutes` (integer) - for evergreen campaigns
      - `fixed_deadline` (timestamptz) - for fixed campaigns
      - `target_urls` (text[]) - array of target URLs or ['*'] for all pages
      - `expiration_action` (jsonb) - action config on expiry
      - `styles` (jsonb) - visual customization
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `visitors`
      - `id` (uuid, primary key)
      - `visitor_id` (text, unique)
      - `ip_address` (text)
      - `fingerprint` (text)
      - `deadline` (timestamptz)
      - `campaign_id` (uuid, references campaigns)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage campaigns
    - Add policies for the service role to manage visitors
*/

-- Create campaigns table
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('evergreen', 'fixed')),
  duration_minutes integer,
  fixed_deadline timestamptz,
  target_urls text[] NOT NULL DEFAULT ARRAY['*'],
  expiration_action jsonb NOT NULL DEFAULT '{"type": "message", "content": "Offer expired"}',
  styles jsonb NOT NULL DEFAULT '{"background": "#f3f4f6", "text": "#111827", "button": "#3b82f6"}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_duration CHECK (
    (type = 'evergreen' AND duration_minutes IS NOT NULL AND fixed_deadline IS NULL) OR
    (type = 'fixed' AND fixed_deadline IS NOT NULL AND duration_minutes IS NULL)
  )
);

-- Create visitors table
CREATE TABLE visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text UNIQUE NOT NULL,
  ip_address text NOT NULL,
  fingerprint text,
  deadline timestamptz NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Allow authenticated users to read campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Visitors policies (for service role)
CREATE POLICY "Allow service role to manage visitors"
  ON visitors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();