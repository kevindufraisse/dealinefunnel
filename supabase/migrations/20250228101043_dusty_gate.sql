/*
  # Fix RLS policies and add authentication

  1. Changes
    - Update RLS policies to properly handle authenticated users
    - Add user_id column to campaigns table for ownership
    - Add policies for user-specific campaign management

  2. Security
    - Enable RLS on campaigns table
    - Add policies for authenticated users to:
      - Read all campaigns
      - Create new campaigns
      - Update/delete only their own campaigns
*/

-- Add user_id column to campaigns
ALTER TABLE campaigns ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow authenticated users to manage campaigns" ON campaigns;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
ON campaigns FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON campaigns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
ON campaigns FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
ON campaigns FOR DELETE
TO authenticated
USING (auth.uid() = user_id);