/*
  # Fix admin user authentication

  1. Changes
    - Drop existing admin user to avoid conflicts
    - Create admin user with proper password hashing
    - Set correct metadata and settings

  2. Security
    - Use proper Supabase password hashing
    - Set confirmed email status
    - Configure proper user metadata
*/

-- First remove any existing admin user to avoid conflicts
DELETE FROM auth.users WHERE email = 'admin@example.com';

-- Create admin user with proper password hashing
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  instance_id
) VALUES (
  'admin@example.com',
  -- Use proper Supabase password hashing
  crypt('admin123', gen_salt('bf', 10)),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin"}',
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000'
);